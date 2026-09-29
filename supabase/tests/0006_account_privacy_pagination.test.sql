begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
)
values
  ('16000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'account-a@example.test', '', '{"display_name":"Cuenta A"}', now(), now(), now()),
  ('16000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'account-b@example.test', '', '{"display_name":"Cuenta B"}', now(), now(), now());

insert into public.notifications (user_id, actor_id, type, event_key, created_at)
values
  ('16000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000002', 'routine_like', 'page-1', now()),
  ('16000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000002', 'routine_like', 'page-2', now() - interval '1 minute'),
  ('16000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000002', 'routine_like', 'page-3', now() - interval '2 minutes');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '16000000-0000-4000-8000-000000000001', true);

select is((public.export_my_data()->>'schemaVersion')::integer, 1, 'la exportación declara su versión de esquema');
select is(public.export_my_data()->'profile'->>'user_id', auth.uid()::text, 'la exportación pertenece únicamente al usuario autenticado');
select ok(jsonb_typeof(public.export_my_data()->'workoutSessions') = 'array', 'las sesiones se exportan en formato estructurado');
select ok(not (public.export_my_data()->'account' ? 'encrypted_password'), 'la exportación nunca incluye credenciales internas');

select is((select count(*) from public.community_routines_page(3, 0, null, null)), 3::bigint, 'la comunidad respeta el tamaño de página');
select is_empty(
  $$select first_page.routine_version_id
    from public.community_routines_page(3, 0, null, null) first_page
    join public.community_routines_page(3, 3, null, null) second_page using (routine_version_id)$$,
  'las páginas consecutivas de comunidad no se solapan'
);

select is((select count(*) from public.my_notifications_page(2, 0)), 2::bigint, 'las notificaciones respetan el tamaño de página');
select is((select count(*) from public.my_notifications_page(2, 2)), 1::bigint, 'el desplazamiento devuelve la página restante');

select throws_ok(
  $$select public.delete_my_account('correo-incorrecto@example.test')$$,
  'P0001',
  'Email confirmation does not match',
  'el borrado rechaza una confirmación de correo incorrecta'
);
select lives_ok(
  $$select public.delete_my_account('account-a@example.test')$$,
  'el usuario puede eliminar definitivamente su propia cuenta'
);

select * from finish();
rollback;
