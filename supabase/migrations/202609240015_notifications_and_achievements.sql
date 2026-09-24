create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('routine_like', 'routine_question')),
  event_key text not null,
  routine_version_id uuid references public.routine_versions(id) on delete cascade,
  question_id uuid references public.routine_questions(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, event_key)
);

create index notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications(user_id) where read_at is null;

create table public.achievement_definitions (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  title_es text not null,
  title_en text not null,
  description_es text not null,
  description_en text not null,
  icon text not null,
  metric text not null check (metric in ('workouts', 'lift_records', 'distinct_lifts', 'public_routines', 'likes_received', 'questions_received')),
  target_value integer not null check (target_value > 0),
  xp_reward integer not null check (xp_reward > 0),
  sort_order smallint not null unique
);

create table public.experience_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  event_type text not null,
  xp integer not null check (xp > 0),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, event_key)
);

create index experience_events_user_created_idx on public.experience_events(user_id, created_at desc);

create table public.athlete_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  account_level integer not null default 1 check (account_level >= 1),
  updated_at timestamptz not null default now()
);

create table public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_code text not null references public.achievement_definitions(code) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_code)
);

insert into public.achievement_definitions (
  code, title_es, title_en, description_es, description_en, icon, metric, target_value, xp_reward, sort_order
)
values
  ('first_workout', 'Primer entrenamiento', 'First workout', 'Completa tu primera sesión.', 'Complete your first session.', 'play', 'workouts', 1, 100, 1),
  ('five_workouts', 'En marcha', 'On a roll', 'Completa 5 sesiones.', 'Complete 5 sessions.', 'flame', 'workouts', 5, 200, 2),
  ('twenty_workouts', 'Constancia de hierro', 'Iron consistency', 'Completa 20 sesiones.', 'Complete 20 sessions.', 'calendar', 'workouts', 20, 500, 3),
  ('first_mark', 'Primera referencia', 'First benchmark', 'Registra tu primera marca.', 'Record your first lift result.', 'chart', 'lift_records', 1, 50, 4),
  ('ten_marks', 'Diario de fuerza', 'Strength journal', 'Registra 10 marcas con fecha.', 'Record 10 dated lift results.', 'trending', 'lift_records', 10, 200, 5),
  ('four_lifts', 'Perfil completo', 'Complete profile', 'Registra al menos una marca en los 4 movimientos.', 'Record at least one result for all 4 lifts.', 'medal', 'distinct_lifts', 4, 150, 6),
  ('first_public_routine', 'Programador', 'Programmer', 'Publica tu primera rutina.', 'Publish your first routine.', 'book', 'public_routines', 1, 100, 7),
  ('three_public_routines', 'Biblioteca propia', 'Personal library', 'Publica 3 rutinas.', 'Publish 3 routines.', 'library', 'public_routines', 3, 250, 8),
  ('first_like', 'Primera ovación', 'First cheer', 'Recibe tu primer like.', 'Receive your first like.', 'heart', 'likes_received', 1, 75, 9),
  ('ten_likes', 'Favorito de la comunidad', 'Community favourite', 'Recibe 10 likes.', 'Receive 10 likes.', 'star', 'likes_received', 10, 300, 10),
  ('first_question', 'Piden tu consejo', 'Advice requested', 'Recibe tu primera pregunta.', 'Receive your first question.', 'message', 'questions_received', 1, 75, 11)
on conflict (code) do update set
  title_es = excluded.title_es,
  title_en = excluded.title_en,
  description_es = excluded.description_es,
  description_en = excluded.description_en,
  icon = excluded.icon,
  metric = excluded.metric,
  target_value = excluded.target_value,
  xp_reward = excluded.xp_reward,
  sort_order = excluded.sort_order;

