begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
)
values
  (
    '11000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'social-a@example.test', '',
    '{"display_name":"Atleta Social A"}', now(), now(), now()
  ),
  (
    '11000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'social-b@example.test', '',
    '{"display_name":"Atleta Social B"}', now(), now(), now()
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);

update public.profiles
set display_name = 'Atleta Social A',
    weight_kg = 80,
    profile_visibility = 'public',
    show_training_data = false,
    show_progress = false,
    show_public_routines = true
where user_id = auth.uid();

select lives_ok(
  $$insert into public.routines (id, owner_id)
    values ('21000000-0000-4000-8000-000000000001', auth.uid())$$,
  'el autor puede crear una rutina social'
);

select lives_ok(
  $$insert into public.routine_versions (
      id, routine_id, version_number, title, level, objective,
      weeks, days_per_week, visibility, published_at
    ) values (
      '31000000-0000-4000-8000-000000000001',
      '21000000-0000-4000-8000-000000000001',
      1, 'Rutina social', 'beginner', 'technique',
      4, 3, 'public', now()
    )$$,
  'el autor puede publicar una versión válida'
);

select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$insert into public.routine_likes (routine_version_id, user_id)
    values ('31000000-0000-4000-8000-000000000001', auth.uid())$$,
  'otro usuario puede dar like a una rutina pública'
);

select throws_ok(
  $$insert into public.routine_likes (routine_version_id, user_id)
    values ('31000000-0000-4000-8000-000000000001', auth.uid())$$,
  '23505',
  null,
  'un usuario no puede duplicar su like'
);

select lives_ok(
  $$insert into public.routine_questions (id, routine_version_id, author_id, body)
    values (
      '51000000-0000-4000-8000-000000000001',
      '31000000-0000-4000-8000-000000000001',
      auth.uid(),
      '¿Cómo progresarías las cargas?'
    )$$,
  'otro usuario puede preguntar sobre una rutina pública'
);

select is_empty(
  $$select user_id from public.profiles
    where user_id = '11000000-0000-4000-8000-000000000001'$$,
  'las filas completas de perfil siguen siendo privadas'
);

select is(
  public.public_athlete_profile('11000000-0000-4000-8000-000000000001'::uuid)->>'displayName',
  'Atleta Social A',
  'el perfil público expone el nombre mediante la RPC segura'
);

select is(
  public.public_athlete_profile('11000000-0000-4000-8000-000000000001'::uuid)->>'weightKg',
  null,
  'un dato de entrenamiento oculto no se filtra en el perfil público'
);

select is_empty(
  $$select id from public.notifications
    where user_id = '11000000-0000-4000-8000-000000000001'$$,
  'el actor no puede leer las notificaciones del autor'
);

select throws_ok(
  $$select public.answer_routine_question(
      '51000000-0000-4000-8000-000000000001'::uuid,
      'Respuesta no autorizada'
    )$$,
  'P0001',
  null,
  'solo el dueño de la rutina puede responder'
);

select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::integer from public.notifications where user_id = auth.uid()),
  2,
  'el autor recibe una notificación por like y otra por pregunta'
);

select lives_ok(
  $$select public.answer_routine_question(
      '51000000-0000-4000-8000-000000000001'::uuid,
      'Sube la carga solo cuando la técnica sea estable.'
    )$$,
  'el dueño de la rutina puede responder la pregunta'
);

select lives_ok(
  $$select public.mark_notifications_read()$$,
  'el usuario puede marcar sus notificaciones como leídas'
);

select is(
  (select count(*)::integer from public.notifications where user_id = auth.uid() and read_at is null),
  0,
  'no quedan notificaciones sin leer después de marcarlas'
);

select is(
  (
    select count(*)::integer
    from public.experience_events
    where user_id = auth.uid()
      and event_type in ('routine_published', 'like_received', 'question_received')
  ),
  3,
  'cada evento social concede experiencia una sola vez'
);

select is(
  (
    select count(*)::integer
    from public.user_achievements
    where user_id = auth.uid()
      and achievement_code in ('first_public_routine', 'first_like', 'first_question')
  ),
  3,
  'los primeros hitos sociales se desbloquean'
);

select cmp_ok(
  (public.my_gamification()->>'totalXp')::integer,
  '>=',
  350,
  'la experiencia acumulada incluye acciones e hitos sociales'
);

select * from finish();
rollback;
