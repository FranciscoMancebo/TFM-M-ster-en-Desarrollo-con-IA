-- Restrict the account section of the user export to an explicit allowlist.
-- Internal Auth hashes and one-time tokens must never leave the database.
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  return jsonb_build_object(
    'schemaVersion', 1,
    'exportedAt', now(),
    'account', (
      select jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'phone', u.phone,
        'createdAt', u.created_at,
        'updatedAt', u.updated_at,
        'lastSignInAt', u.last_sign_in_at,
        'emailConfirmedAt', u.email_confirmed_at,
        'phoneConfirmedAt', u.phone_confirmed_at,
        'userMetadata', coalesce(u.raw_user_meta_data, '{}'::jsonb)
      )
      from auth.users u
      where u.id = current_user_id
    ),
    'profile', (select to_jsonb(p) from public.profiles p where p.user_id = current_user_id),
    'liftRecords', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.achieved_on) from public.lift_records row_data where row_data.user_id = current_user_id), '[]'::jsonb),
    'exerciseRecords', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.achieved_on) from public.exercise_records row_data where row_data.user_id = current_user_id), '[]'::jsonb),
    'routines', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.created_at) from public.routines row_data where row_data.owner_id = current_user_id), '[]'::jsonb),
    'routineVersions', coalesce((select jsonb_agg(to_jsonb(rv) order by rv.created_at) from public.routine_versions rv join public.routines r on r.id = rv.routine_id where r.owner_id = current_user_id), '[]'::jsonb),
    'routineDays', coalesce((select jsonb_agg(to_jsonb(rd) order by rd.week_number, rd.day_index) from public.routine_days rd join public.routine_versions rv on rv.id = rd.routine_version_id join public.routines r on r.id = rv.routine_id where r.owner_id = current_user_id), '[]'::jsonb),
    'prescriptions', coalesce((select jsonb_agg(to_jsonb(p) order by p.sort_order) from public.prescriptions p join public.routine_days rd on rd.id = p.routine_day_id join public.routine_versions rv on rv.id = rd.routine_version_id join public.routines r on r.id = rv.routine_id where r.owner_id = current_user_id), '[]'::jsonb),
    'assignments', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.created_at) from public.routine_assignments row_data where row_data.user_id = current_user_id), '[]'::jsonb),
    'workoutSessions', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.started_at) from public.workout_sessions row_data where row_data.user_id = current_user_id), '[]'::jsonb),
    'performedSets', coalesce((select jsonb_agg(to_jsonb(ps) order by ps.performed_at) from public.performed_sets ps join public.workout_sessions ws on ws.id = ps.session_id where ws.user_id = current_user_id), '[]'::jsonb),
    'calendarEvents', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.scheduled_on) from public.training_calendar_events row_data where row_data.user_id = current_user_id), '[]'::jsonb),
    'routineLikes', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.created_at) from public.routine_likes row_data where row_data.user_id = current_user_id), '[]'::jsonb),
    'routineQuestions', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.created_at) from public.routine_questions row_data where row_data.author_id = current_user_id), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.created_at) from public.notifications row_data where row_data.user_id = current_user_id), '[]'::jsonb),
    'experienceEvents', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.created_at) from public.experience_events row_data where row_data.user_id = current_user_id), '[]'::jsonb),
    'athleteProgress', (select to_jsonb(row_data) from public.athlete_progress row_data where row_data.user_id = current_user_id),
    'achievements', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.unlocked_at) from public.user_achievements row_data where row_data.user_id = current_user_id), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
