-- Extend gamification with training-volume and progression milestones.
alter table public.achievement_definitions
  drop constraint if exists achievement_definitions_metric_check;

alter table public.achievement_definitions
  add constraint achievement_definitions_metric_check
  check (metric in (
    'workouts', 'lift_records', 'distinct_lifts', 'public_routines',
    'likes_received', 'questions_received', 'volume_kg',
    'successful_sets', 'personal_bests'
  ));

create or replace function private.gamification_metric(target_user_id uuid, metric_name text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  metric_value integer;
begin
  metric_value := case metric_name
    when 'workouts' then (
      select count(*)::integer
      from public.workout_sessions
      where user_id = target_user_id and status = 'completed'
    )
    when 'lift_records' then (
      select count(*)::integer
      from public.lift_records
      where user_id = target_user_id
    )
    when 'distinct_lifts' then (
      select count(distinct lift)::integer
      from public.lift_records
      where user_id = target_user_id
    )
    when 'public_routines' then (
      select count(distinct r.id)::integer
      from public.routines r
      join public.routine_versions rv on rv.routine_id = r.id
      where r.owner_id = target_user_id and rv.published_at is not null
    )
    when 'likes_received' then (
      select count(*)::integer
      from public.routine_likes rl
      join public.routine_versions rv on rv.id = rl.routine_version_id
      join public.routines r on r.id = rv.routine_id
      where r.owner_id = target_user_id and rl.user_id <> target_user_id
    )
    when 'questions_received' then (
      select count(*)::integer
      from public.routine_questions rq
      join public.routine_versions rv on rv.id = rq.routine_version_id
      join public.routines r on r.id = rv.routine_id
      where r.owner_id = target_user_id and rq.author_id <> target_user_id
    )
    when 'volume_kg' then (
      select floor(coalesce(sum(ps.load_kg * ps.repetitions), 0))::integer
      from public.workout_sessions ws
      join public.performed_sets ps on ps.session_id = ws.id
      where ws.user_id = target_user_id
        and ws.status = 'completed'
        and ps.result = 'success'
    )
    when 'successful_sets' then (
      select count(*)::integer
      from public.workout_sessions ws
      join public.performed_sets ps on ps.session_id = ws.id
      where ws.user_id = target_user_id
        and ws.status = 'completed'
        and ps.result = 'success'
    )
    when 'personal_bests' then (
      select count(*)::integer
      from (
        select
          lr.weight_kg,
          max(lr.weight_kg) over (
            partition by lr.lift
            order by lr.achieved_on, lr.created_at, lr.id
            rows between unbounded preceding and 1 preceding
          ) as previous_best
        from public.lift_records lr
        where lr.user_id = target_user_id
      ) progression
      where progression.previous_best is not null
        and progression.weight_kg > progression.previous_best
    )
    else 0
  end;
  return coalesce(metric_value, 0);
end;
$$;

insert into public.achievement_definitions (
  code, title_es, title_en, description_es, description_en,
  icon, metric, target_value, xp_reward, sort_order
)
values
  ('volume_1k', 'Primera tonelada', 'First tonne', 'Acumula 1.000 kg de volumen completado.', 'Accumulate 1,000 kg of completed volume.', 'chart', 'volume_kg', 1000, 75, 12),
  ('volume_10k', 'Cinco cifras', 'Five figures', 'Acumula 10.000 kg de volumen completado.', 'Accumulate 10,000 kg of completed volume.', 'trending', 'volume_kg', 10000, 150, 13),
  ('volume_50k', 'Cincuenta toneladas', 'Fifty tonnes', 'Acumula 50.000 kg de volumen completado.', 'Accumulate 50,000 kg of completed volume.', 'medal', 'volume_kg', 50000, 300, 14),
  ('volume_100k', 'Club de las 100 toneladas', '100-tonne club', 'Acumula 100.000 kg de volumen completado.', 'Accumulate 100,000 kg of completed volume.', 'star', 'volume_kg', 100000, 500, 15),
  ('volume_250k', 'Motor de acero', 'Engine of steel', 'Acumula 250.000 kg de volumen completado.', 'Accumulate 250,000 kg of completed volume.', 'trophy', 'volume_kg', 250000, 900, 16),
  ('sets_50', 'Cincuenta series sólidas', 'Fifty solid sets', 'Completa 50 series con éxito.', 'Complete 50 successful sets.', 'play', 'successful_sets', 50, 125, 17),
  ('sets_250', 'Trabajo acumulado', 'Work accumulated', 'Completa 250 series con éxito.', 'Complete 250 successful sets.', 'calendar', 'successful_sets', 250, 300, 18),
  ('sets_1000', 'Mil series', 'One thousand sets', 'Completa 1.000 series con éxito.', 'Complete 1,000 successful sets.', 'trophy', 'successful_sets', 1000, 750, 19),
  ('first_pb', 'Mejor que ayer', 'Better than yesterday', 'Supera por primera vez una marca anterior.', 'Beat a previous result for the first time.', 'trending', 'personal_bests', 1, 100, 20),
  ('ten_pbs', 'Diez pasos adelante', 'Ten steps forward', 'Registra 10 mejoras de marca personal.', 'Record 10 personal-best improvements.', 'medal', 'personal_bests', 10, 300, 21),
  ('twenty_five_pbs', 'Cazador de marcas', 'Personal-best hunter', 'Registra 25 mejoras de marca personal.', 'Record 25 personal-best improvements.', 'star', 'personal_bests', 25, 650, 22),
  ('fifty_workouts', 'Hábito consolidado', 'Habit formed', 'Completa 50 sesiones.', 'Complete 50 sessions.', 'flame', 'workouts', 50, 800, 23),
  ('hundred_workouts', 'Centenario', 'Centurion', 'Completa 100 sesiones.', 'Complete 100 sessions.', 'trophy', 'workouts', 100, 1500, 24),
  ('twenty_five_marks', 'Archivo de progreso', 'Progress archive', 'Registra 25 marcas con fecha.', 'Record 25 dated lift results.', 'chart', 'lift_records', 25, 350, 25),
  ('fifty_marks', 'Historial de hierro', 'Iron history', 'Registra 50 marcas con fecha.', 'Record 50 dated lift results.', 'library', 'lift_records', 50, 700, 26),
  ('five_public_routines', 'Autor habitual', 'Regular author', 'Publica 5 rutinas.', 'Publish 5 routines.', 'book', 'public_routines', 5, 450, 27),
  ('twenty_five_likes', 'Rutina destacada', 'Standout routine', 'Recibe 25 likes en tus rutinas.', 'Receive 25 likes on your routines.', 'heart', 'likes_received', 25, 500, 28),
  ('fifty_likes', 'Referente de la comunidad', 'Community reference', 'Recibe 50 likes en tus rutinas.', 'Receive 50 likes on your routines.', 'star', 'likes_received', 50, 900, 29),
  ('five_questions', 'Mesa de consulta', 'Open office', 'Recibe 5 preguntas sobre tus rutinas.', 'Receive 5 questions about your routines.', 'message', 'questions_received', 5, 250, 30),
  ('fifteen_questions', 'Mentor de la comunidad', 'Community mentor', 'Recibe 15 preguntas sobre tus rutinas.', 'Receive 15 questions about your routines.', 'message', 'questions_received', 15, 600, 31)
on conflict (code) do update set
  title_es = excluded.title_es,
  title_en = excluded.title_en,
  description_es = excluded.description_es,
  description_en = excluded.description_en,
  icon = excluded.icon,
  metric = excluded.metric,
  target_value = excluded.target_value,
  xp_reward = excluded.xp_reward,
  sort_order = excluded.sort_order;

drop trigger if exists lift_record_gamification on public.lift_records;
create trigger lift_record_gamification
after insert or update of weight_kg, achieved_on on public.lift_records
for each row execute function private.handle_lift_record_xp();

-- Six additional fictional identities. They use the reserved .invalid domain and
-- random passwords, so they cannot collide with real accounts or receive email.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'nora.vidal@haltero.invalid', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"demo":true}', '{"display_name":"Nora Vidal","demo":true}', now() - interval '14 months', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'diego.luna@haltero.invalid', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"demo":true}', '{"display_name":"Diego Luna","demo":true}', now() - interval '22 months', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'sara.campos@haltero.invalid', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"demo":true}', '{"display_name":"Sara Campos","demo":true}', now() - interval '30 months', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'hugo.martin@haltero.invalid', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"demo":true}', '{"display_name":"Hugo Martín","demo":true}', now() - interval '5 months', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'carla.navarro@haltero.invalid', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"demo":true}', '{"display_name":"Carla Navarro","demo":true}', now() - interval '18 months', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', 'bruno.vega@haltero.invalid', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"demo":true}', '{"display_name":"Bruno Vega","demo":true}', now() - interval '36 months', now(), '', '', '', '')
on conflict (id) do nothing;

