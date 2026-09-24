-- A user can only have one active assignment at a time.
with ranked_assignments as (
  select id, row_number() over (partition by user_id order by created_at desc, id desc) as position
  from public.routine_assignments
  where status = 'active'
)
update public.routine_assignments ra
set status = 'cancelled'
from ranked_assignments ranked
where ra.id = ranked.id and ranked.position > 1;

create unique index if not exists routine_assignments_one_active_per_user
  on public.routine_assignments(user_id)
  where status = 'active';

create unique index if not exists routines_one_copy_per_source
  on public.routines(owner_id, source_version_id)
  where source_version_id is not null and status <> 'archived';

create or replace function public.my_routines()
returns table (
  routine_id uuid,
  routine_version_id uuid,
  title text,
  description text,
  routine_level text,
  focus text,
  weeks smallint,
  days_per_week smallint,
  visibility text,
  routine_status text,
  is_active boolean,
  source_version_id uuid,
  source_author_id uuid,
  source_author_name text,
  source_author_level text,
  source_author_avatar text,
  source_like_count bigint,
  source_liked_by_me boolean,
  source_question_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    current_version.id,
    current_version.title,
    coalesce(current_version.description, ''),
    current_version.level,
    current_version.objective,
    current_version.weeks,
    current_version.days_per_week,
    current_version.visibility,
    r.status,
    exists (
      select 1 from public.routine_assignments ra
      where ra.user_id = auth.uid()
        and ra.routine_version_id = current_version.id
        and ra.status = 'active'
    ),
    r.source_version_id,
    source_routine.owner_id,
    source_profile.display_name,
    source_profile.level,
    source_profile.avatar_base64,
    case when r.source_version_id is null then 0 else (
      select count(*) from public.routine_likes rl where rl.routine_version_id = r.source_version_id
    ) end,
    case when r.source_version_id is null then false else exists (
      select 1 from public.routine_likes rl
      where rl.routine_version_id = r.source_version_id and rl.user_id = auth.uid()
    ) end,
    case when r.source_version_id is null then 0 else (
      select count(*) from public.routine_questions rq where rq.routine_version_id = r.source_version_id
    ) end
  from public.routines r
  join lateral (
    select rv.*
    from public.routine_versions rv
    where rv.routine_id = r.id
    order by rv.version_number desc
    limit 1
  ) current_version on true
  left join public.routine_versions source_version on source_version.id = r.source_version_id
  left join public.routines source_routine on source_routine.id = source_version.routine_id
  left join public.profiles source_profile on source_profile.user_id = source_routine.owner_id
  where auth.uid() is not null
    and r.owner_id = auth.uid()
    and r.status <> 'archived'
  order by 11 desc, r.updated_at desc;
$$;

create or replace function public.activate_owned_routine(target_routine_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_version_id uuid;
  current_assignment_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select rv.id into target_version_id
  from public.routines r
  join public.routine_versions rv on rv.routine_id = r.id
  where r.id = target_routine_id
    and r.owner_id = current_user_id
    and r.status <> 'archived'
  order by rv.version_number desc
  limit 1;

  if target_version_id is null then raise exception 'Routine not found'; end if;

  select ra.id into current_assignment_id
  from public.routine_assignments ra
  where ra.user_id = current_user_id
    and ra.routine_version_id = target_version_id
    and ra.status = 'active'
  order by ra.created_at desc
  limit 1;

  if current_assignment_id is not null then return current_assignment_id; end if;

  if exists (
    select 1
    from public.workout_sessions ws
    join public.routine_assignments ra on ra.id = ws.assignment_id
    where ws.user_id = current_user_id
      and ws.status = 'active'
      and ra.status = 'active'
  ) then
    raise exception 'Finish or abandon the active workout before changing routines';
  end if;

  update public.routine_assignments
  set status = 'cancelled'
  where user_id = current_user_id and status = 'active';

  insert into public.routine_assignments (user_id, routine_version_id, starts_on, status)
  values (current_user_id, target_version_id, current_date, 'active')
  returning id into current_assignment_id;

  return current_assignment_id;
end;
$$;

create or replace function public.import_public_routine(
  target_version_id uuid,
  activate_after_import boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  source_version public.routine_versions%rowtype;
  source_owner_id uuid;
  saved_routine_id uuid;
  saved_version_id uuid;
  source_day record;
  saved_day_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select rv.* into source_version
  from public.routine_versions rv
  join public.routines r on r.id = rv.routine_id
  where rv.id = target_version_id
    and rv.visibility = 'public'
    and rv.published_at is not null;

  if source_version.id is null then raise exception 'Public routine not found'; end if;
  select owner_id into source_owner_id
  from public.routines
  where id = source_version.routine_id;
  if source_owner_id = current_user_id then raise exception 'This routine already belongs to you'; end if;

  select r.id into saved_routine_id
  from public.routines r
  where r.owner_id = current_user_id
    and r.source_version_id = target_version_id
    and r.status <> 'archived'
  limit 1;

  if saved_routine_id is null then
    insert into public.routines (owner_id, status, source_version_id)
    values (current_user_id, 'active', target_version_id)
    returning id into saved_routine_id;

    insert into public.routine_versions (
      routine_id, version_number, title, description, level, objective,
      weeks, days_per_week, visibility, published_at
    ) values (
      saved_routine_id, 1, source_version.title, source_version.description,
      source_version.level, source_version.objective, source_version.weeks,
      source_version.days_per_week, 'private', null
    ) returning id into saved_version_id;

    for source_day in
      select * from public.routine_days
      where routine_version_id = target_version_id
      order by week_number, day_index
    loop
      insert into public.routine_days (routine_version_id, week_number, day_index, name, notes)
      values (saved_version_id, source_day.week_number, source_day.day_index, source_day.name, source_day.notes)
      returning id into saved_day_id;

      insert into public.prescriptions (
        routine_day_id, exercise_id, sort_order, sets, repetitions,
        intensity_type, intensity_value, reference_exercise_id, target_rpe,
        rest_seconds, notes, suggested_load_kg
      )
      select
        saved_day_id, p.exercise_id, p.sort_order, p.sets, p.repetitions,
        p.intensity_type, p.intensity_value, p.reference_exercise_id, p.target_rpe,
        p.rest_seconds, p.notes, p.suggested_load_kg
      from public.prescriptions p
      where p.routine_day_id = source_day.id
      order by p.sort_order;
    end loop;
  end if;

  if activate_after_import then
    perform public.activate_owned_routine(saved_routine_id);
  end if;

  return saved_routine_id;
end;
$$;

revoke all on function public.my_routines() from public, anon;
revoke all on function public.activate_owned_routine(uuid) from public, anon;
revoke all on function public.import_public_routine(uuid,boolean) from public, anon;
grant execute on function public.my_routines() to authenticated;
grant execute on function public.activate_owned_routine(uuid) to authenticated;
grant execute on function public.import_public_routine(uuid,boolean) to authenticated;

-- Keep new registrations compatible with the normalized routine focus values.
do $migration$
declare
  provision_definition text;
begin
  select pg_get_functiondef('private.provision_user(uuid)'::regprocedure)
  into provision_definition;
  if position('Técnica y consistencia' in provision_definition) > 0 then
    execute replace(provision_definition, '''Técnica y consistencia''', '''technique''');
  end if;
end;
$migration$;

-- Fictional, non-login community profiles. The reserved .invalid domain and absence
-- of auth identities prevent these records from being used as real accounts.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'alba.rios@haltero.invalid', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"demo":true}', '{"display_name":"Alba Ríos","demo":true}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'mateo.sanz@haltero.invalid', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"demo":true}', '{"display_name":"Mateo Sanz","demo":true}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'ines.prieto@haltero.invalid', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"demo":true}', '{"display_name":"Inés Prieto","demo":true}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'leo.ortega@haltero.invalid', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"demo":true}', '{"display_name":"Leo Ortega","demo":true}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

