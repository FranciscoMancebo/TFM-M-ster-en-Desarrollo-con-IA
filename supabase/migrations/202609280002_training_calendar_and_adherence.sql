create table public.training_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_on date not null,
  event_type text not null
    check (event_type in ('workout', 'rest', 'competition', 'free_session')),
  status text not null default 'planned'
    check (status in ('planned', 'completed', 'skipped')),
  title text not null check (char_length(title) between 2 and 120),
  notes text check (char_length(notes) <= 1000),
  routine_assignment_id uuid references public.routine_assignments(id) on delete set null,
  routine_day_id uuid references public.routine_days(id) on delete set null,
  workout_session_id uuid unique references public.workout_sessions(id) on delete set null,
  rescheduled_from date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, scheduled_on),
  check (event_type <> 'workout' or routine_day_id is not null)
);

create index training_calendar_events_user_date_idx
  on public.training_calendar_events(user_id, scheduled_on);

create trigger training_calendar_events_set_updated_at
before update on public.training_calendar_events
for each row execute function private.set_updated_at();

alter table public.training_calendar_events enable row level security;

create policy training_calendar_events_owner_select
on public.training_calendar_events for select
using (user_id = auth.uid());

create policy training_calendar_events_owner_insert
on public.training_calendar_events for insert
with check (
  user_id = auth.uid()
  and (
    routine_assignment_id is null
    or exists (
      select 1 from public.routine_assignments assignment
      where assignment.id = routine_assignment_id
        and assignment.user_id = auth.uid()
    )
  )
  and (
    event_type <> 'workout'
    or exists (
      select 1
      from public.routine_days day
      join public.routine_assignments assignment
        on assignment.routine_version_id = day.routine_version_id
      where day.id = routine_day_id
        and assignment.user_id = auth.uid()
        and assignment.status = 'active'
    )
  )
  and (
    workout_session_id is null
    or exists (
      select 1 from public.workout_sessions session
      where session.id = workout_session_id
        and session.user_id = auth.uid()
    )
  )
);

create policy training_calendar_events_owner_update
on public.training_calendar_events for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    routine_assignment_id is null
    or exists (
      select 1 from public.routine_assignments assignment
      where assignment.id = routine_assignment_id
        and assignment.user_id = auth.uid()
    )
  )
  and (
    event_type <> 'workout'
    or exists (
      select 1
      from public.routine_days day
      join public.routine_assignments assignment
        on assignment.routine_version_id = day.routine_version_id
      where day.id = routine_day_id
        and assignment.user_id = auth.uid()
        and assignment.status = 'active'
    )
  )
  and (
    workout_session_id is null
    or exists (
      select 1 from public.workout_sessions session
      where session.id = workout_session_id
        and session.user_id = auth.uid()
    )
  )
);

create policy training_calendar_events_owner_delete
on public.training_calendar_events for delete
using (user_id = auth.uid());

grant select, insert, update, delete on public.training_calendar_events to authenticated;

