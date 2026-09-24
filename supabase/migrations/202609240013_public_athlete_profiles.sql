alter table public.profiles
  add column show_training_data boolean not null default false,
  add column show_progress boolean not null default false,
  add column show_public_routines boolean not null default true;

comment on column public.profiles.show_training_data is
  'Allows other authenticated users to see goals, frequency, height, weight and experience.';
comment on column public.profiles.show_progress is
  'Allows other authenticated users to see the dated reference-lift progression.';
comment on column public.profiles.show_public_routines is
  'Allows public routines to be listed on the athlete profile.';

create or replace function public.public_athlete_profile(target_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  athlete public.profiles%rowtype;
  may_see_training_data boolean;
  may_see_progress boolean;
  may_see_routines boolean;
begin
  if viewer_id is null then raise exception 'Authentication required'; end if;

  select * into athlete
  from public.profiles
  where user_id = target_user_id
    and (user_id = viewer_id or profile_visibility = 'public');

  if athlete.user_id is null then raise exception 'Profile is private or unavailable'; end if;

  may_see_training_data := target_user_id = viewer_id or athlete.show_training_data;
  may_see_progress := target_user_id = viewer_id or athlete.show_progress;
  may_see_routines := target_user_id = viewer_id or athlete.show_public_routines;

  return jsonb_build_object(
    'userId', athlete.user_id,
    'displayName', athlete.display_name,
    'bio', coalesce(athlete.bio, ''),
    'level', athlete.level,
    'avatarBase64', athlete.avatar_base64,
    'joinedAt', athlete.created_at,
    'trainingDataVisible', may_see_training_data,
    'progressVisible', may_see_progress,
    'routinesVisible', may_see_routines,
    'goals', case when may_see_training_data then to_jsonb(athlete.goals) else '[]'::jsonb end,
    'trainingDaysPerWeek', case when may_see_training_data then athlete.training_days_per_week else null end,
    'heightCm', case when may_see_training_data then athlete.height_cm else null end,
    'weightKg', case when may_see_training_data then athlete.weight_kg else null end,
    'weightliftingExperience', case when may_see_training_data then athlete.weightlifting_experience else null end,
    'liftRecords', case when may_see_progress then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', lr.id,
        'lift', lr.lift,
        'weightKg', lr.weight_kg,
        'achievedOn', lr.achieved_on,
        'source', lr.source
      ) order by lr.achieved_on, lr.created_at)
      from public.lift_records lr
      where lr.user_id = target_user_id
    ), '[]'::jsonb) else '[]'::jsonb end,
    'routines', case when may_see_routines then coalesce((
      select jsonb_agg(jsonb_build_object(
        'routineId', published.routine_id,
        'versionId', published.version_id,
        'title', published.title,
        'description', coalesce(published.description, ''),
        'level', published.level,
        'focus', published.objective,
        'weeks', published.weeks,
        'daysPerWeek', published.days_per_week,
        'publishedAt', published.published_at,
        'likeCount', (select count(*) from public.routine_likes rl where rl.routine_version_id = published.version_id),
        'questionCount', (select count(*) from public.routine_questions rq where rq.routine_version_id = published.version_id)
      ) order by published.published_at desc)
      from (
        select distinct on (r.id)
          r.id as routine_id,
          rv.id as version_id,
          rv.title,
          rv.description,
          rv.level,
          rv.objective,
          rv.weeks,
          rv.days_per_week,
          rv.published_at
        from public.routines r
        join public.routine_versions rv on rv.routine_id = r.id
        where r.owner_id = target_user_id
          and r.status <> 'archived'
          and rv.visibility = 'public'
          and rv.published_at is not null
        order by r.id, rv.version_number desc
      ) published
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

revoke all on function public.public_athlete_profile(uuid) from public, anon;
grant execute on function public.public_athlete_profile(uuid) to authenticated;

-- Demo profiles expose all sections so the public-profile experience can be tested.
update public.profiles
set profile_visibility = 'public',
    show_training_data = true,
    show_progress = true,
    show_public_routines = true
where user_id in (
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000002',
  '90000000-0000-4000-8000-000000000003',
  '90000000-0000-4000-8000-000000000004'
);

insert into public.lift_records (user_id, lift, weight_kg, achieved_on, source)
values
  ('90000000-0000-4000-8000-000000000001', 'back_squat', 82, current_date - 150, 'manual'),
  ('90000000-0000-4000-8000-000000000001', 'back_squat', 88, current_date - 80, 'manual'),
  ('90000000-0000-4000-8000-000000000001', 'back_squat', 95, current_date - 12, 'manual'),
  ('90000000-0000-4000-8000-000000000001', 'snatch', 45, current_date - 150, 'manual'),
  ('90000000-0000-4000-8000-000000000001', 'snatch', 50, current_date - 76, 'manual'),
  ('90000000-0000-4000-8000-000000000001', 'snatch', 54, current_date - 10, 'manual'),
  ('90000000-0000-4000-8000-000000000001', 'front_squat', 70, current_date - 145, 'manual'),
  ('90000000-0000-4000-8000-000000000001', 'front_squat', 78, current_date - 9, 'manual'),
  ('90000000-0000-4000-8000-000000000001', 'clean_and_jerk', 60, current_date - 140, 'manual'),
  ('90000000-0000-4000-8000-000000000001', 'clean_and_jerk', 68, current_date - 8, 'manual'),

  ('90000000-0000-4000-8000-000000000002', 'back_squat', 155, current_date - 180, 'manual'),
  ('90000000-0000-4000-8000-000000000002', 'back_squat', 170, current_date - 18, 'manual'),
  ('90000000-0000-4000-8000-000000000002', 'snatch', 92, current_date - 175, 'manual'),
  ('90000000-0000-4000-8000-000000000002', 'snatch', 101, current_date - 15, 'manual'),
  ('90000000-0000-4000-8000-000000000002', 'front_squat', 132, current_date - 170, 'manual'),
  ('90000000-0000-4000-8000-000000000002', 'front_squat', 145, current_date - 14, 'manual'),
  ('90000000-0000-4000-8000-000000000002', 'clean_and_jerk', 118, current_date - 165, 'manual'),
  ('90000000-0000-4000-8000-000000000002', 'clean_and_jerk', 130, current_date - 11, 'manual'),

  ('90000000-0000-4000-8000-000000000003', 'back_squat', 62, current_date - 90, 'manual'),
  ('90000000-0000-4000-8000-000000000003', 'back_squat', 72, current_date - 7, 'manual'),
  ('90000000-0000-4000-8000-000000000003', 'snatch', 30, current_date - 88, 'manual'),
  ('90000000-0000-4000-8000-000000000003', 'snatch', 37, current_date - 5, 'manual'),
  ('90000000-0000-4000-8000-000000000003', 'front_squat', 52, current_date - 86, 'manual'),
  ('90000000-0000-4000-8000-000000000003', 'front_squat', 61, current_date - 4, 'manual'),
  ('90000000-0000-4000-8000-000000000003', 'clean_and_jerk', 40, current_date - 84, 'manual'),
  ('90000000-0000-4000-8000-000000000003', 'clean_and_jerk', 48, current_date - 3, 'manual')
on conflict (user_id, lift, achieved_on) do update
set weight_kg = excluded.weight_kg,
    source = excluded.source;

do $$
begin
  if (select count(*) from public.lift_records where user_id::text like '90000000-0000-4000-8000-%') < 26 then
    raise exception 'Demo progression seed validation failed';
  end if;
end;
$$;
