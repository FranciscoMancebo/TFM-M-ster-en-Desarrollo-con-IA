drop policy if exists routine_questions_update on public.routine_questions;
revoke update on public.routine_questions from authenticated;

create or replace function public.answer_routine_question(target_question_id uuid, question_answer text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if char_length(trim(question_answer)) not between 1 and 1000 then
    raise exception 'Invalid answer';
  end if;

  update public.routine_questions rq
  set answer = trim(question_answer), answered_at = now()
  where rq.id = target_question_id
    and exists (
      select 1
      from public.routine_versions rv
      join public.routines r on r.id = rv.routine_id
      where rv.id = rq.routine_version_id and r.owner_id = auth.uid()
    );

  if not found then raise exception 'Question not found'; end if;
end;
$$;

create or replace function public.delete_user_routine(target_routine_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  has_published_versions boolean;
begin
  if not exists (
    select 1 from public.routines where id = target_routine_id and owner_id = auth.uid()
  ) then raise exception 'Routine not found'; end if;

  delete from public.routine_assignments
  where routine_version_id in (
    select id from public.routine_versions where routine_id = target_routine_id
  ) and user_id = auth.uid();

  select exists (
    select 1 from public.routine_versions
    where routine_id = target_routine_id and published_at is not null
  ) into has_published_versions;

  if has_published_versions then
    delete from public.routine_likes
    where routine_version_id in (
      select id from public.routine_versions where routine_id = target_routine_id
    );
    delete from public.routine_questions
    where routine_version_id in (
      select id from public.routine_versions where routine_id = target_routine_id
    );
    update public.routine_versions
    set visibility = 'retired'
    where routine_id = target_routine_id and visibility = 'public';
    update public.routines set status = 'archived' where id = target_routine_id;
  else
    delete from public.routines where id = target_routine_id;
  end if;
end;
$$;

grant execute on function public.answer_routine_question(uuid,text) to authenticated;
grant execute on function public.delete_user_routine(uuid) to authenticated;