create or replace function private.gamification_metric(target_user_id uuid, metric_name text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  metric_value integer;
begin
  metric_value := case metric_name
    when 'workouts' then (select count(*)::integer from public.workout_sessions where user_id = target_user_id and status = 'completed')
    when 'lift_records' then (select count(*)::integer from public.lift_records where user_id = target_user_id)
    when 'distinct_lifts' then (select count(distinct lift)::integer from public.lift_records where user_id = target_user_id)
    when 'public_routines' then (
      select count(distinct r.id)::integer
      from public.routines r
      join public.routine_versions rv on rv.routine_id = r.id
      where r.owner_id = target_user_id and rv.published_at is not null
    )
    when 'likes_received' then (
      select count(*)::integer
      from public.routine_likes rl
      join public.routine_versions rv on rv.id = rl.routine_version_id
      join public.routines r on r.id = rv.routine_id
      where r.owner_id = target_user_id and rl.user_id <> target_user_id
    )
    when 'questions_received' then (
      select count(*)::integer
      from public.routine_questions rq
      join public.routine_versions rv on rv.id = rq.routine_version_id
      join public.routines r on r.id = rv.routine_id
      where r.owner_id = target_user_id and rq.author_id <> target_user_id
    )
    else 0
  end;
  return coalesce(metric_value, 0);
end;
$$;

create or replace function private.refresh_athlete_progress(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  calculated_xp integer;
  calculated_level integer;
begin
  select coalesce(sum(xp), 0)::integer into calculated_xp
  from public.experience_events
  where user_id = target_user_id;

  calculated_level := floor(sqrt(calculated_xp::numeric / 250))::integer + 1;

  insert into public.athlete_progress (user_id, total_xp, account_level, updated_at)
  values (target_user_id, calculated_xp, calculated_level, now())
  on conflict (user_id) do update
  set total_xp = excluded.total_xp,
      account_level = excluded.account_level,
      updated_at = excluded.updated_at;
end;
$$;

create or replace function private.award_experience(
  target_user_id uuid,
  target_event_key text,
  target_event_type text,
  target_xp integer,
  target_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.experience_events (user_id, event_key, event_type, xp, metadata)
  values (target_user_id, target_event_key, target_event_type, target_xp, coalesce(target_metadata, '{}'))
  on conflict (user_id, event_key) do nothing;
  if found then perform private.refresh_athlete_progress(target_user_id); end if;
end;
$$;

create or replace function private.evaluate_achievements(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  achievement record;
  current_value integer;
begin
  for achievement in select * from public.achievement_definitions order by sort_order
  loop
    current_value := private.gamification_metric(target_user_id, achievement.metric);
    if current_value >= achievement.target_value then
      insert into public.user_achievements (user_id, achievement_code)
      values (target_user_id, achievement.code)
      on conflict do nothing;
      if found then
        perform private.award_experience(
          target_user_id,
          'achievement:' || achievement.code,
          'achievement',
          achievement.xp_reward,
          jsonb_build_object('achievementCode', achievement.code)
        );
      end if;
    end if;
  end loop;
end;
$$;

create or replace function private.handle_profile_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.athlete_progress (user_id) values (new.user_id) on conflict do nothing;
  return new;
end;
$$;

create trigger profile_create_progress
after insert on public.profiles
for each row execute function private.handle_profile_progress();

create or replace function private.handle_completed_workout_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform private.award_experience(new.user_id, 'workout:' || new.id, 'workout_completed', 100, jsonb_build_object('sessionId', new.id));
    perform private.evaluate_achievements(new.user_id);
  end if;
  return new;
end;
$$;

create trigger workout_completed_gamification
after update of status on public.workout_sessions
for each row execute function private.handle_completed_workout_xp();

create or replace function private.handle_lift_record_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.award_experience(new.user_id, 'lift_record:' || new.id, 'lift_recorded', 25, jsonb_build_object('liftRecordId', new.id, 'lift', new.lift));
  perform private.evaluate_achievements(new.user_id);
  return new;
end;
$$;

create trigger lift_record_gamification
after insert on public.lift_records
for each row execute function private.handle_lift_record_xp();

create or replace function private.handle_published_routine_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_owner_id uuid;
begin
  if new.visibility = 'public' and new.published_at is not null then
    select owner_id into target_owner_id from public.routines where id = new.routine_id;
    perform private.award_experience(target_owner_id, 'published_routine:' || new.id, 'routine_published', 75, jsonb_build_object('routineVersionId', new.id));
    perform private.evaluate_achievements(target_owner_id);
  end if;
  return new;
end;
$$;

create trigger published_routine_gamification
after insert on public.routine_versions
for each row execute function private.handle_published_routine_xp();

create or replace function private.handle_routine_like_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_owner_id uuid;
begin
  select r.owner_id into target_owner_id
  from public.routine_versions rv
  join public.routines r on r.id = rv.routine_id
  where rv.id = new.routine_version_id;

  if target_owner_id is not null and target_owner_id <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, event_key, routine_version_id, created_at)
    values (target_owner_id, new.user_id, 'routine_like', 'like:' || new.routine_version_id || ':' || new.user_id, new.routine_version_id, new.created_at)
    on conflict (user_id, event_key) do nothing;
    perform private.award_experience(target_owner_id, 'like_received:' || new.routine_version_id || ':' || new.user_id, 'like_received', 10, jsonb_build_object('routineVersionId', new.routine_version_id));
    perform private.evaluate_achievements(target_owner_id);
  end if;
  return new;
end;
$$;

create trigger routine_like_notification_and_xp
after insert on public.routine_likes
for each row execute function private.handle_routine_like_event();

create or replace function private.handle_routine_question_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_owner_id uuid;
begin
  select r.owner_id into target_owner_id
  from public.routine_versions rv
  join public.routines r on r.id = rv.routine_id
  where rv.id = new.routine_version_id;

  if target_owner_id is not null and target_owner_id <> new.author_id then
    insert into public.notifications (user_id, actor_id, type, event_key, routine_version_id, question_id, created_at)
    values (target_owner_id, new.author_id, 'routine_question', 'question:' || new.id, new.routine_version_id, new.id, new.created_at)
    on conflict (user_id, event_key) do nothing;
    perform private.award_experience(target_owner_id, 'question_received:' || new.id, 'question_received', 15, jsonb_build_object('questionId', new.id));
    perform private.evaluate_achievements(target_owner_id);
  end if;
  return new;
end;
$$;

create trigger routine_question_notification_and_xp
after insert on public.routine_questions
for each row execute function private.handle_routine_question_event();

alter table public.notifications enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.experience_events enable row level security;
alter table public.athlete_progress enable row level security;
alter table public.user_achievements enable row level security;

create policy notifications_owner_read on public.notifications for select using (user_id = auth.uid());
create policy notifications_owner_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy achievement_definitions_authenticated_read on public.achievement_definitions for select using (auth.uid() is not null);
create policy experience_events_owner_read on public.experience_events for select using (user_id = auth.uid());
create policy athlete_progress_owner_read on public.athlete_progress for select using (user_id = auth.uid());
create policy user_achievements_owner_read on public.user_achievements for select using (user_id = auth.uid());

grant select, update on public.notifications to authenticated;
grant select on public.achievement_definitions, public.experience_events, public.athlete_progress, public.user_achievements to authenticated;

create or replace function public.my_notifications(result_limit integer default 30)
returns table (
  id uuid,
  notification_type text,
  actor_id uuid,
  actor_name text,
  actor_avatar text,
  routine_version_id uuid,
  routine_title text,
  question_body text,
  read_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id,
    n.type,
    n.actor_id,
    coalesce(actor.display_name, 'Atleta'),
    actor.avatar_base64,
    n.routine_version_id,
    coalesce(rv.title, 'Rutina'),
    rq.body,
    n.read_at,
    n.created_at
  from public.notifications n
  left join public.profiles actor on actor.user_id = n.actor_id
  left join public.routine_versions rv on rv.id = n.routine_version_id
  left join public.routine_questions rq on rq.id = n.question_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit greatest(1, least(coalesce(result_limit, 30), 100));
$$;

create or replace function public.mark_notifications_read(target_notification_ids uuid[] default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null
    and (target_notification_ids is null or id = any(target_notification_ids));
end;
$$;

create or replace function public.my_gamification()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  progress public.athlete_progress%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select * into progress from public.athlete_progress where user_id = current_user_id;

  return jsonb_build_object(
    'totalXp', coalesce(progress.total_xp, 0),
    'level', coalesce(progress.account_level, 1),
    'currentLevelXp', (coalesce(progress.account_level, 1) - 1) * (coalesce(progress.account_level, 1) - 1) * 250,
    'nextLevelXp', coalesce(progress.account_level, 1) * coalesce(progress.account_level, 1) * 250,
    'unlockedCount', (select count(*) from public.user_achievements where user_id = current_user_id),
    'achievements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', ad.code,
        'titleEs', ad.title_es,
        'titleEn', ad.title_en,
        'descriptionEs', ad.description_es,
        'descriptionEn', ad.description_en,
        'icon', ad.icon,
        'xpReward', ad.xp_reward,
        'targetValue', ad.target_value,
        'progressValue', least(private.gamification_metric(current_user_id, ad.metric), ad.target_value),
        'unlockedAt', ua.unlocked_at
      ) order by ad.sort_order)
      from public.achievement_definitions ad
      left join public.user_achievements ua on ua.achievement_code = ad.code and ua.user_id = current_user_id
    ), '[]'::jsonb),
    'recentEvents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'type', recent.event_type,
        'xp', recent.xp,
        'createdAt', recent.created_at,
        'metadata', recent.metadata
      ) order by recent.created_at desc)
      from (
        select * from public.experience_events
        where user_id = current_user_id
        order by created_at desc
        limit 15
      ) recent
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.public_athlete_rank(target_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'level', coalesce(ap.account_level, 1),
    'totalXp', coalesce(ap.total_xp, 0),
    'unlockedCount', (select count(*) from public.user_achievements ua where ua.user_id = target_user_id)
  )
  from public.profiles p
  left join public.athlete_progress ap on ap.user_id = p.user_id
  where p.user_id = target_user_id
    and auth.uid() is not null
    and (p.user_id = auth.uid() or p.profile_visibility = 'public');
