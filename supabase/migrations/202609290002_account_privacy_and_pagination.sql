create or replace function public.community_routines_page(
  page_limit integer default 8,
  page_offset integer default 0,
  filter_level text default null,
  filter_focus text default null
)
returns table (
  routine_id uuid,
  routine_version_id uuid,
  title text,
  description text,
  routine_level text,
  focus text,
  weeks smallint,
  days_per_week smallint,
  author_id uuid,
  author_name text,
  author_level text,
  author_avatar text,
  like_count bigint,
  liked_by_me boolean,
  question_count bigint,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id, rv.id, rv.title, coalesce(rv.description, ''), rv.level, rv.objective,
    rv.weeks, rv.days_per_week, r.owner_id, p.display_name, p.level, p.avatar_base64,
    (select count(*) from public.routine_likes rl where rl.routine_version_id = rv.id),
    exists (
      select 1 from public.routine_likes rl
      where rl.routine_version_id = rv.id and rl.user_id = auth.uid()
    ),
    (select count(*) from public.routine_questions rq where rq.routine_version_id = rv.id),
    rv.published_at
  from public.routines r
  join public.routine_versions rv on rv.routine_id = r.id
  join public.profiles p on p.user_id = r.owner_id
  where auth.uid() is not null
    and rv.visibility = 'public'
    and rv.published_at is not null
    and (filter_level is null or p.level = filter_level)
    and (filter_focus is null or rv.objective = filter_focus)
    and not exists (
      select 1 from public.routine_versions newer
      where newer.routine_id = rv.routine_id
        and newer.visibility = 'public'
        and newer.published_at is not null
        and newer.version_number > rv.version_number
    )
  order by rv.published_at desc, rv.id desc
  limit greatest(1, least(coalesce(page_limit, 8), 51))
  offset greatest(0, coalesce(page_offset, 0));
$$;

create or replace function public.my_notifications_page(
  page_limit integer default 10,
  page_offset integer default 0
)
returns table (
  id uuid,
  notification_type text,
  actor_id uuid,
  actor_name text,
  actor_avatar text,
  routine_version_id uuid,
  routine_title text,
  question_body text,
  read_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id, n.type, n.actor_id, coalesce(actor.display_name, 'Atleta'), actor.avatar_base64,
    n.routine_version_id, coalesce(rv.title, 'Rutina'), rq.body, n.read_at, n.created_at
  from public.notifications n
  left join public.profiles actor on actor.user_id = n.actor_id
  left join public.routine_versions rv on rv.id = n.routine_version_id
  left join public.routine_questions rq on rq.id = n.question_id
  where n.user_id = auth.uid()
  order by n.created_at desc, n.id desc
  limit greatest(1, least(coalesce(page_limit, 10), 51))
  offset greatest(0, coalesce(page_offset, 0));
$$;

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
    'account', (select to_jsonb(u) - 'encrypted_password' - 'confirmation_token' - 'recovery_token' - 'email_change_token_new' - 'email_change_token_current' - 'reauthentication_token' from auth.users u where u.id = current_user_id),
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

create or replace function public.delete_my_account(confirmation_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select lower(email) into current_email from auth.users where id = current_user_id;
  if current_email is null or lower(trim(coalesce(confirmation_email, ''))) <> current_email then
    raise exception 'Email confirmation does not match';
  end if;
  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.community_routines_page(integer,integer,text,text) from public, anon;
revoke all on function public.my_notifications_page(integer,integer) from public, anon;
revoke all on function public.export_my_data() from public, anon;
revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.community_routines_page(integer,integer,text,text) to authenticated;
grant execute on function public.my_notifications_page(integer,integer) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.delete_my_account(text) to authenticated;
