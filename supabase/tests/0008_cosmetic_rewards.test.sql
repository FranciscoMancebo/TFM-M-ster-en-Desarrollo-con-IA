begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
)
values
  ('18000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cosmetic-a@example.test', '', '{"display_name":"Cosmetic A"}', now(), now(), now()),
  ('18000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cosmetic-b@example.test', '', '{"display_name":"Cosmetic B"}', now(), now(), now());

update public.profiles
set profile_visibility = 'public'
where user_id = '18000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '18000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$select public.equip_profile_reward('level_2_lime')$$,
  'P0001',
  'Profile reward is still locked',
  'una recompensa de nivel no se puede equipar antes de desbloquearla'
);
select throws_ok(
  $$select public.equip_profile_reward('community_applause_color')$$,
  'P0001',
  'Profile reward is still locked',
  'una recompensa de categoría exige su logro'
);

reset role;
update public.athlete_progress
set account_level = 10
where user_id = '18000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '18000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$select public.equip_profile_reward('level_2_lime')$$,
  'el nivel 10 puede equipar el color del nivel 2'
);
select lives_ok(
  $$select public.equip_profile_reward('level_5_steel_frame')$$,
  'el nivel 10 puede equipar el marco importante del nivel 5'
);
select lives_ok(
  $$select public.equip_profile_reward('level_10_prestige_badge')$$,
  'el nivel 10 puede equipar su insignia de prestigio'
);
select lives_ok(
  $$select public.equip_profile_reward('level_10_celebration')$$,
  'el nivel 10 puede equipar su celebración exclusiva'
);
select is(
  (select count(*)::integer from jsonb_array_elements(public.my_profile_rewards()) reward where (reward->>'unlocked')::boolean),
  10,
  'el catálogo marca como desbloqueadas las diez recompensas disponibles hasta nivel 10'
);
select is(
  (select count(*)::integer from jsonb_array_elements(public.my_profile_rewards()) reward where (reward->>'equipped')::boolean),
  4,
  'el catálogo identifica las cuatro recompensas equipadas'
);

reset role;
insert into public.user_achievements (user_id, achievement_code)
values ('18000000-0000-4000-8000-000000000001', 'ten_likes');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '18000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.equip_profile_reward('community_applause_color')$$,
  'el logro de comunidad desbloquea su recompensa de categoría'
);

select set_config('request.jwt.claim.sub', '18000000-0000-4000-8000-000000000002', true);
select is(
  jsonb_array_length(public.public_athlete_profile('18000000-0000-4000-8000-000000000001')->'profileRewards'),
  4,
  'el perfil público expone únicamente las recompensas equipadas visibles'
);

select set_config('request.jwt.claim.sub', '18000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.clear_profile_reward('color')$$,
  'el atleta puede retirar una recompensa equipada'
);
select is(
  public.export_my_data()->'rewardPreferences'->>'color_reward',
  null,
  'la exportación refleja que el color se ha retirado'
);

select * from finish();
rollback;
