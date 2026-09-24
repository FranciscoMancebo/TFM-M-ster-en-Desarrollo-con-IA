create table public.lift_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lift text not null
    check (lift in ('back_squat', 'snatch', 'front_squat', 'clean_and_jerk')),
  weight_kg numeric(7,2) not null check (weight_kg between 1 and 600),
  achieved_on date not null default current_date,
  source text not null default 'manual'
    check (source in ('onboarding', 'manual', 'workout')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lift, achieved_on)
);

create index lift_records_user_lift_date_idx
  on public.lift_records(user_id, lift, achieved_on desc);

create trigger lift_records_set_updated_at
before update on public.lift_records
for each row execute function private.set_updated_at();

alter table public.lift_records enable row level security;

create policy lift_records_owner_select on public.lift_records for select
using (user_id = auth.uid());
create policy lift_records_owner_insert on public.lift_records for insert
with check (user_id = auth.uid());
create policy lift_records_owner_update on public.lift_records for update
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lift_records_owner_delete on public.lift_records for delete
using (user_id = auth.uid());

grant select, insert, update, delete on public.lift_records to authenticated;

comment on table public.lift_records is
  'Dated athlete reference marks used for progress charts and percentage-based routine loads.';
