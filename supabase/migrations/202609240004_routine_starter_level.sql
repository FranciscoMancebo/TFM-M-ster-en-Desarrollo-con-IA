alter table public.routine_versions
  drop constraint if exists routine_versions_level_check;

alter table public.routine_versions
  add constraint routine_versions_level_check
    check (level in ('starter', 'beginner', 'intermediate', 'advanced'));