delete from public.routine_assignments
where user_id in (
  '90000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000006',
  '90000000-0000-4000-8000-000000000007', '90000000-0000-4000-8000-000000000008',
  '90000000-0000-4000-8000-000000000009', '90000000-0000-4000-8000-00000000000a'
);

delete from public.routines
where owner_id in (
  '90000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000006',
  '90000000-0000-4000-8000-000000000007', '90000000-0000-4000-8000-000000000008',
  '90000000-0000-4000-8000-000000000009', '90000000-0000-4000-8000-00000000000a'
);

update public.profiles p
set
  display_name = seed.display_name,
  bio = seed.bio,
  level = seed.level,
  goals = seed.goals,
  training_days_per_week = seed.training_days,
  height_cm = seed.height_cm,
  weight_kg = seed.weight_kg,
  onboarding_completed = true,
  weightlifting_experience = seed.experience,
  profile_visibility = 'public',
  preferred_language = 'es',
  show_training_data = true,
  show_progress = true,
  show_public_routines = true
from (values
  ('90000000-0000-4000-8000-000000000005'::uuid, 'Nora Vidal', 'Técnica paciente, repeticiones limpias y progresiones desde el hang.', 'beginner', array['technique','mobility']::text[], 3::smallint, 162::numeric, 59::numeric, 'under_6_months'),
  ('90000000-0000-4000-8000-000000000006'::uuid, 'Diego Luna', 'Construyo fuerza útil sin perder velocidad bajo la barra.', 'intermediate', array['strength','technique']::text[], 4::smallint, 178::numeric, 82::numeric, 'six_to_twenty_four_months'),
  ('90000000-0000-4000-8000-000000000007'::uuid, 'Sara Campos', 'Preparación de competición, selección de intentos y consistencia.', 'advanced', array['competition','strength']::text[], 5::smallint, 168::numeric, 71::numeric, 'over_two_years'),
  ('90000000-0000-4000-8000-000000000008'::uuid, 'Hugo Martín', 'Aprendiendo desde cero con movilidad y posiciones seguras.', 'starter', array['mobility','technique']::text[], 2::smallint, 184::numeric, 91::numeric, 'never'),
  ('90000000-0000-4000-8000-000000000009'::uuid, 'Carla Navarro', 'Arrancada, trabajo overhead y mucha atención a la recepción.', 'intermediate', array['technique','mobility']::text[], 3::smallint, 160::numeric, 57::numeric, 'six_to_twenty_four_months'),
  ('90000000-0000-4000-8000-00000000000a'::uuid, 'Bruno Vega', 'Fuerza específica y ciclos intensos orientados al total olímpico.', 'advanced', array['strength','competition']::text[], 5::smallint, 186::numeric, 102::numeric, 'over_two_years')
) as seed(user_id, display_name, bio, level, goals, training_days, height_cm, weight_kg, experience)
where p.user_id = seed.user_id;