$$;

revoke all on function public.my_notifications(integer) from public, anon;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
revoke all on function public.my_gamification() from public, anon;
revoke all on function public.public_athlete_rank(uuid) from public, anon;
grant execute on function public.my_notifications(integer) to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.my_gamification() to authenticated;
grant execute on function public.public_athlete_rank(uuid) to authenticated;

-- Build XP and notifications for data that existed before this feature.
insert into public.athlete_progress (user_id)
select user_id from public.profiles
on conflict do nothing;

insert into public.experience_events (user_id, event_key, event_type, xp, metadata, created_at)
select user_id, 'workout:' || id, 'workout_completed', 100, jsonb_build_object('sessionId', id), coalesce(finished_at, created_at)
from public.workout_sessions where status = 'completed'
on conflict do nothing;

insert into public.experience_events (user_id, event_key, event_type, xp, metadata, created_at)
select user_id, 'lift_record:' || id, 'lift_recorded', 25, jsonb_build_object('liftRecordId', id, 'lift', lift), created_at
from public.lift_records
on conflict do nothing;

insert into public.experience_events (user_id, event_key, event_type, xp, metadata, created_at)
select r.owner_id, 'published_routine:' || rv.id, 'routine_published', 75, jsonb_build_object('routineVersionId', rv.id), rv.published_at
from public.routine_versions rv
join public.routines r on r.id = rv.routine_id
where rv.published_at is not null
on conflict do nothing;

