-- Lets admins delete a student's account for good (the trash button on Users >
-- Students). Deleting the login removes the profile with it (profiles cascade
-- from auth.users); events and comments they wrote stay, with the author cleared.
--
-- Only plain student accounts can be deleted here. Officers and admins are refused,
-- so removing someone who leads an organization goes through Admin Officers first.

create function public.delete_student(target_profile uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete student accounts.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_profile
      and role = 'student'
  ) then
    raise exception 'This student was not found, or the account is an officer or admin.';
  end if;

  delete from auth.users
  where id = target_profile;
end;
$$;

-- Logged-in users may call it; the function checks for an admin itself.
revoke execute on function public.delete_student(uuid) from public, anon;
grant execute on function public.delete_student(uuid) to authenticated;
