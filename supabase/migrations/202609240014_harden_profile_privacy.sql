drop policy if exists profiles_read on public.profiles;

create policy profiles_owner_read on public.profiles for select
using (user_id = auth.uid());

comment on policy profiles_owner_read on public.profiles is
  'Raw profile rows are owner-only. Public profile data is exposed field-by-field through public_athlete_profile.';
