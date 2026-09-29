alter table public.profiles
  add column confirm_detected_records boolean not null default true;

alter table public.performed_sets
  add column planned_load_kg numeric(7,2),
  add column planned_repetitions smallint;

update public.performed_sets
set planned_load_kg = load_kg,
    planned_repetitions = repetitions
where planned_load_kg is null
   or planned_repetitions is null;

alter table public.performed_sets
  alter column planned_load_kg set not null,
  alter column planned_load_kg set default 0,
  alter column planned_repetitions set not null,
  alter column planned_repetitions set default 1,
  add constraint performed_sets_planned_load_check check (planned_load_kg >= 0),
  add constraint performed_sets_planned_repetitions_check check (planned_repetitions between 1 and 100);

alter table public.workout_sessions
  add column pain_level smallint check (pain_level between 0 and 10),
  add column fatigue_level smallint check (fatigue_level between 0 and 10),
  add column overall_feeling text check (overall_feeling in ('poor', 'okay', 'good', 'excellent')),
  add column feedback_notes text check (char_length(feedback_notes) <= 1000);

create table public.exercise_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  repetitions smallint not null check (repetitions in (1, 2, 3, 5)),
  weight_kg numeric(7,2) not null check (weight_kg between 1 and 600),
  estimated_1rm_kg numeric(7,2) not null check (estimated_1rm_kg between 1 and 800),
  achieved_on date not null default current_date,
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  performed_set_id uuid not null references public.performed_sets(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workout_session_id, exercise_id, repetitions),
  unique (performed_set_id)
);

create index exercise_records_user_exercise_reps_idx
  on public.exercise_records(user_id, exercise_id, repetitions, achieved_on desc);

alter table public.exercise_records enable row level security;

create policy exercise_records_owner_select
on public.exercise_records for select
using (user_id = auth.uid());

grant select on public.exercise_records to authenticated;

