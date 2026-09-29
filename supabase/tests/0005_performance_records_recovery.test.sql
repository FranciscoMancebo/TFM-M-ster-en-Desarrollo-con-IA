begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
)
values
  (
    '14000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'performance-a@example.test', '',
    '{"display_name":"Atleta Rendimiento A"}', now(), now(), now()
  ),
  (
    '14000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'performance-b@example.test', '',
    '{"display_name":"Atleta Rendimiento B"}', now(), now(), now()
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '14000000-0000-4000-8000-000000000001', true);

insert into public.workout_sessions (id, user_id)
values ('24000000-0000-4000-8000-000000000001', auth.uid());

insert into public.performed_sets (
  session_id, exercise_id, order_index, planned_load_kg, planned_repetitions,
  load_kg, repetitions, rpe, result
)
values
  (
    '24000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000005',
    1, 95, 3, 100, 3, 8, 'success'
  ),
  (
    '24000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    2, 85, 3, 90, 3, 8.5, 'success'
  ),
  (
    '24000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000005',
    3, 105, 1, 120, 1, 10, 'miss'
  );

select is(
  (select count(*) from public.finish_workout_session_v2(
    '24000000-0000-4000-8000-000000000001', 2, 7, 'good', 'Sesión sólida'
  )),
  2::bigint,
  'detecta récords separados para el movimiento principal y su variante'
);

select is(
  (select count(*) from public.exercise_records where status = 'pending'),
  2::bigint,
  'las marcas quedan pendientes cuando el usuario pide confirmación'
);

select is(
  (select status from public.workout_sessions where id = '24000000-0000-4000-8000-000000000001'),
  'completed',
  'la sesión queda completada'
);

select is(
  (select concat_ws('|', pain_level, fatigue_level, overall_feeling, feedback_notes)
   from public.workout_sessions where id = '24000000-0000-4000-8000-000000000001'),
  '2|7|good|Sesión sólida',
  'guarda dolor, fatiga, sensación general y notas'
);

select is(
  (select concat_ws('|', planned_load_kg, planned_repetitions, load_kg, repetitions, rpe)
   from public.performed_sets
   where session_id = '24000000-0000-4000-8000-000000000001' and order_index = 1),
  '95.00|3|100.00|3|8.0',
  'conserva carga planificada, carga realizada y RPE de la serie'
);

select is(
  (select estimated_1rm_kg from public.exercise_records
   where exercise_id = '00000000-0000-4000-8000-000000000005'),
  110.00::numeric,
  'estima el 1RM de una marca de tres repeticiones con Epley'
);

select ok(
  (select result.is_variant and result.canonical_lift is null
   from public.finish_workout_session_v2(
     '24000000-0000-4000-8000-000000000001', 2, 7, 'good', 'Sesión sólida'
   ) result
   where result.exercise_slug = 'sentadilla-pausa'),
  'la variante se identifica sin mezclarla con el movimiento canónico'
);

select is_empty(
  $$select id from public.lift_records where user_id = auth.uid()$$,
  'una marca pendiente todavía no modifica las marcas de referencia'
);

select is(
  public.resolve_exercise_record(
    (select id from public.exercise_records
     where exercise_id = '00000000-0000-4000-8000-000000000005'),
    true
  ),
  'confirmed',
  'el usuario puede confirmar una marca detectada'
);

select is_empty(
  $$select id from public.lift_records where user_id = auth.uid()$$,
  'un 3RM confirmado no sustituye al 1RM canónico de referencia'
);

select is(
  public.resolve_exercise_record(
    (select id from public.exercise_records
     where exercise_id = '50000000-0000-4000-8000-000000000001'),
    true
  ),
  'confirmed',
  'también puede confirmar el récord de una variante'
);

select is(
  (select count(distinct exercise_id) from public.exercise_records where status = 'confirmed'),
  2::bigint,
  'los récords confirmados permanecen separados por ejercicio'
);

update public.profiles
set confirm_detected_records = false
where user_id = auth.uid();

insert into public.workout_sessions (id, user_id)
values ('24000000-0000-4000-8000-000000000002', auth.uid());

insert into public.performed_sets (
  session_id, exercise_id, order_index, planned_load_kg, planned_repetitions,
  load_kg, repetitions, rpe, result
)
values
  (
    '24000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000005',
    1, 100, 1, 105, 1, 9, 'success'
  ),
  (
    '24000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000005',
    2, 110, 1, 130, 1, 10, 'miss'
  );

select is(
  (select concat_ws('|', result.record_status, result.repetitions, result.weight_kg)
   from public.finish_workout_session_v2(
     '24000000-0000-4000-8000-000000000002', 1, 5, 'excellent', null
   ) result),
  'confirmed|1|105.00',
  'la confirmación puede desactivarse y los intentos fallidos no cuentan'
);

select is(
  (select weight_kg from public.lift_records
   where user_id = auth.uid() and lift = 'back_squat' and achieved_on = current_date),
  105.00::numeric,
  'un 1RM canónico confirmado actualiza la marca usada por las rutinas'
);

select set_config('request.jwt.claim.sub', '14000000-0000-4000-8000-000000000002', true);

select is_empty(
  $$select id from public.exercise_records$$,
  'RLS impide que otro usuario vea los récords privados'
);

select * from finish();
rollback;
