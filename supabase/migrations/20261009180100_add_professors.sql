-- Professor details on profiles. Admins (OSAS) list professors on the web
-- dashboard under Users > Professors, where they can suspend, reactivate or
-- delete their accounts. A professor is a profile with a professor number;
-- the existing "Admins can update profiles" policy covers status changes.
--
-- A professor can also be an organization's Adviser, which makes their role
-- "officer" while it lasts. They stay on the Professors list (it goes by
-- professor_no), and go back to "professor" rather than "student" afterwards.

alter table public.profiles
  add column professor_no text unique check (char_length(trim(professor_no)) > 0),
  -- The college they belong to (see COLLEGES in apps/web/src/lib/organizations.ts).
  add column department text check (char_length(trim(department)) > 0);

-- Same as before, plus: someone with no active officer position who has a
-- professor number goes back to "professor".
create or replace function public.sync_officer_role(target_profile uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set role = case
    when exists (
      select 1
      from public.officers
      where profile_id = target_profile
        and status = 'active'
    ) then 'officer'::public.user_role
    when professor_no is not null then 'professor'::public.user_role
    else 'student'::public.user_role
  end
  where id = target_profile
    and role <> 'admin';
$$;

-- Deletes a professor's account for good (the trash button on Users > Professors).
-- Deleting the login removes the profile with it. Refused while they're an
-- active officer (an adviser), so remove that on Admin Officers first.
create function public.delete_professor(target_profile uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete professor accounts.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_profile
      and professor_no is not null
      and role = 'professor'
  ) then
    raise exception 'This professor was not found, or they are still an active officer. Remove them on Admin Officers first.';
  end if;

  delete from auth.users
  where id = target_profile;
end;
$$;

-- Logged-in users may call it; the function checks for an admin itself.
revoke execute on function public.delete_professor(uuid) from public, anon;
grant execute on function public.delete_professor(uuid) to authenticated;
