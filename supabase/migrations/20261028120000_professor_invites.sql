-- Identifying professors. Only admins (OSAS) decide who is a professor, on the
-- web dashboard, in one of two ways:
--   * Users > Professors > Add Professor, by email. If that email already has
--     an account it becomes a professor right away; otherwise it's saved as an
--     invite, and the account becomes a professor when that email first signs
--     in (email/password or, later, Google).
--   * Users > Students > Mark as Professor, for someone who already signed up.
--
-- A professor used to be "a profile with a professor number". Professor numbers
-- aren't used, so being a professor is now a plain yes/no: profiles.is_professor.
-- Professors still have the student role (see professors_use_student_access).

-- 1. The yes/no flag, replacing professor_no. Everyone who had a professor
--    number stays a professor.
alter table public.profiles
  add column is_professor boolean not null default false;

update public.profiles
set is_professor = true
where professor_no is not null;

-- 2. The functions that used professor_no now use is_professor.

-- Deletes a professor's account for good (the trash button on Users > Professors).
-- Refused while they're an active officer (an adviser).
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
      and is_professor
      and role = 'student'
  ) then
    raise exception 'This professor was not found, or they are still an active officer. Remove them on Admin Officers first.';
  end if;

  delete from auth.users
  where id = target_profile;
end;
$$;

-- delete_student must not delete professors: they have the "student" role too.
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
      and not is_professor
  ) then
    raise exception 'This student was not found, or the account is an officer, admin or professor.';
  end if;

  delete from auth.users
  where id = target_profile;
end;
$$;

alter table public.profiles drop column professor_no;

-- 3. Invites: emails OSAS added as professors that haven't signed in yet.
create table public.professor_invites (
  -- Stored lowercase, so sign-ins match whatever capitalization they use.
  email text primary key check (email = lower(trim(email)) and email like '%_@_%'),
  -- The college they belong to (see COLLEGES in apps/web/src/lib/organizations.ts).
  department text not null check (char_length(trim(department)) > 0),
  invited_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.professor_invites enable row level security;

-- Invites are added only through add_professor() below.
create policy "Admins can read professor invites"
  on public.professor_invites for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can cancel professor invites"
  on public.professor_invites for delete
  to authenticated
  using ((select public.is_admin()));

-- Makes the account with this email a professor, or invites the email if it has
-- no account yet. Returns 'linked' or 'invited'. Calling it again for the same
-- email updates the department.
create function public.add_professor(target_email text, new_department text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text := lower(trim(target_email));
  clean_department text := trim(new_department);
  target public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only admins can add professors.' using errcode = '42501';
  end if;

  if clean_email is null or clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address.';
  end if;
  if coalesce(clean_department, '') = '' then
    raise exception 'Choose a department.';
  end if;

  select * into target
  from public.profiles
  where lower(email) = clean_email
  limit 1;

  if target.id is not null then
    if target.role = 'admin' then
      raise exception 'This email belongs to an admin account, which can''t be a professor.';
    end if;

    update public.profiles
    set is_professor = true, department = clean_department
    where id = target.id;

    delete from public.professor_invites where email = clean_email;
    return 'linked';
  end if;

  insert into public.professor_invites (email, department)
  values (clean_email, clean_department)
  on conflict (email) do update
    set department = excluded.department,
        invited_by = auth.uid(),
        created_at = now();
  return 'invited';
end;
$$;

-- Logged-in users may call it; the function checks for an admin itself.
revoke execute on function public.add_professor(text, text) from public, anon;
grant execute on function public.add_professor(text, text) to authenticated;

-- 4. Same as before, plus: an invited email becomes a professor on its first
--    sign-in, and the invite is used up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.professor_invites;
begin
  select * into invite
  from public.professor_invites
  where email = lower(new.email);

  insert into public.profiles (id, email, full_name, is_professor, department)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    invite.email is not null,
    invite.department
  );

  if invite.email is not null then
    delete from public.professor_invites where email = invite.email;
  end if;

  return new;
end;
$$;
