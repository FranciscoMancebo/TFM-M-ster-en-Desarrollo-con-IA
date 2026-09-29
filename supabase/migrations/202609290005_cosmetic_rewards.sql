alter table public.achievement_definitions
  drop constraint if exists achievement_definitions_metric_check;

alter table public.achievement_definitions
  add constraint achievement_definitions_metric_check
  check (metric in (
    'workouts', 'lift_records', 'distinct_lifts', 'public_routines',
    'likes_received', 'questions_received', 'volume_kg',
    'successful_sets', 'personal_bests', 'adherence_streak',
    'perfect_weeks', 'technical_exercises', 'competitions',
    'olympic_total_pbs'
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
      select count(*)::integer from public.workout_sessions
      where user_id = target_user_id and status = 'completed'
    )
    when 'lift_records' then (
      select count(*)::integer from public.lift_records where user_id = target_user_id
    )
    when 'distinct_lifts' then (
      select count(distinct lift)::integer from public.lift_records where user_id = target_user_id
    )
    when 'public_routines' then (
      select count(distinct routine.id)::integer
      from public.routines routine
      join public.routine_versions version on version.routine_id = routine.id
      where routine.owner_id = target_user_id and version.published_at is not null
    )
    when 'likes_received' then (
      select count(*)::integer
      from public.routine_likes item
      join public.routine_versions version on version.id = item.routine_version_id
      join public.routines routine on routine.id = version.routine_id
      where routine.owner_id = target_user_id and item.user_id <> target_user_id
    )
    when 'questions_received' then (
      select count(*)::integer
      from public.routine_questions item
      join public.routine_versions version on version.id = item.routine_version_id
      join public.routines routine on routine.id = version.routine_id
      where routine.owner_id = target_user_id and item.author_id <> target_user_id
    )
    when 'volume_kg' then (
      select floor(coalesce(sum(item.load_kg * item.repetitions), 0))::integer
      from public.workout_sessions session
      join public.performed_sets item on item.session_id = session.id
      where session.user_id = target_user_id and session.status = 'completed' and item.result = 'success'
    )
    when 'successful_sets' then (
      select count(*)::integer
      from public.workout_sessions session
      join public.performed_sets item on item.session_id = session.id
      where session.user_id = target_user_id and session.status = 'completed' and item.result = 'success'
    )
    when 'personal_bests' then (
      select count(*)::integer
      from (
        select record.weight_kg,
          max(record.weight_kg) over (partition by record.lift order by record.achieved_on, record.created_at, record.id rows between unbounded preceding and 1 preceding) previous_best
        from public.lift_records record where record.user_id = target_user_id
      ) progression
      where progression.previous_best is not null and progression.weight_kg > progression.previous_best
    )
    when 'adherence_streak' then (
      select count(*)::integer
      from (
        select event.status,
          sum(case when event.status <> 'completed' then 1 else 0 end) over (order by event.scheduled_on desc, event.created_at desc rows between unbounded preceding and current row) blockers
        from public.training_calendar_events event
        where event.user_id = target_user_id and event.event_type <> 'rest' and event.status <> 'planned' and event.scheduled_on <= current_date
      ) ordered_events
      where ordered_events.status = 'completed' and ordered_events.blockers = 0
    )
    when 'perfect_weeks' then (
      select count(*)::integer
      from (
        select date_trunc('week', event.scheduled_on)::date
        from public.training_calendar_events event
        where event.user_id = target_user_id and event.event_type <> 'rest' and event.scheduled_on <= current_date
        group by date_trunc('week', event.scheduled_on)::date
        having count(*) > 0 and bool_and(event.status = 'completed')
      ) weeks
    )
    when 'technical_exercises' then (
      select count(distinct item.exercise_id)::integer
      from public.workout_sessions session
      join public.performed_sets item on item.session_id = session.id
      join public.exercises exercise on exercise.id = item.exercise_id
      where session.user_id = target_user_id
        and session.status = 'completed'
        and item.result = 'success'
        and exercise.metadata->>'section' in ('snatch', 'clean_and_jerk')
    )
    when 'competitions' then (
      select count(*)::integer
      from public.training_calendar_events event
      where event.user_id = target_user_id and event.event_type = 'competition' and event.status = 'completed'
    )
    when 'olympic_total_pbs' then (
      with result_dates as (
        select distinct achieved_on
        from public.lift_records
        where user_id = target_user_id and lift in ('snatch', 'clean_and_jerk')
      ), totals as (
        select result_dates.achieved_on,
          (select weight_kg from public.lift_records where user_id = target_user_id and lift = 'snatch' and achieved_on <= result_dates.achieved_on order by achieved_on desc, created_at desc limit 1) +
          (select weight_kg from public.lift_records where user_id = target_user_id and lift = 'clean_and_jerk' and achieved_on <= result_dates.achieved_on order by achieved_on desc, created_at desc limit 1) total
        from result_dates
      ), progression as (
        select total,
          max(total) over (order by achieved_on rows between unbounded preceding and 1 preceding) previous_best
        from totals where total is not null
      )
      select count(*)::integer from progression where previous_best is not null and total > previous_best
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
  ('technical_variety_8', 'Caja de herramientas', 'Technical toolbox', 'Completa con éxito 8 ejercicios técnicos diferentes.', 'Successfully complete 8 different technical exercises.', 'book', 'technical_exercises', 8, 200, 36),
  ('technical_variety_20', 'Dominio de variantes', 'Variation mastery', 'Completa con éxito 20 ejercicios técnicos diferentes.', 'Successfully complete 20 different technical exercises.', 'star', 'technical_exercises', 20, 600, 37),
  ('first_competition', 'Primera tarima', 'First platform', 'Completa tu primera competición registrada.', 'Complete your first recorded competition.', 'medal', 'competitions', 1, 250, 38),
  ('five_competitions', 'Competidor habitual', 'Seasoned competitor', 'Completa cinco competiciones registradas.', 'Complete five recorded competitions.', 'trophy', 'competitions', 5, 800, 39),
  ('first_total_pb', 'Nuevo total olímpico', 'New Olympic total', 'Mejora por primera vez tu total de arrancada y dos tiempos.', 'Improve your snatch and clean and jerk total for the first time.', 'trending', 'olympic_total_pbs', 1, 200, 40),
  ('three_total_pbs', 'Total en ascenso', 'Rising total', 'Mejora tres veces tu total olímpico.', 'Improve your Olympic total three times.', 'medal', 'olympic_total_pbs', 3, 600, 41)
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

create table public.profile_reward_definitions (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  category text not null check (category in ('level', 'consistency', 'volume', 'technique', 'competition', 'community', 'progress')),
  reward_type text not null check (reward_type in ('color', 'icon', 'frame', 'title', 'badge', 'celebration')),
  title_es text not null,
  title_en text not null,
  description_es text not null,
  description_en text not null,
  visual_value text not null,
  required_level integer check (required_level between 2 and 100),
  achievement_code text references public.achievement_definitions(code) on delete cascade,
  sort_order integer not null unique,
  check (num_nonnulls(required_level, achievement_code) = 1)
);

create table public.profile_reward_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  color_reward text references public.profile_reward_definitions(code) on delete set null,
  icon_reward text references public.profile_reward_definitions(code) on delete set null,
  frame_reward text references public.profile_reward_definitions(code) on delete set null,
  title_reward text references public.profile_reward_definitions(code) on delete set null,
  badge_reward text references public.profile_reward_definitions(code) on delete set null,
  celebration_reward text references public.profile_reward_definitions(code) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.profile_reward_definitions (
  code, category, reward_type, title_es, title_en, description_es, description_en,
  visual_value, required_level, achievement_code, sort_order
)
values
  ('level_2_lime', 'level', 'color', 'Lima inicial', 'Starter lime', 'Color de acento por alcanzar el nivel 2.', 'Accent colour for reaching level 2.', '#d9e51c', 2, null, 1),
  ('level_3_bolt', 'level', 'icon', 'Impulso', 'Momentum', 'Icono de energía del nivel 3.', 'Energy icon for level 3.', 'bolt', 3, null, 2),
  ('level_4_disciplined', 'level', 'title', 'Disciplinado', 'Disciplined', 'Título de perfil del nivel 4.', 'Profile title for level 4.', 'disciplined', 4, null, 3),
  ('level_5_steel_frame', 'level', 'frame', 'Marco de acero', 'Steel frame', 'Recompensa visual importante del nivel 5.', 'Major visual reward for level 5.', 'steel', 5, null, 4),
  ('level_6_ice', 'level', 'color', 'Azul velocidad', 'Speed blue', 'Color de acento del nivel 6.', 'Accent colour for level 6.', '#4cc9f0', 6, null, 5),
  ('level_7_flame', 'level', 'icon', 'Ritmo alto', 'High tempo', 'Icono de llama del nivel 7.', 'Flame icon for level 7.', 'flame', 7, null, 6),
  ('level_8_constant', 'level', 'title', 'Constante', 'Consistent', 'Título de perfil del nivel 8.', 'Profile title for level 8.', 'consistent', 8, null, 7),
  ('level_9_bronze', 'level', 'color', 'Bronce', 'Bronze', 'Color de acento del nivel 9.', 'Accent colour for level 9.', '#c9854b', 9, null, 8),
  ('level_10_prestige_badge', 'level', 'badge', 'Prestigio I', 'Prestige I', 'Insignia especial por alcanzar el nivel 10.', 'Special badge for reaching level 10.', 'prestige-1', 10, null, 9),
  ('level_10_celebration', 'level', 'celebration', 'Celebración de prestigio I', 'Prestige I celebration', 'Celebración exclusiva de nivel 10.', 'Exclusive level 10 celebration.', 'prestige-1', 10, null, 10),
  ('level_11_signal', 'level', 'color', 'Señal eléctrica', 'Electric signal', 'Color de acento del nivel 11.', 'Accent colour for level 11.', '#f2ff00', 11, null, 11),
  ('level_12_star', 'level', 'icon', 'Estrella de progreso', 'Progress star', 'Icono de estrella del nivel 12.', 'Star icon for level 12.', 'star', 12, null, 12),
  ('level_13_methodical', 'level', 'title', 'Metódico', 'Methodical', 'Título de perfil del nivel 13.', 'Profile title for level 13.', 'methodical', 13, null, 13),
  ('level_14_violet', 'level', 'color', 'Violeta de potencia', 'Power violet', 'Color de acento del nivel 14.', 'Accent colour for level 14.', '#a78bfa', 14, null, 14),
  ('level_15_signal_frame', 'level', 'frame', 'Marco de señal', 'Signal frame', 'Recompensa visual importante del nivel 15.', 'Major visual reward for level 15.', 'signal', 15, null, 15),
  ('level_16_medal', 'level', 'icon', 'Medalla de trabajo', 'Work medal', 'Icono de medalla del nivel 16.', 'Medal icon for level 16.', 'medal', 16, null, 16),
  ('level_17_ember', 'level', 'color', 'Ascua', 'Ember', 'Color de acento del nivel 17.', 'Accent colour for level 17.', '#f97316', 17, null, 17),
  ('level_18_resilient', 'level', 'title', 'Resiliente', 'Resilient', 'Título de perfil del nivel 18.', 'Profile title for level 18.', 'resilient', 18, null, 18),
  ('level_19_trophy', 'level', 'icon', 'Trofeo de experiencia', 'Experience trophy', 'Icono de trofeo del nivel 19.', 'Trophy icon for level 19.', 'trophy', 19, null, 19),
  ('level_20_prestige_badge', 'level', 'badge', 'Prestigio II', 'Prestige II', 'Insignia superior por alcanzar el nivel 20.', 'Superior badge for reaching level 20.', 'prestige-2', 20, null, 20),
  ('level_20_celebration', 'level', 'celebration', 'Celebración de prestigio II', 'Prestige II celebration', 'Celebración exclusiva de nivel 20.', 'Exclusive level 20 celebration.', 'prestige-2', 20, null, 21),
  ('consistency_streak_frame', 'consistency', 'frame', 'Marco racha de hierro', 'Iron streak frame', 'Premia diez entrenamientos planificados seguidos.', 'Rewards ten consecutive planned training days.', 'streak', null, 'streak_10', 30),
  ('consistency_perfect_badge', 'consistency', 'badge', 'Mes perfecto', 'Perfect month', 'Insignia por completar cuatro semanas perfectas.', 'Badge for completing four perfect weeks.', 'perfect-month', null, 'perfect_month', 31),
  ('volume_10k_icon', 'volume', 'icon', 'Diez toneladas', 'Ten tonnes', 'Icono por acumular 10.000 kg.', 'Icon for accumulating 10,000 kg.', 'barbell', null, 'volume_10k', 32),
  ('volume_100k_frame', 'volume', 'frame', 'Marco cien toneladas', 'Hundred-tonne frame', 'Marco por acumular 100.000 kg.', 'Frame for accumulating 100,000 kg.', 'heavy', null, 'volume_100k', 33),
  ('technique_toolbox_title', 'technique', 'title', 'Técnico metódico', 'Methodical technician', 'Título por dominar ocho variantes técnicas.', 'Title for mastering eight technical variations.', 'technician', null, 'technical_variety_8', 34),
  ('technique_master_badge', 'technique', 'badge', 'Maestro de variantes', 'Variation master', 'Insignia por trabajar veinte variantes técnicas.', 'Badge for training twenty technical variations.', 'technique-master', null, 'technical_variety_20', 35),
  ('competition_platform_title', 'competition', 'title', 'En tarima', 'On the platform', 'Título por completar una competición.', 'Title for completing one competition.', 'on-platform', null, 'first_competition', 36),
  ('competition_veteran_badge', 'competition', 'badge', 'Competidor veterano', 'Competition veteran', 'Insignia por completar cinco competiciones.', 'Badge for completing five competitions.', 'competition-veteran', null, 'five_competitions', 37),
  ('community_applause_color', 'community', 'color', 'Ovación', 'Applause', 'Color por recibir diez likes.', 'Colour for receiving ten likes.', '#ec4899', null, 'ten_likes', 38),
  ('community_mentor_title', 'community', 'title', 'Mentor de la comunidad', 'Community mentor', 'Título por recibir quince preguntas.', 'Title for receiving fifteen questions.', 'community-mentor', null, 'fifteen_questions', 39),
  ('progress_first_pb_icon', 'progress', 'icon', 'Flecha ascendente', 'Rising arrow', 'Icono por superar una marca anterior.', 'Icon for beating a previous result.', 'trending', null, 'first_pb', 40),
  ('progress_total_badge', 'progress', 'badge', 'Total en ascenso', 'Rising total', 'Insignia por mejorar tres veces el total olímpico.', 'Badge for improving the Olympic total three times.', 'rising-total', null, 'three_total_pbs', 41);

alter table public.profile_reward_definitions enable row level security;
alter table public.profile_reward_preferences enable row level security;

create policy reward_definitions_authenticated_read on public.profile_reward_definitions
for select using (auth.uid() is not null);
create policy reward_preferences_owner_read on public.profile_reward_preferences
for select using (user_id = auth.uid());

grant select on public.profile_reward_definitions, public.profile_reward_preferences to authenticated;

create or replace function public.equip_profile_reward(target_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  reward public.profile_reward_definitions%rowtype;
  unlocked boolean;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select * into reward from public.profile_reward_definitions where code = target_code;
  if reward.code is null then raise exception 'Unknown profile reward'; end if;
  unlocked := (reward.required_level is not null and private.profile_account_level(current_user_id) >= reward.required_level)
    or (reward.achievement_code is not null and exists (
      select 1 from public.user_achievements where user_id = current_user_id and achievement_code = reward.achievement_code
    ));
  if not unlocked then raise exception 'Profile reward is still locked'; end if;

  insert into public.profile_reward_preferences (user_id) values (current_user_id) on conflict do nothing;
  update public.profile_reward_preferences set
    color_reward = case when reward.reward_type = 'color' then reward.code else color_reward end,
    icon_reward = case when reward.reward_type = 'icon' then reward.code else icon_reward end,
    frame_reward = case when reward.reward_type = 'frame' then reward.code else frame_reward end,
    title_reward = case when reward.reward_type = 'title' then reward.code else title_reward end,
    badge_reward = case when reward.reward_type = 'badge' then reward.code else badge_reward end,
    celebration_reward = case when reward.reward_type = 'celebration' then reward.code else celebration_reward end,
    updated_at = now()
  where user_id = current_user_id;
end;
$$;

create or replace function public.clear_profile_reward(target_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_type not in ('color', 'icon', 'frame', 'title', 'badge', 'celebration') then raise exception 'Unknown reward type'; end if;
  update public.profile_reward_preferences set
    color_reward = case when target_type = 'color' then null else color_reward end,
    icon_reward = case when target_type = 'icon' then null else icon_reward end,
    frame_reward = case when target_type = 'frame' then null else frame_reward end,
    title_reward = case when target_type = 'title' then null else title_reward end,
    badge_reward = case when target_type = 'badge' then null else badge_reward end,
    celebration_reward = case when target_type = 'celebration' then null else celebration_reward end,
    updated_at = now()
  where user_id = auth.uid();
end;
$$;

create or replace function public.my_profile_rewards()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'code', reward.code,
      'category', reward.category,
      'rewardType', reward.reward_type,
      'titleEs', reward.title_es,
      'titleEn', reward.title_en,
      'descriptionEs', reward.description_es,
      'descriptionEn', reward.description_en,
      'visualValue', reward.visual_value,
      'requiredLevel', reward.required_level,
      'achievementCode', reward.achievement_code,
      'unlocked', (reward.required_level is not null and private.profile_account_level(current_user_id) >= reward.required_level)
        or (reward.achievement_code is not null and exists (select 1 from public.user_achievements where user_id = current_user_id and achievement_code = reward.achievement_code)),
      'equipped', reward.code in (
        coalesce(preference.color_reward, ''), coalesce(preference.icon_reward, ''), coalesce(preference.frame_reward, ''),
        coalesce(preference.title_reward, ''), coalesce(preference.badge_reward, ''), coalesce(preference.celebration_reward, '')
      )
    ) order by reward.sort_order)
    from public.profile_reward_definitions reward
    left join public.profile_reward_preferences preference on preference.user_id = current_user_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.equip_profile_reward(text) from public, anon;
revoke all on function public.clear_profile_reward(text) from public, anon;
revoke all on function public.my_profile_rewards() from public, anon;
grant execute on function public.equip_profile_reward(text) to authenticated;
grant execute on function public.clear_profile_reward(text) to authenticated;
grant execute on function public.my_profile_rewards() to authenticated;

alter function public.public_athlete_profile(uuid) rename to public_athlete_profile_without_cosmetics;
revoke all on function public.public_athlete_profile_without_cosmetics(uuid) from public, anon, authenticated;

create or replace function public.public_athlete_profile(target_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  base_profile jsonb;
begin
  if viewer_id is null then raise exception 'Authentication required'; end if;
  base_profile := public.public_athlete_profile_without_cosmetics(target_user_id);
  return base_profile || jsonb_build_object('profileRewards', coalesce((
    select jsonb_agg(jsonb_build_object(
      'code', reward.code,
      'rewardType', reward.reward_type,
      'titleEs', reward.title_es,
      'titleEn', reward.title_en,
      'visualValue', reward.visual_value
    ) order by reward.sort_order)
    from public.profile_reward_preferences preference
    cross join lateral (values
      (preference.color_reward), (preference.icon_reward), (preference.frame_reward),
      (preference.title_reward), (preference.badge_reward)
    ) equipped(code)
    join public.profile_reward_definitions reward on reward.code = equipped.code
    where preference.user_id = target_user_id
  ), '[]'::jsonb));
end;
$$;

revoke all on function public.public_athlete_profile(uuid) from public, anon;
grant execute on function public.public_athlete_profile(uuid) to authenticated;

alter function public.export_my_data() rename to export_my_data_without_rewards;
revoke all on function public.export_my_data_without_rewards() from public, anon, authenticated;

create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  return public.export_my_data_without_rewards() || jsonb_build_object(
    'rewardPreferences', (select to_jsonb(preference) from public.profile_reward_preferences preference where preference.user_id = current_user_id)
  );
end;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

select private.evaluate_achievements(user_id) from public.profiles;
