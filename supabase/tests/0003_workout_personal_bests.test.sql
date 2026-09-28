begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
)
values
  (
    '12000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'records-a@example.test', '',
    '{"display_name":"Atleta Marcas A"}', now(), now(), now()
  ),
  (
    '12000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'records-b@example.test', '',
    '{"display_name":"Atleta Marcas B"}', now(), now(), now()
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000001', true);

insert into public.lift_records (user_id, lift, weight_kg, achieved_on, source)
values
  (auth.uid(), 'back_squat', 110, current_date - 10, 'manual'),
  (auth.uid(), 'snatch', 80, current_date - 10, 'manual');

insert into public.workout_sessions (id, user_id)
values ('22000000-0000-4000-8000-000000000001', auth.uid());

insert into public.performed_sets (
  session_id, exercise_id, order_index, load_kg, repetitions, result
)
values
  ('22000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', 1, 115, 3, 'success'),
  ('22000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', 2, 120, 2, 'success'),
  ('22000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 3, 90, 1, 'miss'),
  ('22000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', 4, 130, 3, 'success');

select is(
  (select count(*) from public.finish_workout_session('22000000-0000-4000-8000-000000000001')),
  1::bigint,
  'solo se detecta la mejor serie completada de un movimiento canónico'
);

select is(
  (select weight_kg from public.lift_records where user_id = auth.uid() and lift = 'back_squat' and achieved_on = current_date),
  120::numeric,
  'la nueva marca usa la serie completada más pesada'
);

select is(
  (select source from public.lift_records where user_id = auth.uid() and lift = 'back_squat' and achieved_on = current_date),
  'workout',
  'la marca queda identificada como procedente de un entrenamiento'
);

select is(
  (select status from public.workout_sessions where id = '22000000-0000-4000-8000-000000000001'),
  'completed',
  'la sesión se completa en la misma operación'
);

select is_empty(
  $$select id from public.lift_records
    where user_id = auth.uid() and lift = 'snatch' and achieved_on = current_date$$,
  'un intento fallido no genera una nueva marca'
);

select is(
  (select count(*) from public.finish_workout_session('22000000-0000-4000-8000-000000000001')),
  0::bigint,
  'repetir la finalización no duplica marcas'
);

insert into public.workout_sessions (id, user_id)
values ('22000000-0000-4000-8000-000000000002', auth.uid());

insert into public.performed_sets (
  session_id, exercise_id, order_index, load_kg, repetitions, result
)
values
  ('22000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005', 1, 119, 1, 'success'),
  ('22000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 2, 85, 1, 'success');

select is(
  (select string_agg(result.lift, ',') from public.finish_workout_session('22000000-0000-4000-8000-000000000002') result),
  'snatch',
  'solo devuelve el movimiento que supera su mejor marca histórica'
);

select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$select public.finish_workout_session('22000000-0000-4000-8000-000000000002')$$,
  'P0001',
  null,
  'otro usuario no puede finalizar ni leer las marcas de la sesión'
);

select * from finish();
rollback;
