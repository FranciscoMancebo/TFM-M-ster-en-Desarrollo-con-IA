alter table public.routine_days
  add column if not exists phase text not null default 'accumulation',
  add column if not exists percentage_adjustment numeric(5,2) not null default 0;

alter table public.routine_days
  drop constraint if exists routine_days_phase_check,
  add constraint routine_days_phase_check
    check (phase in ('accumulation', 'intensification', 'deload')),
  drop constraint if exists routine_days_percentage_adjustment_check,
  add constraint routine_days_percentage_adjustment_check
    check (percentage_adjustment between -40 and 30);

comment on column public.routine_days.phase is 'Training block assigned to the week that contains this day.';
comment on column public.routine_days.percentage_adjustment is 'Percentage points applied over the base week.';

-- Expand legacy one-week templates so existing routines immediately gain real,
-- editable weeks without changing absolute loads.
do $$
declare
  version_row record;
  source_day record;
  saved_day_id uuid;
  target_week integer;
  working_weeks integer;
  accumulation_weeks integer;
  phase_name text;
  adjustment numeric;
  phase_position integer;
begin
  for version_row in
    select id, weeks from public.routine_versions where weeks > 1
  loop
    working_weeks := version_row.weeks - case when version_row.weeks >= 3 then 1 else 0 end;
    accumulation_weeks := greatest(1, ceil(working_weeks * 0.6)::integer);

    for target_week in 2..version_row.weeks
    loop
      if exists (
        select 1 from public.routine_days
        where routine_version_id = version_row.id and week_number = target_week
      ) then
        continue;
      end if;

      if version_row.weeks >= 3 and target_week = version_row.weeks then
        phase_name := 'deload';
        adjustment := -15;
      elsif target_week <= accumulation_weeks then
        phase_name := 'accumulation';
        adjustment := (target_week - 1) * 2;
      else
        phase_name := 'intensification';
        phase_position := target_week - accumulation_weeks - 1;
        adjustment := 5 + phase_position * 2;
      end if;

      for source_day in
        select * from public.routine_days
        where routine_version_id = version_row.id and week_number = 1
        order by day_index
      loop
        insert into public.routine_days (
          routine_version_id, week_number, day_index, name, notes, phase, percentage_adjustment
        ) values (
          version_row.id, target_week, source_day.day_index, source_day.name, source_day.notes,
          phase_name, adjustment
        ) returning id into saved_day_id;

        insert into public.prescriptions (
          routine_day_id, exercise_id, sort_order, sets, repetitions,
          intensity_type, intensity_value, reference_exercise_id, target_rpe,
          rest_seconds, notes, suggested_load_kg
        )
        select
          saved_day_id, p.exercise_id, p.sort_order, p.sets, p.repetitions,
          p.intensity_type,
          case when p.intensity_type = 'percentage'
            then greatest(0, least(100, p.intensity_value + adjustment))
            else p.intensity_value end,
          p.reference_exercise_id, p.target_rpe, p.rest_seconds, p.notes, p.suggested_load_kg
        from public.prescriptions p
        where p.routine_day_id = source_day.id
        order by p.sort_order;
      end loop;
    end loop;
  end loop;
end;
$$;