-- Four dated reference points per lift for every fictional athlete. This creates a
-- dense but readable progression instead of a single current value.
with athlete_marks(user_id, back_squat, snatch, front_squat, clean_and_jerk) as (
  values
    ('90000000-0000-4000-8000-000000000001'::uuid, 82::numeric, 45::numeric, 70::numeric, 60::numeric),
    ('90000000-0000-4000-8000-000000000002'::uuid, 155::numeric, 92::numeric, 132::numeric, 118::numeric),
    ('90000000-0000-4000-8000-000000000003'::uuid, 62::numeric, 30::numeric, 52::numeric, 40::numeric),
    ('90000000-0000-4000-8000-000000000004'::uuid, 42::numeric, 20::numeric, 35::numeric, 28::numeric),
    ('90000000-0000-4000-8000-000000000005'::uuid, 65::numeric, 32::numeric, 55::numeric, 44::numeric),
    ('90000000-0000-4000-8000-000000000006'::uuid, 110::numeric, 60::numeric, 95::numeric, 75::numeric),
    ('90000000-0000-4000-8000-000000000007'::uuid, 130::numeric, 78::numeric, 112::numeric, 98::numeric),
    ('90000000-0000-4000-8000-000000000008'::uuid, 35::numeric, 15::numeric, 30::numeric, 22::numeric),
    ('90000000-0000-4000-8000-000000000009'::uuid, 85::numeric, 48::numeric, 72::numeric, 62::numeric),
    ('90000000-0000-4000-8000-00000000000a'::uuid, 165::numeric, 96::numeric, 142::numeric, 122::numeric)
), progression(days_ago, multiplier) as (
  values (300, 1.00::numeric), (210, 1.05::numeric), (120, 1.10::numeric), (30, 1.15::numeric)
)
insert into public.lift_records (user_id, lift, weight_kg, achieved_on, source)
select
  athlete.user_id,
  movement.lift,
  round(movement.base_weight * progression.multiplier),
  current_date - progression.days_ago,
  'manual'
from athlete_marks athlete
cross join lateral (values
  ('back_squat', athlete.back_squat),
  ('snatch', athlete.snatch),
  ('front_squat', athlete.front_squat),
  ('clean_and_jerk', athlete.clean_and_jerk)
) as movement(lift, base_weight)
cross join progression
on conflict (user_id, lift, achieved_on) do update
set weight_kg = excluded.weight_kg,
    source = excluded.source;

-- Twelve new public routines: two for every added athlete and all four focuses.
do $$
declare
  routine_seed record;
  day_item jsonb;
  saved_day_id uuid;
  day_number integer;