create or replace function public.link_workout_session_to_calendar(
  target_session_id uuid,
  target_routine_day_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_assignment_id uuid;
  target_event_id uuid;
  target_title text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select session.assignment_id
  into target_assignment_id
  from public.workout_sessions session
  where session.id = target_session_id
    and session.user_id = current_user_id
    and session.status = 'active';

  if not found then raise exception 'Active workout session not found'; end if;

  select day.name
  into target_title
  from public.routine_days day
  join public.routine_assignments assignment
    on assignment.id = target_assignment_id
   and assignment.routine_version_id = day.routine_version_id
  where day.id = target_routine_day_id;

  if not found then raise exception 'Routine day does not belong to the active assignment'; end if;

  select event.id
  into target_event_id
  from public.training_calendar_events event
  where event.user_id = current_user_id
    and event.scheduled_on = current_date
    and event.event_type = 'workout'
    and event.status = 'planned'
    and event.workout_session_id is null
    and event.routine_day_id = target_routine_day_id
  limit 1
  for update;

  if target_event_id is null then
    insert into public.training_calendar_events (
      user_id,
      scheduled_on,
      event_type,
      status,
      title,
      routine_assignment_id,
      routine_day_id,
      workout_session_id
    )
    values (
      current_user_id,
      current_date,
      'workout',
      'planned',
      target_title,
      target_assignment_id,
      target_routine_day_id,
      target_session_id
    )
    returning id into target_event_id;
  else
    update public.training_calendar_events event
    set workout_session_id = target_session_id,
        routine_assignment_id = coalesce(event.routine_assignment_id, target_assignment_id)
    where event.id = target_event_id;
  end if;

  return target_event_id;
end;
$$;

revoke all on function public.link_workout_session_to_calendar(uuid,uuid) from public, anon;
grant execute on function public.link_workout_session_to_calendar(uuid,uuid) to authenticated;

create or replace function private.complete_linked_calendar_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.training_calendar_events
    set status = 'completed'
    where workout_session_id = new.id
      and user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger workout_complete_calendar_event
after update of status on public.workout_sessions
for each row execute function private.complete_linked_calendar_event();

create or replace function public.my_adherence_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  week_start date := date_trunc('week', current_date)::date;
  month_start date := date_trunc('month', current_date)::date;
  week_values jsonb;
  month_values jsonb;
  current_streak integer;
  perfect_weeks integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select jsonb_build_object(
    'planned', count(*),
    'completed', count(*) filter (where event.status = 'completed'),
    'skipped', count(*) filter (where event.status = 'skipped'),
    'pending', count(*) filter (where event.status = 'planned'),
    'percentage', case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where event.status = 'completed') / count(*)) end
  ) into week_values
  from public.training_calendar_events event
  where event.user_id = current_user_id
    and event.event_type <> 'rest'
    and event.scheduled_on between week_start and least(week_start + 6, current_date);

  select jsonb_build_object(
    'planned', count(*),
    'completed', count(*) filter (where event.status = 'completed'),
    'skipped', count(*) filter (where event.status = 'skipped'),
    'pending', count(*) filter (where event.status = 'planned'),
    'percentage', case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where event.status = 'completed') / count(*)) end
  ) into month_values
  from public.training_calendar_events event
  where event.user_id = current_user_id
    and event.event_type <> 'rest'
    and event.scheduled_on between month_start and current_date;

  select count(*)::integer into current_streak
  from (
    select
      event.status,
      sum(case when event.status <> 'completed' then 1 else 0 end) over (
        order by event.scheduled_on desc, event.created_at desc
        rows between unbounded preceding and current row
      ) as blockers
    from public.training_calendar_events event
    where event.user_id = current_user_id
      and event.event_type <> 'rest'
      and event.status <> 'planned'
      and event.scheduled_on <= current_date
  ) ordered_events
  where ordered_events.status = 'completed'
    and ordered_events.blockers = 0;

  select count(*)::integer into perfect_weeks
  from (
    select date_trunc('week', event.scheduled_on)::date as starts_on
    from public.training_calendar_events event
    where event.user_id = current_user_id
      and event.event_type <> 'rest'
      and event.scheduled_on <= current_date
    group by date_trunc('week', event.scheduled_on)::date
    having count(*) > 0 and bool_and(event.status = 'completed')
  ) complete_weeks;

  return jsonb_build_object(
    'week', coalesce(week_values, '{}'::jsonb),
    'month', coalesce(month_values, '{}'::jsonb),
    'currentStreak', coalesce(current_streak, 0),
    'perfectWeeks', coalesce(perfect_weeks, 0)
  );
end;
$$;

revoke all on function public.my_adherence_summary() from public, anon;
grant execute on function public.my_adherence_summary() to authenticated;

alter table public.achievement_definitions
  drop constraint if exists achievement_definitions_metric_check;

