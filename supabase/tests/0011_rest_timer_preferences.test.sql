begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
)
values
  (
    '1b000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'rest-timer-a@example.test', '',
    '{"display_name":"Rest Timer A"}', now(), now(), now()
  ),
  (
    '1b000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'rest-timer-b@example.test', '',
    '{"display_name":"Rest Timer B"}', now(), now(), now()
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '1b000000-0000-4000-8000-000000000001', true);

select ok(
  (select rest_timer_enabled from public.profiles where user_id = auth.uid()),
  'el temporizador queda activado por defecto'
);

select is(
  (select rest_timer_default_seconds from public.profiles where user_id = auth.uid()),
  120,
  'la duración de respaldo es de 120 segundos'
);

select ok(
  (select rest_timer_sound from public.profiles where user_id = auth.uid()),
  'el aviso sonoro queda activado por defecto'
);

select ok(
  (select rest_timer_vibration from public.profiles where user_id = auth.uid()),
  'la vibración queda activada por defecto'
);

select lives_ok(
  $$update public.profiles
    set rest_timer_default_seconds = 180,
        rest_timer_sound = false,
        rest_timer_vibration = false
    where user_id = auth.uid()$$,
  'el propietario puede actualizar sus preferencias'
);

select throws_ok(
  $$update public.profiles
    set rest_timer_default_seconds = 10
    where user_id = auth.uid()$$,
  '23514', null,
  'la duración no puede quedar fuera del intervalo permitido'
);

select set_config('request.jwt.claim.sub', '1b000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.profiles where user_id = '1b000000-0000-4000-8000-000000000001'),
  0::bigint,
  'otro atleta no puede leer las preferencias de un perfil privado'
);

select * from finish();
rollback;