delete from public.routine_assignments
where user_id in (
  '90000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002',
  '90000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000004'
);

delete from public.routines
where owner_id in (
  '90000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002',
  '90000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000004'
);

update public.profiles set
  display_name = 'Alba Ríos', bio = 'Entrenadora de base y amante de la técnica con barra.',
  level = 'intermediate', goals = array['technique','mobility'], training_days_per_week = 3,
  height_cm = 164, weight_kg = 62, onboarding_completed = true,
  weightlifting_experience = 'six_to_twenty_four_months', profile_visibility = 'public', preferred_language = 'es'
where user_id = '90000000-0000-4000-8000-000000000001';

update public.profiles set
  display_name = 'Mateo Sanz', bio = 'Halterofilia y fuerza para deportistas intermedios.',
  level = 'advanced', goals = array['strength','competition'], training_days_per_week = 4,
  height_cm = 181, weight_kg = 89, onboarding_completed = true,
  weightlifting_experience = 'over_two_years', profile_visibility = 'public', preferred_language = 'es'
where user_id = '90000000-0000-4000-8000-000000000002';

update public.profiles set
  display_name = 'Inés Prieto', bio = 'Progresiones accesibles para aprender desde cero.',
  level = 'beginner', goals = array['technique','strength'], training_days_per_week = 3,
  height_cm = 170, weight_kg = 68, onboarding_completed = true,
  weightlifting_experience = 'under_6_months', profile_visibility = 'public', preferred_language = 'es'
