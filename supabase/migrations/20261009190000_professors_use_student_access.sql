-- Professors now have exactly a student's access and app screens, unless they're
-- an organization's Adviser, which makes them an "officer" like any admin officer.
-- When they stop being an adviser they go back to "student". So a professor is a
-- "student" account with a professor number; Users > Professors lists them by
-- professor_no (including advisers), and Users > Students leaves them out.
--
-- The "professor" role added in add_professor_role is no longer given to anyone.
-- Postgres can't drop an enum value, so it stays, unused.

update public.profiles
set role = 'student'
where role = 'professor';

-- Back to the original rule: "officer" while someone holds an active officer
-- position, "student" otherwise. Never touches admins.
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
    else 'student'::public.user_role
  end
  where id = target_profile
    and role <> 'admin';
$$;

-- Same as before, but a professor who isn't an adviser now has the "student" role.
create or replace function public.delete_professor(target_profile uuid)
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
      and role = 'student'
  ) then
    raise exception 'This professor was not found, or they are still an active officer. Remove them on Admin Officers first.';
  end if;

  delete from auth.users
  where id = target_profile;
end;
$$;

-- delete_student must not delete professors: they have the "student" role now.
create or replace function public.delete_student(target_profile uuid)
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
      and professor_no is null
  ) then
    raise exception 'This student was not found, or the account is an officer, admin or professor.';
  end if;

  delete from auth.users
  where id = target_profile;
end;
$$;
