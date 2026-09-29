create or replace function public.finish_workout_session(target_session_id uuid)
returns table (
  lift text,
  weight_kg numeric,
  previous_weight_kg numeric,
  achieved_on date
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  session_owner uuid;
  current_status text;
  record_date date := current_date;
begin
  select ws.user_id, ws.status
  into session_owner, current_status
  from public.workout_sessions ws
  where ws.id = target_session_id
  for update;

  if session_owner is null or session_owner <> auth.uid() then
    raise exception 'Workout session not found or not owned by the current user';
  end if;

  if current_status = 'completed' then
    return;
  end if;

  if current_status <> 'active' then
    raise exception 'Only an active workout session can be completed';
  end if;

  update public.workout_sessions ws
  set status = 'completed', finished_at = now()
  where ws.id = target_session_id;

  return query
  with candidates as (
    select mapped.lift, max(ps.load_kg)::numeric as best_weight_kg
    from public.performed_sets ps
    join public.exercises e on e.id = ps.exercise_id
    cross join lateral (
      values (
        case e.slug
          when 'sentadilla' then 'back_squat'
          when 'arrancada' then 'snatch'
          when 'sentadilla-frontal' then 'front_squat'
          when 'dos-tiempos' then 'clean_and_jerk'
          else null
        end
      )
    ) as mapped(lift)
    where ps.session_id = target_session_id
      and ps.result = 'success'
      and ps.load_kg > 0
      and mapped.lift is not null
    group by mapped.lift
  ),
  new_bests as (
    select candidate.lift, candidate.best_weight_kg, previous.best_weight_kg as previous_weight_kg
    from candidates candidate
    left join lateral (
      select max(lr.weight_kg)::numeric as best_weight_kg
      from public.lift_records lr
      where lr.user_id = session_owner and lr.lift = candidate.lift
    ) previous on true
    where previous.best_weight_kg is null or candidate.best_weight_kg > previous.best_weight_kg
  ),
  saved as (
    insert into public.lift_records as saved_record (
      user_id, lift, weight_kg, achieved_on, source
    )
    select session_owner, new_best.lift, new_best.best_weight_kg, record_date, 'workout'
    from new_bests new_best
    on conflict (user_id, lift, achieved_on) do update
    set weight_kg = excluded.weight_kg,
        source = 'workout',
        updated_at = now()
    where excluded.weight_kg > saved_record.weight_kg
    returning saved_record.lift, saved_record.weight_kg, saved_record.achieved_on
  )
  select saved.lift, saved.weight_kg, new_best.previous_weight_kg, saved.achieved_on
  from saved
  join new_bests new_best on new_best.lift = saved.lift
  order by saved.lift;
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
#variable_conflict use_column
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
      where previous.best_weight_kg is null or candidate.weight_kg > previous.best_weight_kg
    )
    insert into public.exercise_records (
      user_id, exercise_id, repetitions, weight_kg, estimated_1rm_kg,
      achieved_on, workout_session_id, performed_set_id, status, resolved_at
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
      where record.workout_session_id = target_session_id and record.status = 'confirmed'
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

comment on function public.finish_workout_session(uuid) is
  'Atomically completes an owned workout and records all-time personal bests from successful canonical lifts.';

comment on function public.finish_workout_session_v2(uuid,smallint,smallint,text,text) is
  'Completes a workout with recovery feedback and detects 1RM, 2RM, 3RM and 5RM records without merging exercise variants.';
