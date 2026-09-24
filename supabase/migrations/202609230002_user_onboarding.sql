alter table public.prescriptions
  add column suggested_load_kg numeric(7,2)
  check (suggested_load_kg is null or suggested_load_kg >= 0);

create or replace function private.provision_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  routine_id uuid;
  version_id uuid;
  day_id uuid;
begin
  if target_user_id is null then
    raise exception 'A user id is required';
  end if;

  perform 1 from auth.users where id = target_user_id for update;

  select coalesce(
    nullif(btrim(raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(email, '@', 1), ''),
    'Atleta'
  )
  into profile_name
  from auth.users
  where id = target_user_id;

  if char_length(profile_name) < 2 then
    profile_name := 'Atleta';
  end if;

  insert into public.profiles (user_id, display_name)
  values (target_user_id, left(profile_name, 60))
  on conflict (user_id) do nothing;

  if exists (
    select 1 from public.routines where owner_id = target_user_id
  ) then
    return;
  end if;

  insert into public.routines (owner_id, status)
  values (target_user_id, 'active')
  returning id into routine_id;

  insert into public.routine_versions (
    routine_id,
    version_number,
    title,
    description,
    level,
    objective,
    weeks,
    days_per_week,
    visibility
  )
  values (
    routine_id,
    1,
    'Base técnica',
    'Ciclo inicial para afianzar posiciones, velocidad y fuerza específica.',
    'beginner',
    'Técnica y consistencia',
    4,
    3,
    'private'
  )
  returning id into version_id;

  insert into public.routine_days (
    routine_version_id,
    week_number,
    day_index,
    name,
    notes
  )
  values (
    version_id,
    1,
    1,
    'Clásicos',
    'Prioriza posiciones sólidas y repeticiones técnicamente limpias.'
  )
  returning id into day_id;

  insert into public.prescriptions (
    routine_day_id,
    exercise_id,
    sort_order,
    sets,
    repetitions,
    intensity_type,
    intensity_value,
    reference_exercise_id,
    suggested_load_kg,
    rest_seconds,
    notes
  )
  values
    (
      day_id,
      '00000000-0000-4000-8000-000000000001',
      1,
      5,
      2,
      'percentage',
      70,
      '00000000-0000-4000-8000-000000000001',
      42,
      120,
      'Referencia inicial: 60 kg'
    ),
    (
      day_id,
      '00000000-0000-4000-8000-000000000003',
      2,
      4,
      3,
      'percentage',
      75,
      '00000000-0000-4000-8000-000000000003',
      75,
      150,
      'Referencia inicial: 100 kg'
    ),
    (
      day_id,
      '00000000-0000-4000-8000-000000000004',
      3,
      3,
      3,
      'percentage',
      90,
      '00000000-0000-4000-8000-000000000001',
      54,
      120,
      'Referencia inicial: arrancada de 60 kg'
    );

  insert into public.routine_assignments (
    user_id,
    routine_version_id,
    starts_on,
    status
  )
  values (target_user_id, version_id, current_date, 'active');
end;
$$;

revoke all on function private.provision_user(uuid) from public;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.provision_user(new.id);
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

drop trigger if exists provision_new_user on auth.users;
create trigger provision_new_user
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function public.ensure_user_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  perform private.provision_user(auth.uid());
end;
$$;

revoke all on function public.ensure_user_onboarding() from public, anon;
grant execute on function public.ensure_user_onboarding() to authenticated;

select private.provision_user(id) from auth.users;
