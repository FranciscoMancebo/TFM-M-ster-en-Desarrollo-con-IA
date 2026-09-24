create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  bio text check (char_length(bio) <= 500),
  level text not null default 'beginner'
    check (level in ('beginner', 'intermediate', 'advanced')),
  goals text[] not null default '{}',
  training_days_per_week smallint
    check (training_days_per_week between 1 and 7),
  profile_visibility text not null default 'private'
    check (profile_visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 100),
  base_movement text not null,
  category text not null,
  equipment text[] not null default '{}',
  unilateral boolean not null default false,
  active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  source_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.routine_versions (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  title text not null check (char_length(title) between 2 and 120),
  description text check (char_length(description) <= 2000),
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  objective text not null,
  weeks smallint not null check (weeks between 1 and 52),
  days_per_week smallint not null check (days_per_week between 1 and 7),
  visibility text not null default 'private'
    check (visibility in ('private', 'public', 'retired')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (routine_id, version_number),
  check (
    (visibility = 'public' and published_at is not null)
    or visibility = 'private'
    or (visibility = 'retired' and published_at is not null)
  )
);

alter table public.routines
  add constraint routines_source_version_fk
  foreign key (source_version_id)
  references public.routine_versions(id)
  on delete set null;

create table public.routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_version_id uuid not null
    references public.routine_versions(id) on delete cascade,
  week_number smallint not null check (week_number > 0),
  day_index smallint not null check (day_index between 1 and 7),
  name text not null check (char_length(name) between 2 and 100),
  notes text check (char_length(notes) <= 2000),
  unique (routine_version_id, week_number, day_index)
);

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  routine_day_id uuid not null references public.routine_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  sort_order smallint not null check (sort_order > 0),
  sets smallint not null check (sets between 1 and 30),
  repetitions smallint not null check (repetitions between 1 and 100),
  intensity_type text not null check (intensity_type in ('load', 'percentage')),
  intensity_value numeric(7,2) not null check (intensity_value >= 0),
  reference_exercise_id uuid references public.exercises(id),
  target_rpe numeric(3,1) check (target_rpe between 1 and 10),
  rest_seconds integer check (rest_seconds between 0 and 3600),
  notes text check (char_length(notes) <= 1000),
  unique (routine_day_id, sort_order),
  check (
    (intensity_type = 'load' and reference_exercise_id is null)
    or (intensity_type = 'percentage' and reference_exercise_id is not null)
  )
);

create table public.routine_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_version_id uuid not null references public.routine_versions(id),
  starts_on date not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid references public.routine_assignments(id) on delete set null,
  routine_day_id uuid references public.routine_days(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned')),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed') = (finished_at is not null))
);

create table public.performed_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  prescription_id uuid references public.prescriptions(id) on delete set null,
  order_index smallint not null check (order_index > 0),
  load_kg numeric(7,2) not null check (load_kg >= 0),
  repetitions smallint not null check (repetitions between 1 and 100),
  rpe numeric(3,1) check (rpe between 1 and 10),
  result text not null check (result in ('success', 'miss', 'skipped')),
  performed_at timestamptz not null default now(),
  notes text check (char_length(notes) <= 1000),
  unique (session_id, order_index)
);

create index routines_owner_id_idx on public.routines(owner_id);
create index routine_versions_routine_id_idx on public.routine_versions(routine_id);
create index routine_days_version_idx on public.routine_days(routine_version_id);
create index prescriptions_day_idx on public.prescriptions(routine_day_id);
create index assignments_user_idx on public.routine_assignments(user_id);
create index sessions_user_started_idx on public.workout_sessions(user_id, started_at desc);
create index performed_sets_session_idx on public.performed_sets(session_id, order_index);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger routines_set_updated_at
before update on public.routines
for each row execute function private.set_updated_at();

create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row execute function private.set_updated_at();

create or replace function private.prevent_published_version_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.published_at is not null then
    if tg_op = 'UPDATE' then
      if old.visibility = 'public'
        and new.visibility = 'retired'
        and (to_jsonb(new) - 'visibility') = (to_jsonb(old) - 'visibility') then
        return new;
      end if;
    end if;
    raise exception 'Published routine versions are immutable';
  end if;
  return new;
end;
$$;

create trigger routine_versions_immutable_after_publish
before update or delete on public.routine_versions
for each row execute function private.prevent_published_version_changes();

create or replace function private.owns_routine(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.routines
    where id = target_id and owner_id = auth.uid()
  );
$$;

create or replace function private.can_read_routine_version(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.routine_versions rv
    join public.routines r on r.id = rv.routine_id
    where rv.id = target_id
      and (r.owner_id = auth.uid() or (rv.visibility = 'public' and rv.published_at is not null))
  );
$$;

create or replace function private.can_edit_routine_version(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.routine_versions rv
    join public.routines r on r.id = rv.routine_id
    where rv.id = target_id
      and r.owner_id = auth.uid()
      and rv.published_at is null
  );
$$;

create or replace function private.owns_session(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workout_sessions
    where id = target_id and user_id = auth.uid()
  );
$$;