begin
  for routine_seed in
    select * from (values
      ('91000000-0000-4000-8000-000000000009'::uuid, '92000000-0000-4000-8000-000000000009'::uuid, '90000000-0000-4000-8000-000000000005'::uuid, 'Arrancada desde el hang', 'Tres días para mejorar extensión, cercanía y recepción desde posiciones controladas.', 'beginner', 'technique', 5::smallint, 3::smallint, 18, '[{"name":"Hang alto","exercises":[{"slug":"tall-snatch","sets":5,"reps":3,"type":"load","value":20,"rest":75},{"slug":"arrancada-desde-hang","sets":5,"reps":3,"type":"percentage","value":58,"rest":120},{"slug":"sentadilla-overhead","sets":4,"reps":4,"type":"percentage","value":52,"rest":120}]},{"name":"Pausa y trayectoria","exercises":[{"slug":"arrancada-pausa-hang","sets":5,"reps":3,"type":"percentage","value":60,"rest":120},{"slug":"tiron-arrancada-pausa","sets":4,"reps":3,"type":"percentage","value":85,"rest":150},{"slug":"sentadilla-pausa","sets":4,"reps":4,"type":"percentage","value":65,"rest":150}]},{"name":"Movimiento completo","exercises":[{"slug":"arrancada","sets":6,"reps":2,"type":"percentage","value":68,"rest":150},{"slug":"arrancada-sin-pies","sets":4,"reps":3,"type":"percentage","value":55,"rest":120},{"slug":"sentadilla","sets":4,"reps":5,"type":"percentage","value":70,"rest":180}]}]'::jsonb),
      ('91000000-0000-4000-8000-000000000010', '92000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000005', 'Movilidad de recepción', 'Dos sesiones para ganar profundidad, estabilidad overhead y comodidad en el rack.', 'beginner', 'mobility', 4, 2, 17, '[{"name":"Recepción de arrancada","exercises":[{"slug":"movilidad-tobillo-pared","sets":3,"reps":10,"type":"load","value":0,"rest":30},{"slug":"extension-toracica","sets":3,"reps":8,"type":"load","value":0,"rest":30},{"slug":"press-sots","sets":4,"reps":5,"type":"load","value":15,"rest":75}]},{"name":"Rack y cadera","exercises":[{"slug":"movilidad-rack-frontal","sets":3,"reps":10,"type":"load","value":0,"rest":30},{"slug":"cadera-90-90","sets":3,"reps":8,"type":"load","value":0,"rest":30},{"slug":"sentadilla-frontal-pausa","sets":4,"reps":4,"type":"percentage","value":55,"rest":120}]}]'),
      ('91000000-0000-4000-8000-000000000011', '92000000-0000-4000-8000-000000000011', '90000000-0000-4000-8000-000000000006', 'Piernas y tirones 4 días', 'Bloque intermedio con volumen de sentadilla, tirones y fuerza de posición.', 'intermediate', 'strength', 8, 4, 16, '[{"name":"Sentadilla volumen","exercises":[{"slug":"sentadilla","sets":5,"reps":5,"type":"percentage","value":72,"rest":180},{"slug":"sentadilla-tempo","sets":4,"reps":4,"type":"percentage","value":62,"rest":150},{"slug":"peso-muerto-rumano","sets":4,"reps":6,"type":"load","value":70,"rest":150}]},{"name":"Tirón de arrancada","exercises":[{"slug":"tiron-arrancada","sets":5,"reps":3,"type":"percentage","value":95,"rest":180},{"slug":"arrancada-potencia","sets":5,"reps":3,"type":"percentage","value":68,"rest":150},{"slug":"remo-con-barra","sets":4,"reps":8,"type":"load","value":55,"rest":120}]},{"name":"Sentadilla frontal","exercises":[{"slug":"sentadilla-frontal","sets":5,"reps":4,"type":"percentage","value":75,"rest":180},{"slug":"sentadilla-frontal-pausa","sets":4,"reps":3,"type":"percentage","value":68,"rest":180},{"slug":"press-estricto","sets":4,"reps":6,"type":"load","value":35,"rest":120}]},{"name":"Tirón de cargada","exercises":[{"slug":"tiron-cargada","sets":5,"reps":3,"type":"percentage","value":100,"rest":180},{"slug":"cargada-potencia","sets":5,"reps":3,"type":"percentage","value":70,"rest":150},{"slug":"push-press","sets":4,"reps":5,"type":"percentage","value":58,"rest":120}]}]'),
      ('91000000-0000-4000-8000-000000000012', '92000000-0000-4000-8000-000000000012', '90000000-0000-4000-8000-000000000006', 'Complejos de cargada', 'Tres días de complejos para conectar tirón, recepción y jerk.', 'intermediate', 'technique', 6, 3, 15, '[{"name":"Cargada desde posiciones","exercises":[{"slug":"cargada-tres-posiciones","sets":5,"reps":2,"type":"percentage","value":65,"rest":180},{"slug":"cargada-pausa-rodilla","sets":4,"reps":3,"type":"percentage","value":62,"rest":150},{"slug":"sentadilla-frontal","sets":4,"reps":4,"type":"percentage","value":72,"rest":180}]},{"name":"Jerk estable","exercises":[{"slug":"jerk-pausa-dip","sets":5,"reps":3,"type":"percentage","value":65,"rest":150},{"slug":"tall-jerk","sets":4,"reps":4,"type":"load","value":30,"rest":90},{"slug":"jerk-desde-rack","sets":5,"reps":2,"type":"percentage","value":72,"rest":180}]},{"name":"Complejo completo","exercises":[{"slug":"complejo-cargada-jerk","sets":5,"reps":2,"type":"percentage","value":68,"rest":210},{"slug":"dos-tiempos","sets":5,"reps":2,"type":"percentage","value":72,"rest":210},{"slug":"tiron-cargada-pausa","sets":4,"reps":3,"type":"percentage","value":95,"rest":180}]}]'),
      ('91000000-0000-4000-8000-000000000013', '92000000-0000-4000-8000-000000000013', '90000000-0000-4000-8000-000000000007', 'Precompetición 4 semanas', 'Ciclo corto para afinar singles, descansos y selección de intentos.', 'advanced', 'competition', 4, 4, 14, '[{"name":"Arrancada pesada","exercises":[{"slug":"arrancada","sets":6,"reps":1,"type":"percentage","value":86,"rest":240},{"slug":"arrancada-pausa-rodilla","sets":4,"reps":2,"type":"percentage","value":75,"rest":180},{"slug":"tiron-arrancada","sets":4,"reps":2,"type":"percentage","value":100,"rest":210}]},{"name":"Dos tiempos pesado","exercises":[{"slug":"dos-tiempos","sets":6,"reps":1,"type":"percentage","value":86,"rest":240},{"slug":"jerk-desde-rack","sets":4,"reps":2,"type":"percentage","value":80,"rest":210},{"slug":"tiron-cargada","sets":4,"reps":2,"type":"percentage","value":105,"rest":210}]},{"name":"Fuerza mínima efectiva","exercises":[{"slug":"sentadilla","sets":4,"reps":3,"type":"percentage","value":82,"rest":240},{"slug":"sentadilla-frontal","sets":4,"reps":2,"type":"percentage","value":85,"rest":240},{"slug":"press-estricto","sets":3,"reps":4,"type":"load","value":45,"rest":150}]},{"name":"Simulación de tarima","exercises":[{"slug":"arrancada","sets":3,"reps":1,"type":"percentage","value":92,"rest":300},{"slug":"dos-tiempos","sets":3,"reps":1,"type":"percentage","value":92,"rest":300},{"slug":"sentadilla-frontal","sets":3,"reps":2,"type":"percentage","value":78,"rest":210}]}]'),
      ('91000000-0000-4000-8000-000000000014', '92000000-0000-4000-8000-000000000014', '90000000-0000-4000-8000-000000000007', 'Potencia avanzada', 'Velocidad con cargas medias y variantes desde bloques para atletas avanzados.', 'advanced', 'strength', 6, 4, 13, '[{"name":"Potencia de arrancada","exercises":[{"slug":"arrancada-potencia","sets":6,"reps":2,"type":"percentage","value":75,"rest":180},{"slug":"arrancada-desde-bloques","sets":5,"reps":2,"type":"percentage","value":80,"rest":180},{"slug":"sentadilla-overhead","sets":4,"reps":3,"type":"percentage","value":70,"rest":150}]},{"name":"Potencia de cargada","exercises":[{"slug":"cargada-potencia","sets":6,"reps":2,"type":"percentage","value":78,"rest":180},{"slug":"cargada-desde-bloques","sets":5,"reps":2,"type":"percentage","value":82,"rest":180},{"slug":"sentadilla-frontal","sets":5,"reps":3,"type":"percentage","value":82,"rest":210}]},{"name":"Fuerza rápida","exercises":[{"slug":"sentadilla","sets":8,"reps":2,"type":"percentage","value":68,"rest":120},{"slug":"push-press","sets":5,"reps":3,"type":"percentage","value":70,"rest":150},{"slug":"tiron-arrancada-pausa","sets":4,"reps":3,"type":"percentage","value":100,"rest":180}]},{"name":"Jerk y total","exercises":[{"slug":"power-jerk","sets":5,"reps":2,"type":"percentage","value":78,"rest":180},{"slug":"jerk-tras-nuca","sets":5,"reps":2,"type":"percentage","value":82,"rest":180},{"slug":"dos-tiempos","sets":4,"reps":1,"type":"percentage","value":85,"rest":240}]}]'),
      ('91000000-0000-4000-8000-000000000015', '92000000-0000-4000-8000-000000000015', '90000000-0000-4000-8000-000000000008', 'Fundamentos con barra', 'Dos días para aprender posiciones sin perseguir porcentajes ni marcas.', 'starter', 'technique', 4, 2, 12, '[{"name":"Aprender la arrancada","exercises":[{"slug":"arrancada-muscular","sets":4,"reps":5,"type":"load","value":15,"rest":75},{"slug":"arrancada-desde-hang","sets":5,"reps":3,"type":"load","value":15,"rest":90},{"slug":"sentadilla-overhead","sets":4,"reps":5,"type":"load","value":15,"rest":90}]},{"name":"Aprender la cargada","exercises":[{"slug":"tall-clean","sets":4,"reps":4,"type":"load","value":20,"rest":75},{"slug":"cargada-desde-hang","sets":5,"reps":3,"type":"load","value":20,"rest":90},{"slug":"press-estricto","sets":4,"reps":5,"type":"load","value":15,"rest":90}]}]'),
      ('91000000-0000-4000-8000-000000000016', '92000000-0000-4000-8000-000000000016', '90000000-0000-4000-8000-000000000008', 'Movilidad diaria del halterófilo', 'Tres sesiones cortas para tobillo, cadera, rack y posición overhead.', 'starter', 'mobility', 3, 3, 11, '[{"name":"Tobillo y sentadilla","exercises":[{"slug":"movilidad-tobillo-pared","sets":3,"reps":10,"type":"load","value":0,"rest":30},{"slug":"squat-to-stand","sets":3,"reps":8,"type":"load","value":0,"rest":30},{"slug":"prying-squat","sets":3,"reps":6,"type":"load","value":0,"rest":45}]},{"name":"Cadera","exercises":[{"slug":"cadera-90-90","sets":3,"reps":8,"type":"load","value":0,"rest":30},{"slug":"sentadilla-cosaca","sets":3,"reps":8,"type":"load","value":0,"rest":45},{"slug":"estiramiento-couch","sets":3,"reps":6,"type":"load","value":0,"rest":30}]},{"name":"Hombro y rack","exercises":[{"slug":"dislocaciones-hombro","sets":3,"reps":12,"type":"load","value":0,"rest":30},{"slug":"extension-toracica","sets":3,"reps":8,"type":"load","value":0,"rest":30},{"slug":"movilidad-rack-frontal","sets":3,"reps":10,"type":"load","value":0,"rest":30}]}]'),
      ('91000000-0000-4000-8000-000000000017', '92000000-0000-4000-8000-000000000017', '90000000-0000-4000-8000-000000000009', 'Arrancada consistente', 'Repite patrones clave durante seis semanas para reducir variabilidad técnica.', 'intermediate', 'technique', 6, 3, 10, '[{"name":"Trayectoria","exercises":[{"slug":"arrancada-pausa-rodilla","sets":5,"reps":3,"type":"percentage","value":62,"rest":150},{"slug":"arrancada-cadera","sets":4,"reps":3,"type":"percentage","value":58,"rest":120},{"slug":"tiron-arrancada-pausa","sets":4,"reps":3,"type":"percentage","value":90,"rest":150}]},{"name":"Recepción","exercises":[{"slug":"snatch-balance","sets":5,"reps":3,"type":"percentage","value":65,"rest":150},{"slug":"press-sots","sets":4,"reps":5,"type":"load","value":20,"rest":90},{"slug":"sentadilla-overhead","sets":4,"reps":4,"type":"percentage","value":60,"rest":150}]},{"name":"Consistencia","exercises":[{"slug":"arrancada","sets":8,"reps":1,"type":"percentage","value":75,"rest":150},{"slug":"arrancada-sin-pies","sets":4,"reps":2,"type":"percentage","value":65,"rest":120},{"slug":"sentadilla","sets":4,"reps":4,"type":"percentage","value":75,"rest":180}]}]'),
      ('91000000-0000-4000-8000-000000000018', '92000000-0000-4000-8000-000000000018', '90000000-0000-4000-8000-000000000009', 'Overhead sin límites', 'Movilidad y fuerza posicional para una recepción más estable.', 'intermediate', 'mobility', 5, 3, 9, '[{"name":"Rango overhead","exercises":[{"slug":"extension-toracica","sets":3,"reps":10,"type":"load","value":0,"rest":30},{"slug":"estiramiento-dorsal-overhead","sets":3,"reps":8,"type":"load","value":0,"rest":30},{"slug":"dislocaciones-hombro","sets":3,"reps":12,"type":"load","value":0,"rest":30}]},{"name":"Fuerza de recepción","exercises":[{"slug":"press-sots","sets":4,"reps":5,"type":"load","value":22,"rest":90},{"slug":"snatch-balance","sets":5,"reps":3,"type":"percentage","value":62,"rest":150},{"slug":"sentadilla-overhead","sets":4,"reps":4,"type":"percentage","value":58,"rest":150}]},{"name":"Integración","exercises":[{"slug":"arrancada-desde-hang","sets":5,"reps":3,"type":"percentage","value":65,"rest":150},{"slug":"arrancada","sets":6,"reps":2,"type":"percentage","value":70,"rest":180},{"slug":"tiron-arrancada","sets":4,"reps":3,"type":"percentage","value":90,"rest":180}]}]'),
      ('91000000-0000-4000-8000-000000000019', '92000000-0000-4000-8000-000000000019', '90000000-0000-4000-8000-00000000000a', 'Fuerza máxima específica', 'Diez semanas de sentadillas, tirones y fuerza overhead para atletas avanzados.', 'advanced', 'strength', 10, 4, 8, '[{"name":"Sentadilla pesada","exercises":[{"slug":"sentadilla","sets":6,"reps":3,"type":"percentage","value":85,"rest":240},{"slug":"sentadilla-pausa","sets":4,"reps":3,"type":"percentage","value":75,"rest":210},{"slug":"peso-muerto-rumano","sets":4,"reps":6,"type":"load","value":100,"rest":180}]},{"name":"Tirón de arrancada","exercises":[{"slug":"peso-muerto-arrancada","sets":5,"reps":3,"type":"percentage","value":110,"rest":210},{"slug":"tiron-arrancada","sets":5,"reps":3,"type":"percentage","value":105,"rest":210},{"slug":"arrancada","sets":5,"reps":2,"type":"percentage","value":78,"rest":180}]},{"name":"Frontal y jerk","exercises":[{"slug":"sentadilla-frontal","sets":6,"reps":3,"type":"percentage","value":85,"rest":240},{"slug":"jerk-desde-rack","sets":6,"reps":2,"type":"percentage","value":82,"rest":210},{"slug":"press-estricto","sets":4,"reps":5,"type":"load","value":60,"rest":150}]},{"name":"Tirón de cargada","exercises":[{"slug":"peso-muerto-cargada","sets":5,"reps":3,"type":"percentage","value":110,"rest":210},{"slug":"tiron-cargada","sets":5,"reps":3,"type":"percentage","value":105,"rest":210},{"slug":"dos-tiempos","sets":5,"reps":2,"type":"percentage","value":80,"rest":210}]}]'),
      ('91000000-0000-4000-8000-000000000020', '92000000-0000-4000-8000-000000000020', '90000000-0000-4000-8000-00000000000a', 'Total olímpico', 'Cinco semanas para convertir fuerza en un total sólido de competición.', 'advanced', 'competition', 5, 4, 7, '[{"name":"Arrancada de competición","exercises":[{"slug":"arrancada","sets":7,"reps":1,"type":"percentage","value":84,"rest":240},{"slug":"arrancada-desde-bloques","sets":4,"reps":2,"type":"percentage","value":78,"rest":180},{"slug":"tiron-arrancada","sets":4,"reps":2,"type":"percentage","value":100,"rest":210}]},{"name":"Dos tiempos de competición","exercises":[{"slug":"dos-tiempos","sets":7,"reps":1,"type":"percentage","value":84,"rest":240},{"slug":"cargada-desde-bloques","sets":4,"reps":2,"type":"percentage","value":80,"rest":180},{"slug":"jerk-desde-rack","sets":4,"reps":2,"type":"percentage","value":82,"rest":210}]},{"name":"Reserva de fuerza","exercises":[{"slug":"sentadilla","sets":5,"reps":3,"type":"percentage","value":82,"rest":240},{"slug":"sentadilla-frontal","sets":5,"reps":2,"type":"percentage","value":84,"rest":240},{"slug":"push-press","sets":4,"reps":3,"type":"percentage","value":72,"rest":180}]},{"name":"Control de intentos","exercises":[{"slug":"arrancada","sets":3,"reps":1,"type":"percentage","value":90,"rest":300},{"slug":"dos-tiempos","sets":3,"reps":1,"type":"percentage","value":90,"rest":300},{"slug":"sentadilla-frontal-pausa","sets":3,"reps":2,"type":"percentage","value":75,"rest":210}]}]')
    ) as seed(routine_id, version_id, author_id, title, description, level, focus, weeks, days_per_week, published_days_ago, days)
  loop
    insert into public.routines (id, owner_id, status)
    values (routine_seed.routine_id, routine_seed.author_id, 'active');

    insert into public.routine_versions (
      id, routine_id, version_number, title, description, level, objective,
      weeks, days_per_week, visibility, published_at
    ) values (
      routine_seed.version_id, routine_seed.routine_id, 1, routine_seed.title,
      routine_seed.description, routine_seed.level, routine_seed.focus,
      routine_seed.weeks, routine_seed.days_per_week, 'public',
      now() - make_interval(days => routine_seed.published_days_ago)
    );

    day_number := 0;
    for day_item in select value from jsonb_array_elements(routine_seed.days)
    loop
      day_number := day_number + 1;
      insert into public.routine_days (routine_version_id, week_number, day_index, name, notes)
      values (routine_seed.version_id, 1, day_number, day_item->>'name', routine_seed.description)
      returning id into saved_day_id;

      insert into public.prescriptions (
        routine_day_id, exercise_id, sort_order, sets, repetitions, intensity_type,
        intensity_value, reference_exercise_id, suggested_load_kg, rest_seconds, notes
      )
      select
        saved_day_id, e.id, exercise_data.ordinality::smallint,
        (exercise_data.item->>'sets')::smallint,
        (exercise_data.item->>'reps')::smallint,
        exercise_data.item->>'type',
        (exercise_data.item->>'value')::numeric,
        case when exercise_data.item->>'type' = 'percentage' then e.id else null end,
        case when exercise_data.item->>'type' = 'load' then (exercise_data.item->>'value')::numeric else null end,
        (exercise_data.item->>'rest')::integer,
        null
      from jsonb_array_elements(day_item->'exercises') with ordinality as exercise_data(item, ordinality)
      join public.exercises e on e.slug = exercise_data.item->>'slug';
    end loop;
  end loop;