insert into public.experience_events (user_id, event_key, event_type, xp, metadata, created_at)
select r.owner_id, 'like_received:' || rl.routine_version_id || ':' || rl.user_id, 'like_received', 10, jsonb_build_object('routineVersionId', rl.routine_version_id), rl.created_at
from public.routine_likes rl
join public.routine_versions rv on rv.id = rl.routine_version_id
join public.routines r on r.id = rv.routine_id
where r.owner_id <> rl.user_id
on conflict do nothing;

insert into public.experience_events (user_id, event_key, event_type, xp, metadata, created_at)
select r.owner_id, 'question_received:' || rq.id, 'question_received', 15, jsonb_build_object('questionId', rq.id), rq.created_at
from public.routine_questions rq
join public.routine_versions rv on rv.id = rq.routine_version_id
join public.routines r on r.id = rv.routine_id
where r.owner_id <> rq.author_id
on conflict do nothing;

insert into public.notifications (user_id, actor_id, type, event_key, routine_version_id, created_at)
select r.owner_id, rl.user_id, 'routine_like', 'like:' || rl.routine_version_id || ':' || rl.user_id, rl.routine_version_id, rl.created_at
from public.routine_likes rl
join public.routine_versions rv on rv.id = rl.routine_version_id
join public.routines r on r.id = rv.routine_id
where r.owner_id <> rl.user_id
on conflict do nothing;

insert into public.notifications (user_id, actor_id, type, event_key, routine_version_id, question_id, created_at)
select r.owner_id, rq.author_id, 'routine_question', 'question:' || rq.id, rq.routine_version_id, rq.id, rq.created_at
from public.routine_questions rq
join public.routine_versions rv on rv.id = rq.routine_version_id
join public.routines r on r.id = rv.routine_id
where r.owner_id <> rq.author_id
on conflict do nothing;

select private.refresh_athlete_progress(user_id) from public.profiles;
select private.evaluate_achievements(user_id) from public.profiles;

revoke all on function private.gamification_metric(uuid,text) from public;
revoke all on function private.refresh_athlete_progress(uuid) from public;
revoke all on function private.award_experience(uuid,text,text,integer,jsonb) from public;
revoke all on function private.evaluate_achievements(uuid) from public;
revoke all on function private.handle_profile_progress() from public;
revoke all on function private.handle_completed_workout_xp() from public;
revoke all on function private.handle_lift_record_xp() from public;
revoke all on function private.handle_published_routine_xp() from public;
revoke all on function private.handle_routine_like_event() from public;
revoke all on function private.handle_routine_question_event() from public;
