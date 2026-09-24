alter table public.profiles
  add column height_cm numeric(5,2)
    check (height_cm is null or height_cm between 100 and 250),
  add column weight_kg numeric(6,2)
    check (weight_kg is null or weight_kg between 30 and 350),
  add column avatar_base64 text
    check (
      avatar_base64 is null
      or (
        avatar_base64 ~ '^data:image/(jpeg|png|webp);base64,'
        and octet_length(avatar_base64) <= 500000
      )
    ),
  add column onboarding_completed boolean not null default false;

alter table public.profiles
  add constraint profiles_goals_allowed
    check (goals <@ array['technique', 'strength', 'mobility', 'competition']::text[]),
  add constraint profiles_onboarding_complete
    check (
      not onboarding_completed
      or (
        training_days_per_week is not null
        and height_cm is not null
        and weight_kg is not null
        and cardinality(goals) > 0
      )
    );

comment on column public.profiles.height_cm is
  'Athlete height used together with future performance marks for level estimation.';
comment on column public.profiles.weight_kg is
  'Current body weight used together with future performance marks for level estimation.';
comment on column public.profiles.avatar_base64 is
  'Compressed profile image stored as a Base64 data URL.';
comment on column public.profiles.onboarding_completed is
  'Whether the athlete has completed the required initial profile setup.';
