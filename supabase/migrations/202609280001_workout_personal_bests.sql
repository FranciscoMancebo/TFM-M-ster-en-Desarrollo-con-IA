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
    select
      mapped.lift,
      max(ps.load_kg)::numeric as best_weight_kg
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
    select
      candidate.lift,
      candidate.best_weight_kg,
      previous.best_weight_kg as previous_weight_kg
    from candidates candidate
    left join lateral (
      select max(lr.weight_kg)::numeric as best_weight_kg
      from public.lift_records lr
      where lr.user_id = session_owner
        and lr.lift = candidate.lift
    ) previous on true
    where previous.best_weight_kg is null
       or candidate.best_weight_kg > previous.best_weight_kg
  ),
  saved as (
    insert into public.lift_records as saved_record (
      user_id,
      lift,
      weight_kg,
      achieved_on,
      source
    )
    select
      session_owner,
      new_best.lift,
      new_best.best_weight_kg,
      record_date,
      'workout'
    from new_bests new_best
    on conflict (user_id, lift, achieved_on) do update
    set weight_kg = excluded.weight_kg,
        source = 'workout',
        updated_at = now()
    where excluded.weight_kg > saved_record.weight_kg
    returning saved_record.lift, saved_record.weight_kg, saved_record.achieved_on
  )
  select
    saved.lift,
    saved.weight_kg,
    new_best.previous_weight_kg,
    saved.achieved_on
  from saved
  join new_bests new_best on new_best.lift = saved.lift
  order by saved.lift;
end;
$$;

revoke all on function public.finish_workout_session(uuid) from public;
grant execute on function public.finish_workout_session(uuid) to authenticated;

comment on function public.finish_workout_session(uuid) is
  'Atomically completes an owned workout and records all-time personal bests from successful canonical lifts.';