end;
$$;

insert into public.routine_likes (routine_version_id, user_id)
values
  ('92000000-0000-4000-8000-000000000009', '90000000-0000-4000-8000-000000000002'),
  ('92000000-0000-4000-8000-000000000009', '90000000-0000-4000-8000-000000000003'),
  ('92000000-0000-4000-8000-000000000009', '90000000-0000-4000-8000-000000000009'),
  ('92000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000004'),
  ('92000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000008'),
  ('92000000-0000-4000-8000-000000000011', '90000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000011', '90000000-0000-4000-8000-000000000007'),
  ('92000000-0000-4000-8000-000000000011', '90000000-0000-4000-8000-00000000000a'),
  ('92000000-0000-4000-8000-000000000012', '90000000-0000-4000-8000-000000000005'),
  ('92000000-0000-4000-8000-000000000012', '90000000-0000-4000-8000-000000000009'),
  ('92000000-0000-4000-8000-000000000013', '90000000-0000-4000-8000-000000000002'),
  ('92000000-0000-4000-8000-000000000013', '90000000-0000-4000-8000-000000000006'),
  ('92000000-0000-4000-8000-000000000013', '90000000-0000-4000-8000-00000000000a'),
  ('92000000-0000-4000-8000-000000000014', '90000000-0000-4000-8000-000000000002'),
  ('92000000-0000-4000-8000-000000000014', '90000000-0000-4000-8000-000000000006'),
  ('92000000-0000-4000-8000-000000000015', '90000000-0000-4000-8000-000000000003'),
  ('92000000-0000-4000-8000-000000000015', '90000000-0000-4000-8000-000000000004'),
  ('92000000-0000-4000-8000-000000000016', '90000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000016', '90000000-0000-4000-8000-000000000005'),
  ('92000000-0000-4000-8000-000000000017', '90000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000017', '90000000-0000-4000-8000-000000000005'),
  ('92000000-0000-4000-8000-000000000017', '90000000-0000-4000-8000-000000000007'),
  ('92000000-0000-4000-8000-000000000018', '90000000-0000-4000-8000-000000000004'),
  ('92000000-0000-4000-8000-000000000018', '90000000-0000-4000-8000-000000000008'),
  ('92000000-0000-4000-8000-000000000019', '90000000-0000-4000-8000-000000000002'),
  ('92000000-0000-4000-8000-000000000019', '90000000-0000-4000-8000-000000000006'),
  ('92000000-0000-4000-8000-000000000019', '90000000-0000-4000-8000-000000000007'),
  ('92000000-0000-4000-8000-000000000020', '90000000-0000-4000-8000-000000000002'),
  ('92000000-0000-4000-8000-000000000020', '90000000-0000-4000-8000-000000000006'),
  ('92000000-0000-4000-8000-000000000020', '90000000-0000-4000-8000-000000000007')
