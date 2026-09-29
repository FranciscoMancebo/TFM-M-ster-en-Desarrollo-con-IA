begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
)
values (
  '19000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'competition@example.test', '',
  '{"display_name":"Competition Test"}', now(), now(), now()
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '19000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$update public.profiles set birth_year = 1995, competition_sex = 'male' where user_id = auth.uid()$$,
  'el atleta puede guardar su año y categoría de competición'
);
select is(
  (select birth_year::integer from public.profiles where user_id = auth.uid()),
  1995,
  'el año de nacimiento persiste'
);
select is(
  (select competition_sex from public.profiles where user_id = auth.uid()),
  'male',
  'la categoría de competición persiste'
);
select throws_ok(
  $$update public.profiles set competition_sex = 'other' where user_id = auth.uid()$$,
  '23514',
  null,
  'la base rechaza categorías ajenas a las tablas oficiales'
);
select is(
  public.export_my_data()->'profile'->>'birth_year',
  '1995',
  'la exportación personal incluye el año de nacimiento'
);

select * from finish();
rollback;
