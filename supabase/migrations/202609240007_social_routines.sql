create table public.routine_likes (
  routine_version_id uuid not null references public.routine_versions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (routine_version_id, user_id)
);

create table public.routine_questions (
  id uuid primary key default gen_random_uuid(),
  routine_version_id uuid not null references public.routine_versions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 3 and 500),
  answer text check (char_length(answer) between 1 and 1000),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((answer is null and answered_at is null) or (answer is not null and answered_at is not null))
);

create index routine_likes_version_idx on public.routine_likes(routine_version_id);
create index routine_questions_version_idx on public.routine_questions(routine_version_id, created_at desc);

create trigger routine_questions_set_updated_at
before update on public.routine_questions
for each row execute function private.set_updated_at();

alter table public.routine_likes enable row level security;
alter table public.routine_questions enable row level security;

create policy routine_likes_read on public.routine_likes for select
using (private.can_read_routine_version(routine_version_id));

create policy routine_likes_insert on public.routine_likes for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.routine_versions rv
    where rv.id = routine_version_id
      and rv.visibility = 'public'
      and rv.published_at is not null
  )
);

create policy routine_likes_delete on public.routine_likes for delete
using (user_id = auth.uid());

create policy routine_questions_read on public.routine_questions for select
using (private.can_read_routine_version(routine_version_id));

create policy routine_questions_insert on public.routine_questions for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.routine_versions rv
    where rv.id = routine_version_id
      and rv.visibility = 'public'
      and rv.published_at is not null
  )
);

create policy routine_questions_update on public.routine_questions for update
using (
  exists (
    select 1
    from public.routine_versions rv
    join public.routines r on r.id = rv.routine_id
    where rv.id = routine_version_id and r.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.routine_versions rv
    join public.routines r on r.id = rv.routine_id
    where rv.id = routine_version_id and r.owner_id = auth.uid()
  )
);

grant select, insert, delete on public.routine_likes to authenticated;
grant select, insert, update on public.routine_questions to authenticated;