create or replace function public.save_user_routine_days(
  target_routine_id uuid,
  routine_title text,
  routine_description text,
  routine_level text,
  routine_focus text,
  routine_weeks smallint,
  routine_days_per_week smallint,
  routine_visibility text,
  routine_days_data jsonb
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
  week_item jsonb;
  day_item jsonb;
  exercise_item jsonb;
  current_week_number integer;
  current_day_index integer;
  current_exercise_index integer;
  day_name text;
  week_phase text;
  week_adjustment numeric;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(routine_title)) not between 2 and 120 then raise exception 'Invalid routine title'; end if;
  if char_length(coalesce(routine_description, '')) > 2000 then raise exception 'Description is too long'; end if;
  if routine_level not in ('starter', 'beginner', 'intermediate', 'advanced') then raise exception 'Invalid level'; end if;
  if routine_focus not in ('mobility', 'strength', 'technique', 'competition') then raise exception 'Invalid focus'; end if;
  if routine_visibility not in ('private', 'public') then raise exception 'Invalid visibility'; end if;
  if routine_weeks not between 1 and 52 or routine_days_per_week not between 1 and 7 then raise exception 'Invalid duration'; end if;
  if jsonb_typeof(routine_days_data) <> 'array'
    or jsonb_array_length(routine_days_data) <> routine_weeks
  then
    raise exception 'Routine weeks must match routine duration';
  end if;

  for week_item in select value from jsonb_array_elements(routine_days_data)
  loop
    current_week_number := coalesce((week_item->>'week_number')::integer, 0);
    week_phase := coalesce(week_item->>'phase', 'accumulation');
    week_adjustment := coalesce((week_item->>'percentage_adjustment')::numeric, 0);
    if current_week_number not between 1 and routine_weeks then raise exception 'Invalid week number'; end if;
    if week_phase not in ('accumulation', 'intensification', 'deload') then raise exception 'Invalid training phase'; end if;
    if week_adjustment not between -40 and 30 then raise exception 'Invalid percentage adjustment'; end if;
    if jsonb_typeof(week_item->'days') <> 'array'
      or jsonb_array_length(week_item->'days') <> routine_days_per_week
    then
      raise exception 'Routine days must match days per week';
    end if;

    for day_item in select value from jsonb_array_elements(week_item->'days')
    loop
      day_name := trim(coalesce(day_item->>'name', ''));
      if char_length(day_name) not between 2 and 100 then raise exception 'Invalid day name'; end if;
      if jsonb_typeof(day_item->'exercises') <> 'array'
        or jsonb_array_length(day_item->'exercises') = 0
      then
        raise exception 'Every routine day needs at least one exercise';
      end if;
    end loop;
  end loop;

  if (select count(distinct (item->>'week_number')::integer) from jsonb_array_elements(routine_days_data) item) <> routine_weeks then
    raise exception 'Week numbers must be unique';
  end if;

  if target_routine_id is null then
    insert into public.routines (owner_id, status)
    values (current_user_id, 'active') returning id into saved_routine_id;
    next_version_number := 1;
  else
    select id into saved_routine_id from public.routines
    where id = target_routine_id and owner_id = current_user_id;
    if saved_routine_id is null then raise exception 'Routine not found'; end if;

    select * into previous_version from public.routine_versions
    where routine_id = saved_routine_id order by version_number desc limit 1;
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

  for week_item in select value from jsonb_array_elements(routine_days_data) order by (value->>'week_number')::integer
  loop
    current_week_number := (week_item->>'week_number')::integer;
    week_phase := week_item->>'phase';
    week_adjustment := (week_item->>'percentage_adjustment')::numeric;
    current_day_index := 0;

    for day_item in select value from jsonb_array_elements(week_item->'days')
    loop
      current_day_index := current_day_index + 1;
      current_exercise_index := 0;
      day_name := trim(day_item->>'name');

      insert into public.routine_days (
        routine_version_id, week_number, day_index, name, notes, phase, percentage_adjustment
      ) values (
        saved_version_id, current_week_number, current_day_index, day_name,
        nullif(trim(routine_description), ''), week_phase, week_adjustment
      ) returning id into saved_day_id;

      for exercise_item in select value from jsonb_array_elements(day_item->'exercises')
      loop
        current_exercise_index := current_exercise_index + 1;
        if coalesce(exercise_item->>'intensity_type', 'load') not in ('load', 'percentage') then
          raise exception 'Invalid intensity type';
        end if;

        insert into public.prescriptions (
          routine_day_id, exercise_id, sort_order, sets, repetitions,
          intensity_type, intensity_value, reference_exercise_id, suggested_load_kg,
          rest_seconds, notes
        ) values (
          saved_day_id, (exercise_item->>'exercise_id')::uuid, current_exercise_index,
          greatest(1, least(30, coalesce((exercise_item->>'sets')::smallint, 3))),
          greatest(1, least(100, coalesce((exercise_item->>'repetitions')::smallint, 3))),
          coalesce(exercise_item->>'intensity_type', 'load'),
          greatest(0, least(600, coalesce((exercise_item->>'intensity_value')::numeric, 0))),
          case when exercise_item->>'intensity_type' = 'percentage' then (exercise_item->>'exercise_id')::uuid else null end,
          case when coalesce(exercise_item->>'intensity_type', 'load') = 'load' then greatest(0, coalesce((exercise_item->>'intensity_value')::numeric, 0)) else null end,
          greatest(0, least(3600, coalesce((exercise_item->>'rest_seconds')::integer, 120))),
          nullif(trim(coalesce(exercise_item->>'notes', '')), '')
        );
      end loop;
    end loop;
  end loop;

  update public.routine_assignments set routine_version_id = saved_version_id
  where user_id = current_user_id and status = 'active'
    and routine_version_id in (
      select id from public.routine_versions where routine_id = saved_routine_id and id <> saved_version_id
    );

  return saved_routine_id;
