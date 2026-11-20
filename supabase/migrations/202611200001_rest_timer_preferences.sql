alter table public.profiles
  add column rest_timer_enabled boolean not null default true,
  add column rest_timer_default_seconds integer not null default 120
    check (rest_timer_default_seconds between 15 and 900),
  add column rest_timer_sound boolean not null default true,
  add column rest_timer_vibration boolean not null default true;

comment on column public.profiles.rest_timer_enabled is
  'Starts a rest countdown automatically after a successful set.';
comment on column public.profiles.rest_timer_default_seconds is
  'Fallback rest duration for free sessions or prescriptions without a positive rest value.';
comment on column public.profiles.rest_timer_sound is
  'Allows an audible alert when the rest countdown finishes.';
comment on column public.profiles.rest_timer_vibration is
  'Allows a vibration alert on compatible devices when the rest countdown finishes.';