create or replace function public.community_routines()
returns table (
  routine_id uuid,
  routine_version_id uuid,
  title text,
  description text,
  routine_level text,
  focus text,
  weeks smallint,
  days_per_week smallint,
  author_id uuid,
  author_name text,
  author_level text,
  author_avatar text,
  like_count bigint,
  liked_by_me boolean,
  question_count bigint,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    rv.id,
    rv.title,
    coalesce(rv.description, ''),
    rv.level,
    rv.objective,
    rv.weeks,
    rv.days_per_week,
    r.owner_id,
    p.display_name,
    p.level,
    p.avatar_base64,
    (select count(*) from public.routine_likes rl where rl.routine_version_id = rv.id),
    exists (
      select 1 from public.routine_likes rl
      where rl.routine_version_id = rv.id and rl.user_id = auth.uid()
    ),
    (select count(*) from public.routine_questions rq where rq.routine_version_id = rv.id),
    rv.published_at
  from public.routines r
  join public.routine_versions rv on rv.routine_id = r.id
  join public.profiles p on p.user_id = r.owner_id
  where auth.uid() is not null
    and rv.visibility = 'public'
    and rv.published_at is not null
    and not exists (
      select 1 from public.routine_versions newer
      where newer.routine_id = rv.routine_id
        and newer.visibility = 'public'
        and newer.published_at is not null
        and newer.version_number > rv.version_number
    )
  order by rv.published_at desc;
$$;

create or replace function public.routine_questions_for(target_version_id uuid)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  body text,
  answer text,
  created_at timestamptz,
  answered_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select rq.id, rq.author_id, p.display_name, rq.body, rq.answer, rq.created_at, rq.answered_at
  from public.routine_questions rq
  join public.profiles p on p.user_id = rq.author_id
  where rq.routine_version_id = target_version_id
    and private.can_read_routine_version(target_version_id)
  order by rq.created_at desc;
$$;

create or replace function public.save_user_routine(
  target_routine_id uuid,
  routine_title text,
  routine_description text,
  routine_level text,
  routine_focus text,
  routine_weeks smallint,
  routine_days_per_week smallint,
  routine_visibility text,
  routine_exercises jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_routine_id uuid;
  previous_version public.routine_versions%rowtype;
  saved_version_id uuid;
  saved_day_id uuid;
  next_version_number integer;
  item jsonb;
  item_index integer := 0;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(routine_title)) not between 2 and 120 then raise exception 'Invalid routine title'; end if;
  if char_length(coalesce(routine_description, '')) > 2000 then raise exception 'Description is too long'; end if;
  if routine_level not in ('starter', 'beginner', 'intermediate', 'advanced') then raise exception 'Invalid level'; end if;
  if routine_focus not in ('mobility', 'strength', 'technique', 'competition') then raise exception 'Invalid focus'; end if;
  if routine_visibility not in ('private', 'public') then raise exception 'Invalid visibility'; end if;
  if routine_weeks not between 1 and 52 or routine_days_per_week not between 1 and 7 then raise exception 'Invalid duration'; end if;
  if jsonb_typeof(routine_exercises) <> 'array' or jsonb_array_length(routine_exercises) = 0 then raise exception 'Add at least one exercise'; end if;

  if target_routine_id is null then
    insert into public.routines (owner_id, status)
    values (current_user_id, 'active')
    returning id into saved_routine_id;
    next_version_number := 1;
  else
    select id into saved_routine_id
    from public.routines
    where id = target_routine_id and owner_id = current_user_id;
    if saved_routine_id is null then raise exception 'Routine not found'; end if;
    select * into previous_version
    from public.routine_versions
    where routine_id = saved_routine_id
    order by version_number desc
    limit 1;
    next_version_number := coalesce(previous_version.version_number, 0) + 1;
    if previous_version.id is not null and previous_version.visibility = 'public' then
      update public.routine_versions set visibility = 'retired' where id = previous_version.id;
    end if;
  end if;

  insert into public.routine_versions (
    routine_id, version_number, title, description, level, objective,
    weeks, days_per_week, visibility, published_at
  ) values (
    saved_routine_id, next_version_number, trim(routine_title), nullif(trim(routine_description), ''),
    routine_level, routine_focus, routine_weeks, routine_days_per_week, routine_visibility,
    case when routine_visibility = 'public' then now() else null end
  ) returning id into saved_version_id;

  insert into public.routine_days (routine_version_id, week_number, day_index, name, notes)
  values (saved_version_id, 1, 1, 'Sesión principal', nullif(trim(routine_description), ''))
  returning id into saved_day_id;

  for item in select value from jsonb_array_elements(routine_exercises)
  loop
    item_index := item_index + 1;
    insert into public.prescriptions (
      routine_day_id, exercise_id, sort_order, sets, repetitions,
      intensity_type, intensity_value, reference_exercise_id, suggested_load_kg,
      rest_seconds, notes
    ) values (
      saved_day_id,
      (item->>'exercise_id')::uuid,
      item_index,
      greatest(1, least(30, coalesce((item->>'sets')::smallint, 3))),
      greatest(1, least(100, coalesce((item->>'repetitions')::smallint, 3))),
      coalesce(item->>'intensity_type', 'load'),
      greatest(0, coalesce((item->>'intensity_value')::numeric, 0)),
      case when item->>'intensity_type' = 'percentage' then (item->>'exercise_id')::uuid else null end,
      case when coalesce(item->>'intensity_type', 'load') = 'load' then greatest(0, coalesce((item->>'intensity_value')::numeric, 0)) else null end,
      greatest(0, least(3600, coalesce((item->>'rest_seconds')::integer, 120))),
      nullif(trim(coalesce(item->>'notes', '')), '')
    );
  end loop;

  update public.routine_assignments
  set routine_version_id = saved_version_id
  where user_id = current_user_id
    and status = 'active'
    and routine_version_id in (
      select id from public.routine_versions where routine_id = saved_routine_id and id <> saved_version_id
    );

  return saved_routine_id;
end;
$$;

create or replace function public.delete_user_routine(target_routine_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.routines where id = target_routine_id and owner_id = auth.uid()
  ) then raise exception 'Routine not found'; end if;

  delete from public.routine_assignments
  where routine_version_id in (
    select id from public.routine_versions where routine_id = target_routine_id
  ) and user_id = auth.uid();
  delete from public.routines where id = target_routine_id and owner_id = auth.uid();
end;
$$;

grant execute on function public.community_routines() to authenticated;
grant execute on function public.routine_questions_for(uuid) to authenticated;
grant execute on function public.save_user_routine(uuid,text,text,text,text,smallint,smallint,text,jsonb) to authenticated;
grant execute on function public.delete_user_routine(uuid) to authenticated;