where user_id = '90000000-0000-4000-8000-000000000003';

update public.profiles set
  display_name = 'Leo Ortega', bio = 'Movilidad, posiciones y vuelta progresiva al entrenamiento.',
  level = 'starter', goals = array['mobility','technique'], training_days_per_week = 2,
  height_cm = 176, weight_kg = 76, onboarding_completed = true,
  weightlifting_experience = 'never', profile_visibility = 'public', preferred_language = 'es'
where user_id = '90000000-0000-4000-8000-000000000004';

do $$
declare
  routine_seed record;
  day_item jsonb;
  exercise_item jsonb;
  saved_day_id uuid;
  day_number integer;
begin
  for routine_seed in
    select * from (values
      ('91000000-0000-4000-8000-000000000001'::uuid, '92000000-0000-4000-8000-000000000001'::uuid, '90000000-0000-4000-8000-000000000001'::uuid, 'Primeras posiciones de arrancada', 'Tres días para dominar equilibrio, trayectoria y recepción antes de subir el peso.', 'beginner', 'technique', 6::smallint, 3::smallint, '[{"name":"Posiciones","exercises":[{"slug":"arrancada-muscular","sets":4,"reps":4,"type":"load","value":20,"rest":90},{"slug":"arrancada-pausa-rodilla","sets":5,"reps":3,"type":"percentage","value":55,"rest":120},{"slug":"sentadilla-overhead","sets":4,"reps":5,"type":"percentage","value":50,"rest":120}]},{"name":"Velocidad","exercises":[{"slug":"tall-snatch","sets":5,"reps":3,"type":"load","value":20,"rest":90},{"slug":"arrancada-desde-hang","sets":5,"reps":3,"type":"percentage","value":60,"rest":120},{"slug":"sentadilla-frontal","sets":4,"reps":4,"type":"percentage","value":65,"rest":150}]},{"name":"Integración","exercises":[{"slug":"arrancada","sets":6,"reps":2,"type":"percentage","value":65,"rest":150},{"slug":"tiron-arrancada","sets":4,"reps":3,"type":"percentage","value":85,"rest":150},{"slug":"sentadilla-pausa","sets":4,"reps":4,"type":"percentage","value":65,"rest":150}]}]'::jsonb),
      ('91000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000001', 'Overhead estable', 'Movilidad y control para ganar confianza en la recepción de arrancada.', 'intermediate', 'mobility', 4, 2, '[{"name":"Movilidad overhead","exercises":[{"slug":"extension-toracica","sets":3,"reps":8,"type":"load","value":0,"rest":30},{"slug":"dislocaciones-hombro","sets":3,"reps":12,"type":"load","value":0,"rest":30},{"slug":"sentadilla-overhead","sets":5,"reps":5,"type":"percentage","value":50,"rest":120}]},{"name":"Recepción","exercises":[{"slug":"movilidad-tobillo-pared","sets":3,"reps":10,"type":"load","value":0,"rest":30},{"slug":"snatch-balance","sets":5,"reps":3,"type":"percentage","value":60,"rest":120},{"slug":"press-sots","sets":4,"reps":5,"type":"load","value":20,"rest":90}]}]'),
      ('91000000-0000-4000-8000-000000000003', '92000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000002', 'Fuerza para los clásicos', 'Cuatro sesiones de fuerza específica con sentadillas, tirones y trabajo overhead.', 'advanced', 'strength', 8, 4, '[{"name":"Sentadilla pesada","exercises":[{"slug":"sentadilla","sets":5,"reps":3,"type":"percentage","value":82,"rest":210},{"slug":"sentadilla-pausa","sets":4,"reps":3,"type":"percentage","value":72,"rest":180},{"slug":"peso-muerto-rumano","sets":4,"reps":6,"type":"load","value":80,"rest":150}]},{"name":"Tirón de arrancada","exercises":[{"slug":"arrancada","sets":6,"reps":2,"type":"percentage","value":78,"rest":180},{"slug":"tiron-arrancada-pausa","sets":5,"reps":3,"type":"percentage","value":95,"rest":180},{"slug":"remo-con-barra","sets":4,"reps":6,"type":"load","value":70,"rest":120}]},{"name":"Frontal y jerk","exercises":[{"slug":"sentadilla-frontal","sets":5,"reps":3,"type":"percentage","value":80,"rest":210},{"slug":"jerk-desde-rack","sets":6,"reps":2,"type":"percentage","value":78,"rest":180},{"slug":"press-estricto","sets":4,"reps":5,"type":"load","value":50,"rest":120}]},{"name":"Tirón de cargada","exercises":[{"slug":"dos-tiempos","sets":5,"reps":2,"type":"percentage","value":78,"rest":210},{"slug":"tiron-cargada","sets":5,"reps":3,"type":"percentage","value":100,"rest":180},{"slug":"sentadilla-frontal-pausa","sets":4,"reps":3,"type":"percentage","value":70,"rest":180}]}]'),
      ('91000000-0000-4000-8000-000000000004', '92000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000002', 'Puesta a punto de competición', 'Bloque corto para practicar intentos, descansos largos y movimientos completos.', 'advanced', 'competition', 3, 3, '[{"name":"Arrancada competición","exercises":[{"slug":"arrancada","sets":6,"reps":1,"type":"percentage","value":85,"rest":240},{"slug":"arrancada-pausa-rodilla","sets":4,"reps":2,"type":"percentage","value":72,"rest":180},{"slug":"sentadilla-overhead","sets":3,"reps":3,"type":"percentage","value":65,"rest":150}]},{"name":"Dos tiempos competición","exercises":[{"slug":"dos-tiempos","sets":6,"reps":1,"type":"percentage","value":85,"rest":240},{"slug":"jerk-pausa-dip","sets":4,"reps":2,"type":"percentage","value":72,"rest":180},{"slug":"sentadilla-frontal","sets":4,"reps":2,"type":"percentage","value":82,"rest":210}]},{"name":"Simulación","exercises":[{"slug":"arrancada","sets":3,"reps":1,"type":"percentage","value":90,"rest":300},{"slug":"dos-tiempos","sets":3,"reps":1,"type":"percentage","value":90,"rest":300},{"slug":"sentadilla","sets":3,"reps":2,"type":"percentage","value":80,"rest":210}]}]'),
      ('91000000-0000-4000-8000-000000000005', '92000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000003', 'Base de cargada y jerk', 'Una progresión clara de tres días para aprender el dos tiempos con seguridad.', 'beginner', 'technique', 6, 3, '[{"name":"Rack y cargada","exercises":[{"slug":"movilidad-rack-frontal","sets":3,"reps":8,"type":"load","value":0,"rest":30},{"slug":"cargada-desde-hang","sets":5,"reps":3,"type":"percentage","value":55,"rest":120},{"slug":"sentadilla-frontal","sets":4,"reps":4,"type":"percentage","value":65,"rest":150}]},{"name":"Dip y jerk","exercises":[{"slug":"push-press","sets":4,"reps":4,"type":"percentage","value":50,"rest":120},{"slug":"jerk-pausa-dip","sets":5,"reps":3,"type":"percentage","value":55,"rest":120},{"slug":"balance-jerk","sets":4,"reps":3,"type":"load","value":20,"rest":90}]},{"name":"Dos tiempos","exercises":[{"slug":"cargada-potencia","sets":5,"reps":3,"type":"percentage","value":60,"rest":150},{"slug":"power-jerk","sets":5,"reps":3,"type":"percentage","value":60,"rest":150},{"slug":"dos-tiempos","sets":5,"reps":2,"type":"percentage","value":65,"rest":180}]}]'),
      ('91000000-0000-4000-8000-000000000006', '92000000-0000-4000-8000-000000000006', '90000000-0000-4000-8000-000000000003', 'Fuerza base 3 días', 'Rutina sencilla para construir piernas, espalda y estabilidad overhead.', 'beginner', 'strength', 8, 3, '[{"name":"Piernas","exercises":[{"slug":"sentadilla","sets":5,"reps":5,"type":"percentage","value":70,"rest":180},{"slug":"sentadilla-bulgara","sets":3,"reps":8,"type":"load","value":20,"rest":90},{"slug":"peso-muerto-rumano","sets":4,"reps":6,"type":"load","value":50,"rest":120}]},{"name":"Tirón","exercises":[{"slug":"peso-muerto-cargada","sets":5,"reps":4,"type":"percentage","value":80,"rest":150},{"slug":"remo-con-barra","sets":4,"reps":8,"type":"load","value":40,"rest":90},{"slug":"press-estricto","sets":4,"reps":6,"type":"load","value":25,"rest":120}]},{"name":"Frontal","exercises":[{"slug":"sentadilla-frontal","sets":5,"reps":4,"type":"percentage","value":68,"rest":180},{"slug":"push-press","sets":4,"reps":5,"type":"percentage","value":55,"rest":120},{"slug":"cargada-desde-hang","sets":5,"reps":3,"type":"percentage","value":55,"rest":120}]}]'),
      ('91000000-0000-4000-8000-000000000007', '92000000-0000-4000-8000-000000000007', '90000000-0000-4000-8000-000000000004', 'Movilidad para empezar', 'Dos sesiones suaves para preparar tobillos, caderas, rack frontal y hombros.', 'starter', 'mobility', 4, 2, '[{"name":"Sentadilla cómoda","exercises":[{"slug":"movilidad-tobillo-pared","sets":3,"reps":10,"type":"load","value":0,"rest":30},{"slug":"cadera-90-90","sets":3,"reps":8,"type":"load","value":0,"rest":30},{"slug":"prying-squat","sets":4,"reps":5,"type":"load","value":0,"rest":45}]},{"name":"Barra sobre la cabeza","exercises":[{"slug":"extension-toracica","sets":3,"reps":8,"type":"load","value":0,"rest":30},{"slug":"dislocaciones-hombro","sets":3,"reps":12,"type":"load","value":0,"rest":30},{"slug":"arrancada-muscular","sets":4,"reps":5,"type":"load","value":15,"rest":75}]}]'),
      ('91000000-0000-4000-8000-000000000008', '92000000-0000-4000-8000-000000000008', '90000000-0000-4000-8000-000000000004', 'Tu primera semana con barra', 'Dos días para conocer la arrancada, la cargada y las sentadillas sin perseguir kilos.', 'starter', 'technique', 4, 2, '[{"name":"Arrancada básica","exercises":[{"slug":"arrancada-muscular","sets":4,"reps":5,"type":"load","value":15,"rest":75},{"slug":"arrancada-desde-hang","sets":5,"reps":3,"type":"load","value":15,"rest":90},{"slug":"sentadilla-overhead","sets":4,"reps":5,"type":"load","value":15,"rest":90}]},{"name":"Cargada básica","exercises":[{"slug":"cargada-desde-hang","sets":5,"reps":3,"type":"load","value":20,"rest":90},{"slug":"press-estricto","sets":4,"reps":5,"type":"load","value":15,"rest":90},{"slug":"sentadilla-frontal","sets":4,"reps":5,"type":"load","value":20,"rest":120}]}]')
    ) as seed(routine_id, version_id, author_id, title, description, level, focus, weeks, days_per_week, days)
  loop
    insert into public.routines (id, owner_id, status)
    values (routine_seed.routine_id, routine_seed.author_id, 'active');

    insert into public.routine_versions (
      id, routine_id, version_number, title, description, level, objective,
      weeks, days_per_week, visibility, published_at
    ) values (
      routine_seed.version_id, routine_seed.routine_id, 1, routine_seed.title,
      routine_seed.description, routine_seed.level, routine_seed.focus,
      routine_seed.weeks, routine_seed.days_per_week, 'public', now() - interval '1 day'
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
        (exercise_data.item->>'sets')::smallint, (exercise_data.item->>'reps')::smallint,
        exercise_data.item->>'type', (exercise_data.item->>'value')::numeric,
        case when exercise_data.item->>'type' = 'percentage' then e.id else null end,
        case when exercise_data.item->>'type' = 'load' then (exercise_data.item->>'value')::numeric else null end,
        (exercise_data.item->>'rest')::integer, null
      from jsonb_array_elements(day_item->'exercises') with ordinality as exercise_data(item, ordinality)
      join public.exercises e on e.slug = exercise_data.item->>'slug';
    end loop;
  end loop;
end;
$$;

insert into public.routine_likes (routine_version_id, user_id)
values
  ('92000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002'),
  ('92000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000003'),
  ('92000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000003'),
  ('92000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000004'),
  ('92000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000004'),
  ('92000000-0000-4000-8000-000000000007', '90000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000008', '90000000-0000-4000-8000-000000000003');

insert into public.routine_questions (
  id, routine_version_id, author_id, body, answer, answered_at, created_at
)
values
  ('93000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000003', '¿Puedo repetir el día de posiciones si solo entreno dos días?', 'Sí. Alterna posiciones e integración y deja velocidad como sesión opcional.', now() - interval '2 days', now() - interval '3 days'),
  ('93000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000001', '¿Reducirías los tirones si compito el sábado?', 'Sí, esa semana bajaría una serie y mantendría la carga por debajo del 90%.', now() - interval '1 day', now() - interval '2 days'),
  ('93000000-0000-4000-8000-000000000003', '92000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000004', '¿Qué hago si todavía no tengo marca de dos tiempos?', 'Usa una carga técnica que puedas mover siempre igual y registra tu primera marca más adelante.', now() - interval '12 hours', now() - interval '1 day');

do $$
begin
  if (select count(*) from public.profiles where user_id::text like '90000000-0000-4000-8000-%') <> 4 then
    raise exception 'Demo profile seed validation failed';
  end if;
  if (select count(*) from public.routine_versions where id::text like '92000000-0000-4000-8000-%') <> 8 then
    raise exception 'Demo routine seed validation failed';
  end if;
end;
$$;
