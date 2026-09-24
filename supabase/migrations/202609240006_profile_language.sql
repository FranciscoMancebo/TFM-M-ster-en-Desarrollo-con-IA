alter table public.profiles
  add column preferred_language text not null default 'es'
    check (preferred_language in ('es', 'en'));

comment on column public.profiles.preferred_language is
  'Preferred interface language for the athlete account.';