create or replace function private.sync_reference_lift_from_exercise_record(target_record_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lift_records as saved_record (
    user_id, lift, weight_kg, achieved_on, source
  )
  select
    record.user_id,
    case exercise.slug
      when 'sentadilla' then 'back_squat'
      when 'arrancada' then 'snatch'
      when 'sentadilla-frontal' then 'front_squat'
      when 'dos-tiempos' then 'clean_and_jerk'
    end,
    record.weight_kg,
    record.achieved_on,
    'workout'
  from public.exercise_records record
  join public.exercises exercise on exercise.id = record.exercise_id
  where record.id = target_record_id
    and record.status = 'confirmed'
    and record.repetitions = 1
    and exercise.slug in ('sentadilla', 'arrancada', 'sentadilla-frontal', 'dos-tiempos')
  on conflict (user_id, lift, achieved_on) do update
  set weight_kg = excluded.weight_kg,
      source = 'workout',
      updated_at = now()
  where excluded.weight_kg > saved_record.weight_kg;
end;
$$;

create or replace function public.finish_workout_session_v2(
  target_session_id uuid,
  target_pain_level smallint,
  target_fatigue_level smallint,
  target_overall_feeling text,
  target_feedback_notes text default null
)
returns table (
  record_id uuid,
  exercise_id uuid,
  exercise_name text,
  exercise_slug text,
  repetitions smallint,
  weight_kg numeric,
  estimated_1rm_kg numeric,
  previous_weight_kg numeric,
  achieved_on date,
  record_status text,
  canonical_lift text,
  is_variant boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  session_owner uuid;
  current_status text;
  confirmation_required boolean;
  saved_record_id uuid;
begin
  select session.user_id, session.status
  into session_owner, current_status
  from public.workout_sessions session
  where session.id = target_session_id
  for update;

  if session_owner is null or session_owner <> auth.uid() then
    raise exception 'Workout session not found or not owned by the current user';
  end if;

  if target_pain_level not between 0 and 10
     or target_fatigue_level not between 0 and 10
     or target_overall_feeling not in ('poor', 'okay', 'good', 'excellent') then
    raise exception 'Invalid session feedback';
  end if;

  if current_status = 'active' then
    select profile.confirm_detected_records
    into confirmation_required
    from public.profiles profile
    where profile.user_id = session_owner;

    update public.workout_sessions session
    set status = 'completed',
        finished_at = now(),
        pain_level = target_pain_level,
        fatigue_level = target_fatigue_level,
        overall_feeling = target_overall_feeling,
        feedback_notes = nullif(trim(target_feedback_notes), '')
    where session.id = target_session_id;

    with candidates as (
      select distinct on (set_row.exercise_id, set_row.repetitions)
        set_row.id as performed_set_id,
        set_row.exercise_id,
        set_row.repetitions,
        set_row.load_kg::numeric as weight_kg,
        round(
          case when set_row.repetitions = 1
            then set_row.load_kg
            else set_row.load_kg * (1 + set_row.repetitions::numeric / 30)
          end,
          2
        ) as estimated_1rm_kg
      from public.performed_sets set_row
      where set_row.session_id = target_session_id
        and set_row.result = 'success'
        and set_row.load_kg > 0
        and set_row.repetitions in (1, 2, 3, 5)
      order by set_row.exercise_id, set_row.repetitions, set_row.load_kg desc, set_row.order_index
    ),
    new_bests as (
      select candidate.*
      from candidates candidate
      left join lateral (
        select max(record.weight_kg)::numeric as best_weight_kg
        from public.exercise_records record
        where record.user_id = session_owner
          and record.exercise_id = candidate.exercise_id
          and record.repetitions = candidate.repetitions
          and record.status = 'confirmed'
      ) previous on true
      where previous.best_weight_kg is null
         or candidate.weight_kg > previous.best_weight_kg
    )
    insert into public.exercise_records (
      user_id,
      exercise_id,
      repetitions,
      weight_kg,
      estimated_1rm_kg,
      achieved_on,
      workout_session_id,
      performed_set_id,
      status,
      resolved_at
    )
    select
      session_owner,
      new_best.exercise_id,
      new_best.repetitions,
      new_best.weight_kg,
      new_best.estimated_1rm_kg,
      current_date,
      target_session_id,
      new_best.performed_set_id,
      case when coalesce(confirmation_required, true) then 'pending' else 'confirmed' end,
      case when coalesce(confirmation_required, true) then null else now() end
    from new_bests new_best
    on conflict (workout_session_id, exercise_id, repetitions) do nothing;

    for saved_record_id in
      select record.id
      from public.exercise_records record
      where record.workout_session_id = target_session_id
        and record.status = 'confirmed'
    loop
      perform private.sync_reference_lift_from_exercise_record(saved_record_id);
    end loop;
  elsif current_status <> 'completed' then
    raise exception 'Only an active workout session can be completed';
  end if;

  return query
  select
    record.id,
    record.exercise_id,
    exercise.name,
    exercise.slug,
    record.repetitions,
    record.weight_kg,
    record.estimated_1rm_kg,
    previous.best_weight_kg,
    record.achieved_on,
    record.status,
    case exercise.slug
      when 'sentadilla' then 'back_squat'
      when 'arrancada' then 'snatch'
      when 'sentadilla-frontal' then 'front_squat'
      when 'dos-tiempos' then 'clean_and_jerk'
      else null
    end,
    exercise.slug not in ('sentadilla', 'arrancada', 'sentadilla-frontal', 'dos-tiempos')
  from public.exercise_records record
  join public.exercises exercise on exercise.id = record.exercise_id
  left join lateral (
    select max(older.weight_kg)::numeric as best_weight_kg
    from public.exercise_records older
    where older.user_id = record.user_id
      and older.exercise_id = record.exercise_id
      and older.repetitions = record.repetitions
      and older.status = 'confirmed'
      and older.id <> record.id
      and older.created_at <= record.created_at
  ) previous on true
  where record.workout_session_id = target_session_id
  order by exercise.name, record.repetitions;
end;
$$;

revoke all on function public.finish_workout_session_v2(uuid,smallint,smallint,text,text) from public, anon;
grant execute on function public.finish_workout_session_v2(uuid,smallint,smallint,text,text) to authenticated;

create or replace function public.resolve_exercise_record(
  target_record_id uuid,
  accept_record boolean
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  resolved_status text;
begin
  update public.exercise_records record
  set status = case when accept_record then 'confirmed' else 'rejected' end,
      resolved_at = now()
  where record.id = target_record_id
    and record.user_id = auth.uid()
    and record.status = 'pending'
  returning record.status into resolved_status;

  if resolved_status is null then
    raise exception 'Pending exercise record not found';
  end if;

  if accept_record then
    perform private.sync_reference_lift_from_exercise_record(target_record_id);
  end if;

  return resolved_status;
end;
$$;

revoke all on function public.resolve_exercise_record(uuid,boolean) from public, anon;
grant execute on function public.resolve_exercise_record(uuid,boolean) to authenticated;

revoke all on function private.sync_reference_lift_from_exercise_record(uuid) from public;

comment on table public.exercise_records is
  'Confirmed, pending or rejected personal records per exercise variant and repetition target.';

comment on function public.finish_workout_session_v2(uuid,smallint,smallint,text,text) is
  'Completes a workout with recovery feedback and detects 1RM, 2RM, 3RM and 5RM records without merging exercise variants.';