revoke all on all functions in schema private from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.owns_routine(uuid) to authenticated;
grant execute on function private.can_read_routine_version(uuid) to anon, authenticated;
grant execute on function private.can_edit_routine_version(uuid) to authenticated;
grant execute on function private.owns_session(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_versions enable row level security;
alter table public.routine_days enable row level security;
alter table public.prescriptions enable row level security;
alter table public.routine_assignments enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.performed_sets enable row level security;

create policy profiles_read on public.profiles for select
using (user_id = auth.uid() or profile_visibility = 'public');
create policy profiles_insert on public.profiles for insert
with check (user_id = auth.uid());
create policy profiles_update on public.profiles for update
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_delete on public.profiles for delete
using (user_id = auth.uid());

create policy exercises_read_active on public.exercises for select
using (active);

create policy routines_owner_select on public.routines for select
using (owner_id = auth.uid());
create policy routines_owner_insert on public.routines for insert
with check (owner_id = auth.uid());
create policy routines_owner_update on public.routines for update
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy routines_owner_delete on public.routines for delete
using (owner_id = auth.uid());

create policy routine_versions_read on public.routine_versions for select
using (private.can_read_routine_version(id));
create policy routine_versions_insert on public.routine_versions for insert
with check (private.owns_routine(routine_id));
create policy routine_versions_update on public.routine_versions for update
using (private.owns_routine(routine_id))
with check (private.owns_routine(routine_id));
create policy routine_versions_delete on public.routine_versions for delete
using (private.owns_routine(routine_id));

create policy routine_days_read on public.routine_days for select
using (private.can_read_routine_version(routine_version_id));
create policy routine_days_insert on public.routine_days for insert
with check (private.can_edit_routine_version(routine_version_id));
create policy routine_days_update on public.routine_days for update
using (private.can_edit_routine_version(routine_version_id))
with check (private.can_edit_routine_version(routine_version_id));
create policy routine_days_delete on public.routine_days for delete
using (private.can_edit_routine_version(routine_version_id));

create policy prescriptions_read on public.prescriptions for select
using (
  exists (
    select 1 from public.routine_days rd
    where rd.id = routine_day_id
      and private.can_read_routine_version(rd.routine_version_id)
  )
);
create policy prescriptions_insert on public.prescriptions for insert
with check (
  exists (
    select 1 from public.routine_days rd
    where rd.id = routine_day_id
      and private.can_edit_routine_version(rd.routine_version_id)
  )
);
create policy prescriptions_update on public.prescriptions for update
using (
  exists (
    select 1 from public.routine_days rd
    where rd.id = routine_day_id
      and private.can_edit_routine_version(rd.routine_version_id)
  )
)
with check (
  exists (
    select 1 from public.routine_days rd
    where rd.id = routine_day_id
      and private.can_edit_routine_version(rd.routine_version_id)
  )
);
create policy prescriptions_delete on public.prescriptions for delete
using (
  exists (
    select 1 from public.routine_days rd
    where rd.id = routine_day_id
      and private.can_edit_routine_version(rd.routine_version_id)
  )
);

create policy assignments_owner_select on public.routine_assignments for select
using (user_id = auth.uid());
create policy assignments_owner_insert on public.routine_assignments for insert
with check (
  user_id = auth.uid()
  and private.can_read_routine_version(routine_version_id)
);
create policy assignments_owner_update on public.routine_assignments for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and private.can_read_routine_version(routine_version_id)
);
create policy assignments_owner_delete on public.routine_assignments for delete
using (user_id = auth.uid());

create policy sessions_owner_select on public.workout_sessions for select
using (user_id = auth.uid());
create policy sessions_owner_insert on public.workout_sessions for insert
with check (
  user_id = auth.uid()
  and (
    assignment_id is null
    or exists (
      select 1 from public.routine_assignments ra
      where ra.id = assignment_id and ra.user_id = auth.uid()
    )
  )
);
create policy sessions_owner_update on public.workout_sessions for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    assignment_id is null
    or exists (
      select 1 from public.routine_assignments ra
      where ra.id = assignment_id and ra.user_id = auth.uid()
    )
  )
);
create policy sessions_owner_delete on public.workout_sessions for delete
using (user_id = auth.uid());

create policy performed_sets_owner_select on public.performed_sets for select
using (private.owns_session(session_id));
create policy performed_sets_owner_insert on public.performed_sets for insert
with check (private.owns_session(session_id));
create policy performed_sets_owner_update on public.performed_sets for update
using (private.owns_session(session_id))
with check (private.owns_session(session_id));
create policy performed_sets_owner_delete on public.performed_sets for delete
using (private.owns_session(session_id));

grant select on public.exercises to anon, authenticated;
grant select on public.profiles, public.routine_versions, public.routine_days, public.prescriptions to anon;
grant select, insert, update, delete on
  public.profiles,
  public.routines,
  public.routine_versions,
  public.routine_days,
  public.prescriptions,
  public.routine_assignments,
  public.workout_sessions,
  public.performed_sets
to authenticated;

insert into public.exercises (id, slug, name, base_movement, category, equipment)
values
  ('00000000-0000-4000-8000-000000000001', 'arrancada', 'Arrancada', 'snatch', 'competition', array['barbell', 'plates']),
  ('00000000-0000-4000-8000-000000000002', 'dos-tiempos', 'Dos tiempos', 'clean-and-jerk', 'competition', array['barbell', 'plates']),
  ('00000000-0000-4000-8000-000000000003', 'sentadilla-frontal', 'Sentadilla frontal', 'squat', 'strength', array['barbell', 'rack']),
  ('00000000-0000-4000-8000-000000000004', 'tiron-arrancada', 'Tirón de arrancada', 'snatch', 'pull', array['barbell', 'plates'])
on conflict (id) do nothing;
