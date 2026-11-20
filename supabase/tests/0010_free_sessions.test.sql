begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
)
values
  (
    '1a000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'free-session-a@example.test', '',
    '{"display_name":"Free Session A"}', now(), now(), now()
  ),
  (
    '1a000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'free-session-b@example.test', '',
    '{"display_name":"Free Session B"}', now(), now(), now()
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '1a000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$insert into public.training_calendar_events (
      id, user_id, scheduled_on, event_type, title
    ) values (
      '2a000000-0000-4000-8000-000000000001', auth.uid(),
      current_date, 'free_session', 'Trabajo libre'
    )$$,
  'se puede planificar una sesión libre'
);

select lives_ok(
  $$insert into public.workout_sessions (
      id, user_id, assignment_id, routine_day_id, notes
    ) values (
      '3a000000-0000-4000-8000-000000000001', auth.uid(), null, null, 'Trabajo libre'
    )$$,
  'una sesión libre no necesita asignación ni día de rutina'
);

select lives_ok(
  $$insert into public.performed_sets (
      id, session_id, exercise_id, prescription_id, order_index,
      planned_load_kg, planned_repetitions, load_kg, repetitions, result
    ) values (
      '4a000000-0000-4000-8000-000000000001',
      '3a000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000005', null, 1,
      80, 3, 80, 3, 'success'
    )$$,
  'las series libres no necesitan prescripción'
);

select lives_ok(
  $$update public.training_calendar_events
    set workout_session_id = '3a000000-0000-4000-8000-000000000001'
    where id = '2a000000-0000-4000-8000-000000000001'$$,
  'el propietario puede enlazar su sesión libre al calendario'
);

select is(
  (select workout_session_id from public.training_calendar_events where id = '2a000000-0000-4000-8000-000000000001'),
  '3a000000-0000-4000-8000-000000000001'::uuid,
  'el enlace con la sesión queda persistido'
);

select set_config('request.jwt.claim.sub', '1a000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.training_calendar_events),
  0::bigint,
  'otro atleta no puede leer la sesión libre planificada'
);

insert into public.workout_sessions (id, user_id, notes)
values ('3a000000-0000-4000-8000-000000000002', auth.uid(), 'Sesión ajena');

select set_config('request.jwt.claim.sub', '1a000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$update public.training_calendar_events
    set workout_session_id = '3a000000-0000-4000-8000-000000000002'
    where id = '2a000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'el propietario no puede enlazar una sesión ajena'
);

select lives_ok(
  $$update public.workout_sessions
    set status = 'completed', finished_at = now()
    where id = '3a000000-0000-4000-8000-000000000001'$$,
  'la sesión libre se puede completar'
);

select is(
  (select status from public.training_calendar_events where id = '2a000000-0000-4000-8000-000000000001'),
  'completed',
  'completar la sesión completa automáticamente el evento'
);

select is(
  (select notes from public.workout_sessions where id = '3a000000-0000-4000-8000-000000000001'),
  'Trabajo libre',
  'el título se conserva para el historial'
);

select * from finish();
rollback;
