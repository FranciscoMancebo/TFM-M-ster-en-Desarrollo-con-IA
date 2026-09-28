begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
)
values
  (
    '13000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'calendar-a@example.test', '',
    '{"display_name":"Atleta Calendario A"}', now(), now(), now()
  ),
  (
    '13000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'calendar-b@example.test', '',
    '{"display_name":"Atleta Calendario B"}', now(), now(), now()
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '13000000-0000-4000-8000-000000000001', true);

insert into public.routines (id, owner_id, status)
values ('23000000-0000-4000-8000-000000000001', auth.uid(), 'active');

insert into public.routine_versions (
  id, routine_id, version_number, title, level, objective,
  weeks, days_per_week, visibility
)
values (
  '33000000-0000-4000-8000-000000000001',
  '23000000-0000-4000-8000-000000000001',
  1, 'Rutina de calendario', 'beginner', 'technique', 4, 3, 'private'
);

insert into public.routine_days (id, routine_version_id, week_number, day_index, name)
values (
  '43000000-0000-4000-8000-000000000001',
  '33000000-0000-4000-8000-000000000001',
  1, 1, 'Técnica de arrancada'
);

insert into public.routine_assignments (id, user_id, routine_version_id, starts_on, status)
values (
  '53000000-0000-4000-8000-000000000001', auth.uid(),
  '33000000-0000-4000-8000-000000000001', current_date, 'active'
);

select lives_ok(
  $$insert into public.training_calendar_events (
      id, user_id, scheduled_on, event_type, title
    ) values (
      '63000000-0000-4000-8000-000000000001', auth.uid(),
      current_date + 1, 'rest', 'Descanso activo'
    )$$,
  'se puede planificar un descanso'
);

select is(
  (select count(*) from public.training_calendar_events),
  1::bigint,
  'el propietario ve su planificación'
);

select set_config('request.jwt.claim.sub', '13000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.training_calendar_events),
  0::bigint,
  'otro usuario no puede leer el calendario'
);

select throws_ok(
  $$insert into public.training_calendar_events (
      user_id, scheduled_on, event_type, title, routine_day_id
    ) values (
      auth.uid(), current_date, 'workout', 'Rutina ajena',
      '43000000-0000-4000-8000-000000000001'
    )$$,
  '42501', null,
  'otro usuario no puede programar un día de rutina ajeno'
);

select set_config('request.jwt.claim.sub', '13000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$insert into public.training_calendar_events (
      id, user_id, scheduled_on, event_type, title, routine_assignment_id, routine_day_id
    ) values (
      '63000000-0000-4000-8000-000000000002', auth.uid(), current_date,
      'workout', 'Técnica de arrancada',
      '53000000-0000-4000-8000-000000000001',
      '43000000-0000-4000-8000-000000000001'
    )$$,
  'se puede asignar un día de la rutina activa a una fecha'
);

select is(
  ((public.my_adherence_summary() -> 'week' ->> 'planned')::integer),
  1,
  'el descanso no cuenta como entrenamiento planificado'
);

insert into public.workout_sessions (
  id, user_id, assignment_id, routine_day_id
)
values (
  '73000000-0000-4000-8000-000000000001', auth.uid(),
  '53000000-0000-4000-8000-000000000001',
  '43000000-0000-4000-8000-000000000001'
);

select is(
  public.link_workout_session_to_calendar(
    '73000000-0000-4000-8000-000000000001',
    '43000000-0000-4000-8000-000000000001'
  ),
  '63000000-0000-4000-8000-000000000002'::uuid,
  'la sesión iniciada se enlaza al evento de hoy'
);

select lives_ok(
  $$update public.workout_sessions
    set status = 'completed', finished_at = now()
    where id = '73000000-0000-4000-8000-000000000001'$$,
  'la sesión se puede completar'
);

select is(
  (select status from public.training_calendar_events
    where id = '63000000-0000-4000-8000-000000000002'),
  'completed',
  'completar la sesión completa el día del calendario'
);

select is(
  ((public.my_adherence_summary() -> 'week' ->> 'percentage')::integer),
  100,
  'la adherencia semanal se calcula sobre los entrenamientos vencidos'
);

select is(
  ((public.my_adherence_summary() ->> 'currentStreak')::integer),
  1,
  'la primera sesión completada inicia la racha'
);

insert into public.training_calendar_events (
  id, user_id, scheduled_on, event_type, title
)
values (
  '63000000-0000-4000-8000-000000000003', auth.uid(),
  current_date + 2, 'competition', 'Control técnico'
);

update public.training_calendar_events
set rescheduled_from = scheduled_on,
    scheduled_on = current_date + 3
where id = '63000000-0000-4000-8000-000000000003';

select is(
  (select rescheduled_from from public.training_calendar_events
    where id = '63000000-0000-4000-8000-000000000003'),
  current_date + 2,
  'la reprogramación conserva la fecha de origen'
);

select * from finish();
rollback;
