alter table public.profiles
  add column birth_year smallint
    check (birth_year is null or birth_year between 1900 and 2100),
  add column competition_sex text
    check (competition_sex is null or competition_sex in ('male', 'female'));

comment on column public.profiles.birth_year is
  'Birth year used to calculate RFEH age groups by natural year without storing a full birth date.';
comment on column public.profiles.competition_sex is
  'Male or female RFEH competition category used only for official weight classes and elite-point references.';

update public.profiles
set birth_year = case user_id::text
    when '90000000-0000-4000-8000-000000000001' then 1998
    when '90000000-0000-4000-8000-000000000002' then 1995
    when '90000000-0000-4000-8000-000000000003' then 2008
    when '90000000-0000-4000-8000-000000000004' then 2007
    when '90000000-0000-4000-8000-000000000005' then 1992
    when '90000000-0000-4000-8000-000000000006' then 2006
    when '90000000-0000-4000-8000-000000000007' then 2004
    when '90000000-0000-4000-8000-000000000008' then 2009
    when '90000000-0000-4000-8000-000000000009' then 1989
    when '90000000-0000-4000-8000-00000000000a' then 1990
  end,
  competition_sex = case
    when user_id in (
      '90000000-0000-4000-8000-000000000001',
      '90000000-0000-4000-8000-000000000003',
      '90000000-0000-4000-8000-000000000005',
      '90000000-0000-4000-8000-000000000007',
      '90000000-0000-4000-8000-000000000009'
    ) then 'female'
    when user_id::text like '90000000-0000-4000-8000-00000000000%' then 'male'
  end
where user_id::text like '90000000-0000-4000-8000-00000000000%';
