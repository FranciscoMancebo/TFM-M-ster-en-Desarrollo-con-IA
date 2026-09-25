begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'atleta-a@example.test', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'atleta-b@example.test', '', now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$insert into public.routines (id, owner_id) values ('20000000-0000-4000-8000-000000000001', auth.uid())$$,
  'el usuario A puede crear su rutina'
);

select lives_ok(
  $$insert into public.routine_versions (id, routine_id, version_number, title, level, objective, weeks, days_per_week)
    values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1, 'Base privada', 'intermediate', 'technique', 4, 3)$$,
  'el propietario puede crear una versión privada'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is_empty(
  $$select id from public.routines where id = '20000000-0000-4000-8000-000000000001'$$,
  'el usuario B no puede leer la rutina privada de A'
);

select is_empty(
  $$update public.routines set status = 'archived'
    where id = '20000000-0000-4000-8000-000000000001' returning id$$,
  'el usuario B no puede modificar la rutina de A'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

update public.routine_versions
set visibility = 'public', published_at = now()
where id = '30000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select results_eq(
  $$select id from public.routine_versions where id = '30000000-0000-4000-8000-000000000001'$$,
  $$values ('30000000-0000-4000-8000-000000000001'::uuid)$$,
  'otro usuario puede leer una versión publicada'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$insert into public.workout_sessions (id, user_id)
    values ('40000000-0000-4000-8000-000000000001', auth.uid())$$,
  'el usuario A puede crear su sesión'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is_empty(
  $$select id from public.workout_sessions where id = '40000000-0000-4000-8000-000000000001'$$,
  'el usuario B no puede leer la sesión de A'
);

select throws_ok(
  $$insert into public.performed_sets (session_id, exercise_id, order_index, load_kg, repetitions, result)
    values ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 1, 42, 2, 'success')$$,
  '42501',
  null,
  'el usuario B no puede añadir series a la sesión de A'
);

select * from finish();
rollback;
