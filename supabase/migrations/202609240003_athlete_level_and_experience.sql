alter table public.profiles
  drop constraint if exists profiles_level_check,
  drop constraint if exists profiles_onboarding_complete;

alter table public.profiles
  alter column level set default 'starter',
  add column weightlifting_experience text
    check (
      weightlifting_experience is null
      or weightlifting_experience in (
        'never',
        'under_6_months',
        'six_to_twenty_four_months',
        'over_two_years'
      )
    ),
  add constraint profiles_level_check
    check (level in ('starter', 'beginner', 'intermediate', 'advanced'));

insert into public.exercises (id, slug, name, base_movement, category, equipment)
values
  ('00000000-0000-4000-8000-000000000005', 'sentadilla', 'Sentadilla', 'squat', 'strength', array['barbell', 'rack']),
  ('00000000-0000-4000-8000-000000000006', 'arrancada-muscular', 'Arrancada muscular', 'snatch', 'technique', array['barbell', 'plates']),
  ('00000000-0000-4000-8000-000000000007', 'arrancada-desde-hang', 'Arrancada desde hang', 'snatch', 'technique', array['barbell', 'plates']),
  ('00000000-0000-4000-8000-000000000008', 'cargada-desde-hang', 'Cargada desde hang', 'clean', 'technique', array['barbell', 'plates']),
  ('00000000-0000-4000-8000-000000000009', 'press-estricto', 'Press estricto', 'press', 'strength', array['barbell', 'rack']),
  ('00000000-0000-4000-8000-00000000000a', 'balance-jerk', 'Balance de jerk', 'jerk', 'technique', array['barbell', 'rack'])
on conflict (id) do nothing;

update public.profiles
set onboarding_completed = false,
    weightlifting_experience = null,
    level = 'starter';

alter table public.profiles
  add constraint profiles_onboarding_complete
    check (
      not onboarding_completed
      or (
        training_days_per_week is not null
        and height_cm is not null
        and weight_kg is not null
        and weightlifting_experience is not null
        and cardinality(goals) > 0
      )
    );

comment on column public.profiles.weightlifting_experience is
  'Self-reported prior weightlifting experience used with body weight and reference marks to derive the athlete level.';
