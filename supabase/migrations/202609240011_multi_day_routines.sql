create or replace function public.save_user_routine_days(
  target_routine_id uuid,
  routine_title text,
  routine_description text,
  routine_level text,
  routine_focus text,
  routine_weeks smallint,
  routine_days_per_week smallint,
  routine_visibility text,
  routine_days_data jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_routine_id uuid;
  previous_version public.routine_versions%rowtype;
  saved_version_id uuid;
  saved_day_id uuid;
  next_version_number integer;
  day_item jsonb;
  exercise_item jsonb;
  current_day_index integer := 0;
  current_exercise_index integer;
  day_name text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(routine_title)) not between 2 and 120 then raise exception 'Invalid routine title'; end if;
  if char_length(coalesce(routine_description, '')) > 2000 then raise exception 'Description is too long'; end if;
  if routine_level not in ('starter', 'beginner', 'intermediate', 'advanced') then raise exception 'Invalid level'; end if;
  if routine_focus not in ('mobility', 'strength', 'technique', 'competition') then raise exception 'Invalid focus'; end if;
  if routine_visibility not in ('private', 'public') then raise exception 'Invalid visibility'; end if;
  if routine_weeks not between 1 and 52 or routine_days_per_week not between 1 and 7 then raise exception 'Invalid duration'; end if;
  if jsonb_typeof(routine_days_data) <> 'array'
    or jsonb_array_length(routine_days_data) <> routine_days_per_week
  then
    raise exception 'Routine days must match days per week';
  end if;

  for day_item in select value from jsonb_array_elements(routine_days_data)
  loop
    day_name := trim(coalesce(day_item->>'name', ''));
    if char_length(day_name) not between 2 and 100 then raise exception 'Invalid day name'; end if;
    if jsonb_typeof(day_item->'exercises') <> 'array'
      or jsonb_array_length(day_item->'exercises') = 0
    then
      raise exception 'Every routine day needs at least one exercise';
    end if;
  end loop;

  if target_routine_id is null then
    insert into public.routines (owner_id, status)
    values (current_user_id, 'active')
    returning id into saved_routine_id;
    next_version_number := 1;
  else
    select id into saved_routine_id
    from public.routines
    where id = target_routine_id and owner_id = current_user_id;
    if saved_routine_id is null then raise exception 'Routine not found'; end if;

    select * into previous_version
    from public.routine_versions
    where routine_id = saved_routine_id
    order by version_number desc
    limit 1;
    next_version_number := coalesce(previous_version.version_number, 0) + 1;
    if previous_version.id is not null and previous_version.visibility = 'public' then
      update public.routine_versions set visibility = 'retired' where id = previous_version.id;
    end if;
  end if;

  insert into public.routine_versions (
    routine_id, version_number, title, description, level, objective,
    weeks, days_per_week, visibility, published_at
  ) values (
    saved_routine_id, next_version_number, trim(routine_title), nullif(trim(routine_description), ''),
    routine_level, routine_focus, routine_weeks, routine_days_per_week, routine_visibility,
    case when routine_visibility = 'public' then now() else null end
  ) returning id into saved_version_id;

  for day_item in select value from jsonb_array_elements(routine_days_data)
  loop
    current_day_index := current_day_index + 1;
    current_exercise_index := 0;
    day_name := trim(day_item->>'name');

    insert into public.routine_days (routine_version_id, week_number, day_index, name, notes)
    values (saved_version_id, 1, current_day_index, day_name, nullif(trim(routine_description), ''))
    returning id into saved_day_id;

    for exercise_item in select value from jsonb_array_elements(day_item->'exercises')
    loop
      current_exercise_index := current_exercise_index + 1;
      if coalesce(exercise_item->>'intensity_type', 'load') not in ('load', 'percentage') then
        raise exception 'Invalid intensity type';
      end if;

      insert into public.prescriptions (
        routine_day_id, exercise_id, sort_order, sets, repetitions,
        intensity_type, intensity_value, reference_exercise_id, suggested_load_kg,
        rest_seconds, notes
      ) values (
        saved_day_id,
        (exercise_item->>'exercise_id')::uuid,
        current_exercise_index,
        greatest(1, least(30, coalesce((exercise_item->>'sets')::smallint, 3))),
        greatest(1, least(100, coalesce((exercise_item->>'repetitions')::smallint, 3))),
        coalesce(exercise_item->>'intensity_type', 'load'),
        greatest(0, coalesce((exercise_item->>'intensity_value')::numeric, 0)),
        case when exercise_item->>'intensity_type' = 'percentage' then (exercise_item->>'exercise_id')::uuid else null end,
        case when coalesce(exercise_item->>'intensity_type', 'load') = 'load' then greatest(0, coalesce((exercise_item->>'intensity_value')::numeric, 0)) else null end,
        greatest(0, least(3600, coalesce((exercise_item->>'rest_seconds')::integer, 120))),
        nullif(trim(coalesce(exercise_item->>'notes', '')), '')
      );
    end loop;
  end loop;

  update public.routine_assignments
  set routine_version_id = saved_version_id
  where user_id = current_user_id
    and status = 'active'
    and routine_version_id in (
      select id from public.routine_versions where routine_id = saved_routine_id and id <> saved_version_id
    );

  return saved_routine_id;
end;
$$;

grant execute on function public.save_user_routine_days(uuid,text,text,text,text,smallint,smallint,text,jsonb) to authenticated;
