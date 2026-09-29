begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
)
values
  ('17000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reward-a@example.test', '', '{"display_name":"Reward A"}', now(), now(), now()),
  ('17000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reward-b@example.test', '', '{"display_name":"Reward B"}', now(), now(), now());

update public.profiles
set profile_visibility = 'public', show_media = true, show_social_links = true
where user_id = '17000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '17000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$select public.save_profile_media_item(1, 'image', 'https://cdn.example.test/lift.webp', 'Mi levantamiento', null)$$,
  'P0001',
  'Media slot requires account level 3',
  'el primer espacio multimedia permanece bloqueado antes del nivel 3'
);

reset role;
update public.athlete_progress set account_level = 3 where user_id = '17000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '17000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$select public.save_profile_media_item(1, 'image', 'https://cdn.example.test/lift.webp', 'Mi levantamiento', 'Trabajo técnico')$$,
  'el nivel 3 desbloquea el primer espacio multimedia'
);
select is((select count(*) from public.profile_media_items), 1::bigint, 'el propietario puede leer su elemento multimedia');
select lives_ok(
  $$select public.save_profile_social_link(1, 'instagram', 'https://instagram.com/reward-a')$$,
  'el nivel 3 permite configurar el primer enlace social'
);
select throws_ok(
  $$select public.save_profile_social_link(1, 'instagram', 'https://x.com/not-instagram')$$,
  'P0001',
  'Unsupported social URL',
  'la red declarada debe coincidir con el dominio'
);

select set_config('request.jwt.claim.sub', '17000000-0000-4000-8000-000000000002', true);
select is(jsonb_array_length(public.public_athlete_profile('17000000-0000-4000-8000-000000000001')->'mediaItems'), 1, 'otro atleta ve la galería habilitada');
select is(jsonb_array_length(public.public_athlete_profile('17000000-0000-4000-8000-000000000001')->'socialLinks'), 1, 'otro atleta ve los enlaces habilitados');

reset role;
update public.profiles set show_media = false, show_social_links = false where user_id = '17000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '17000000-0000-4000-8000-000000000002', true);
select is(jsonb_array_length(public.public_athlete_profile('17000000-0000-4000-8000-000000000001')->'mediaItems'), 0, 'la privacidad oculta la galería');
select is(jsonb_array_length(public.public_athlete_profile('17000000-0000-4000-8000-000000000001')->'socialLinks'), 0, 'la privacidad oculta los enlaces');

select set_config('request.jwt.claim.sub', '17000000-0000-4000-8000-000000000001', true);
select is(jsonb_array_length(public.export_my_data()->'profileMedia'), 1, 'la exportación incluye los elementos multimedia propios');
select is(jsonb_array_length(public.export_my_data()->'socialLinks'), 1, 'la exportación incluye los enlaces sociales propios');

select * from finish();
rollback;
