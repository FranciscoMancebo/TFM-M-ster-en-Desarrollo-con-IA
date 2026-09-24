update public.routine_versions
set objective = case
  when lower(objective) like '%movilidad%' then 'mobility'
  when lower(objective) like '%fuerza%' then 'strength'
  when lower(objective) like '%compet%' then 'competition'
  else 'technique'
end
where objective not in ('mobility', 'strength', 'technique', 'competition');

alter table public.routine_versions
  add constraint routine_versions_objective_check
  check (objective in ('mobility', 'strength', 'technique', 'competition'));