end;
$$;

create or replace function public.import_public_routine(
  target_version_id uuid,
  activate_after_import boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  source_version public.routine_versions%rowtype;
  source_owner_id uuid;
  saved_routine_id uuid;
  saved_version_id uuid;
  source_day record;
  saved_day_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select rv.* into source_version
  from public.routine_versions rv
  join public.routines r on r.id = rv.routine_id
  where rv.id = target_version_id and rv.visibility = 'public' and rv.published_at is not null;
  if source_version.id is null then raise exception 'Public routine not found'; end if;

  select owner_id into source_owner_id from public.routines where id = source_version.routine_id;
  if source_owner_id = current_user_id then raise exception 'This routine already belongs to you'; end if;

  select r.id into saved_routine_id from public.routines r
  where r.owner_id = current_user_id and r.source_version_id = target_version_id and r.status <> 'archived'
  limit 1;

  if saved_routine_id is null then
    insert into public.routines (owner_id, status, source_version_id)
    values (current_user_id, 'active', target_version_id) returning id into saved_routine_id;

    insert into public.routine_versions (
      routine_id, version_number, title, description, level, objective,
      weeks, days_per_week, visibility, published_at
    ) values (
      saved_routine_id, 1, source_version.title, source_version.description,
      source_version.level, source_version.objective, source_version.weeks,
      source_version.days_per_week, 'private', null
    ) returning id into saved_version_id;

    for source_day in
      select * from public.routine_days where routine_version_id = target_version_id
      order by week_number, day_index
    loop
      insert into public.routine_days (
        routine_version_id, week_number, day_index, name, notes, phase, percentage_adjustment
      ) values (
        saved_version_id, source_day.week_number, source_day.day_index, source_day.name,
        source_day.notes, source_day.phase, source_day.percentage_adjustment
      ) returning id into saved_day_id;

      insert into public.prescriptions (
        routine_day_id, exercise_id, sort_order, sets, repetitions,
        intensity_type, intensity_value, reference_exercise_id, target_rpe,
        rest_seconds, notes, suggested_load_kg
      )
      select saved_day_id, p.exercise_id, p.sort_order, p.sets, p.repetitions,
        p.intensity_type, p.intensity_value, p.reference_exercise_id, p.target_rpe,
        p.rest_seconds, p.notes, p.suggested_load_kg
      from public.prescriptions p where p.routine_day_id = source_day.id order by p.sort_order;
    end loop;
  end if;

  if activate_after_import then perform public.activate_owned_routine(saved_routine_id); end if;
  return saved_routine_id;
end;
$$;

revoke all on function public.save_user_routine_days(uuid,text,text,text,text,smallint,smallint,text,jsonb) from public, anon;
revoke all on function public.import_public_routine(uuid,boolean) from public, anon;
grant execute on function public.save_user_routine_days(uuid,text,text,text,text,smallint,smallint,text,jsonb) to authenticated;
grant execute on function public.import_public_routine(uuid,boolean) to authenticated;