alter table public.achievement_definitions
  add constraint achievement_definitions_metric_check
  check (metric in (
    'workouts', 'lift_records', 'distinct_lifts', 'public_routines',
    'likes_received', 'questions_received', 'volume_kg',
    'successful_sets', 'personal_bests', 'adherence_streak',
    'perfect_weeks'
  ));

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
    when 'workouts' then (
      select count(*)::integer from public.workout_sessions
      where user_id = target_user_id and status = 'completed'
    )
    when 'lift_records' then (
      select count(*)::integer from public.lift_records where user_id = target_user_id
    )
    when 'distinct_lifts' then (
      select count(distinct lift)::integer from public.lift_records where user_id = target_user_id
    )
    when 'public_routines' then (
      select count(distinct routine.id)::integer
      from public.routines routine
      join public.routine_versions version on version.routine_id = routine.id
      where routine.owner_id = target_user_id and version.published_at is not null
    )
    when 'likes_received' then (
      select count(*)::integer
      from public.routine_likes item
      join public.routine_versions version on version.id = item.routine_version_id
      join public.routines routine on routine.id = version.routine_id
      where routine.owner_id = target_user_id and item.user_id <> target_user_id
    )
    when 'questions_received' then (
      select count(*)::integer
      from public.routine_questions item
      join public.routine_versions version on version.id = item.routine_version_id
      join public.routines routine on routine.id = version.routine_id
      where routine.owner_id = target_user_id and item.author_id <> target_user_id
    )
    when 'volume_kg' then (
      select floor(coalesce(sum(item.load_kg * item.repetitions), 0))::integer
      from public.workout_sessions session
      join public.performed_sets item on item.session_id = session.id
      where session.user_id = target_user_id
        and session.status = 'completed'
        and item.result = 'success'
    )
    when 'successful_sets' then (
      select count(*)::integer
      from public.workout_sessions session
      join public.performed_sets item on item.session_id = session.id
      where session.user_id = target_user_id
        and session.status = 'completed'
        and item.result = 'success'
    )
    when 'personal_bests' then (
      select count(*)::integer
      from (
        select
          record.weight_kg,
          max(record.weight_kg) over (
            partition by record.lift
            order by record.achieved_on, record.created_at, record.id
            rows between unbounded preceding and 1 preceding
          ) as previous_best
        from public.lift_records record
        where record.user_id = target_user_id
      ) progression
      where progression.previous_best is not null
        and progression.weight_kg > progression.previous_best
    )
    when 'adherence_streak' then (
      select count(*)::integer
      from (
        select
          event.status,
          sum(case when event.status <> 'completed' then 1 else 0 end) over (
            order by event.scheduled_on desc, event.created_at desc
            rows between unbounded preceding and current row
          ) as blockers
        from public.training_calendar_events event
        where event.user_id = target_user_id
          and event.event_type <> 'rest'
          and event.status <> 'planned'
          and event.scheduled_on <= current_date
      ) ordered_events
      where ordered_events.status = 'completed'
        and ordered_events.blockers = 0
    )
    when 'perfect_weeks' then (
      select count(*)::integer
      from (
        select date_trunc('week', event.scheduled_on)::date
        from public.training_calendar_events event
        where event.user_id = target_user_id
          and event.event_type <> 'rest'
          and event.scheduled_on <= current_date
        group by date_trunc('week', event.scheduled_on)::date
        having count(*) > 0 and bool_and(event.status = 'completed')
      ) weeks
    )
    else 0
  end;
  return coalesce(metric_value, 0);
end;
$$;

insert into public.achievement_definitions (
  code, title_es, title_en, description_es, description_en,
  icon, metric, target_value, xp_reward, sort_order
)
values
  ('streak_3', 'Tres entrenamientos seguidos', 'Three in a row', 'Completa tres días planificados seguidos.', 'Complete three planned training days in a row.', 'flame', 'adherence_streak', 3, 100, 32),
  ('streak_10', 'Racha de hierro', 'Iron streak', 'Completa diez días planificados seguidos.', 'Complete ten planned training days in a row.', 'flame', 'adherence_streak', 10, 350, 33),
  ('perfect_week', 'Semana perfecta', 'Perfect week', 'Completa todos los entrenamientos planificados de una semana.', 'Complete every planned training day in one week.', 'calendar', 'perfect_weeks', 1, 150, 34),
  ('perfect_month', 'Cuatro semanas perfectas', 'Four perfect weeks', 'Completa cuatro semanas de planificación sin omitir entrenamientos.', 'Complete four fully planned weeks without skipping training.', 'trophy', 'perfect_weeks', 4, 500, 35)
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

create or replace function private.handle_calendar_achievement_evaluation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.evaluate_achievements(new.user_id);
  return new;
end;
$$;

create trigger calendar_event_achievement_evaluation
after insert or update of status, scheduled_on, event_type
on public.training_calendar_events
for each row execute function private.handle_calendar_achievement_evaluation();

revoke all on function private.complete_linked_calendar_event() from public;
revoke all on function private.handle_calendar_achievement_evaluation() from public;

comment on table public.training_calendar_events is
  'One owned calendar entry per day for planned training, rest, competition or free sessions.';