on conflict do nothing;

insert into public.routine_questions (
  id, routine_version_id, author_id, body, answer, answered_at, created_at
)
values
  ('93000000-0000-4000-8000-000000000004', '92000000-0000-4000-8000-000000000009', '90000000-0000-4000-8000-000000000008', '¿Puedo hacer la sesión de hang con barra técnica?', 'Sí. Mantén la misma trayectoria y sube carga solo cuando las repeticiones sean idénticas.', now() - interval '6 days', now() - interval '7 days'),
  ('93000000-0000-4000-8000-000000000005', '92000000-0000-4000-8000-000000000011', '90000000-0000-4000-8000-000000000005', '¿Qué día recortarías si solo puedo entrenar tres veces?', 'Alterna cada semana los dos días de tirón y conserva ambos días de sentadilla.', now() - interval '5 days', now() - interval '6 days'),
  ('93000000-0000-4000-8000-000000000006', '92000000-0000-4000-8000-000000000013', '90000000-0000-4000-8000-000000000002', '¿Cómo elegirías el primer intento en la simulación?', 'Usaría un peso que hayas hecho tres veces con seguridad durante el ciclo.', now() - interval '4 days', now() - interval '5 days'),
  ('93000000-0000-4000-8000-000000000007', '92000000-0000-4000-8000-000000000015', '90000000-0000-4000-8000-000000000004', '¿Se puede sustituir la barra de 20 kg?', 'Sí, usa PVC o barra técnica y conserva las posiciones y el ritmo.', now() - interval '3 days', now() - interval '4 days'),
  ('93000000-0000-4000-8000-000000000008', '92000000-0000-4000-8000-000000000017', '90000000-0000-4000-8000-000000000001', '¿Mantengo ocho singles si empiezo a fallar?', 'No. Detén la serie tras el segundo fallo técnico y anota la carga para la siguiente sesión.', now() - interval '2 days', now() - interval '3 days'),
  ('93000000-0000-4000-8000-000000000009', '92000000-0000-4000-8000-000000000019', '90000000-0000-4000-8000-000000000006', '¿El peso muerto de arrancada toma como referencia la arrancada?', 'Sí, el porcentaje se calcula con tu mejor arrancada registrada.', now() - interval '1 day', now() - interval '2 days'),
  ('93000000-0000-4000-8000-00000000000a', '92000000-0000-4000-8000-000000000020', '90000000-0000-4000-8000-000000000007', '¿Harías la simulación con órdenes de un entrenador?', null, null, now() - interval '10 hours')
on conflict (id) do nothing;

-- Recalculate XP and milestones after the expanded seed has fired social and
-- lift-record events. This also evaluates the new definitions for real users.
select private.refresh_athlete_progress(user_id) from public.profiles;
select private.evaluate_achievements(user_id) from public.profiles;

do $$
begin
  if (select count(*) from public.profiles where user_id::text like '90000000-0000-4000-8000-%') <> 10 then
    raise exception 'Expanded demo profile seed validation failed';
  end if;
  if (select count(*) from public.routine_versions where id::text like '92000000-0000-4000-8000-%') <> 20 then
    raise exception 'Expanded demo routine seed validation failed';
  end if;
  if (select count(*) from public.lift_records where user_id::text like '90000000-0000-4000-8000-%') < 180 then
    raise exception 'Expanded demo progression seed validation failed';
  end if;
  if (select count(*) from public.achievement_definitions) < 31 then
    raise exception 'Achievement milestone seed validation failed';
  end if;
end;
$$;
