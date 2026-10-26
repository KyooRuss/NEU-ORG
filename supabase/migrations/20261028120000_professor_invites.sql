-- Identifying professors. Only admins (OSAS) decide who is a professor, on the
-- web dashboard, in one of two ways:
--   * Users > Professors > Add Professor, by email. If that email already has
--     an account it becomes a professor right away; otherwise it's saved as an
--     invite, and the account becomes a professor when that email first signs
--     in (email/password or, later, Google).
--   * Users > Students > Mark as Professor, for someone who already signed up.
-- Either way the profile gets a professor_no and department, which is what
-- makes it a professor (see professors_use_student_access).

create table public.professor_invites (
  -- Stored lowercase, so sign-ins match whatever capitalization they use.
  email text primary key check (email = lower(trim(email)) and email like '%_@_%'),
  professor_no text not null unique check (char_length(trim(professor_no)) > 0),
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
-- email updates the professor number and department.
create function public.add_professor(target_email text, new_professor_no text, new_department text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text := lower(trim(target_email));
  clean_no text := trim(new_professor_no);
  clean_department text := trim(new_department);
  target public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only admins can add professors.' using errcode = '42501';
  end if;

  if clean_email is null or clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address.';
  end if;
  if coalesce(clean_no, '') = '' or coalesce(clean_department, '') = '' then
    raise exception 'Enter the professor number and department.';
  end if;

  select * into target
  from public.profiles
  where lower(email) = clean_email
  limit 1;

  if exists (
      select 1 from public.profiles
      where professor_no = clean_no
        and id is distinct from target.id
    )
    or exists (
      select 1 from public.professor_invites
      where professor_no = clean_no
        and email <> clean_email
    ) then
    raise exception 'Professor number % is already used by someone else.', clean_no;
  end if;

  if target.id is not null then
    if target.role = 'admin' then
      raise exception 'This email belongs to an admin account, which can''t be a professor.';
    end if;

    update public.profiles
    set professor_no = clean_no, department = clean_department
    where id = target.id;

    delete from public.professor_invites where email = clean_email;
    return 'linked';
  end if;

  insert into public.professor_invites (email, professor_no, department)
  values (clean_email, clean_no, clean_department)
  on conflict (email) do update
    set professor_no = excluded.professor_no,
        department = excluded.department,
        invited_by = auth.uid(),
        created_at = now();
  return 'invited';
end;
$$;

-- Logged-in users may call it; the function checks for an admin itself.
revoke execute on function public.add_professor(text, text, text) from public, anon;
grant execute on function public.add_professor(text, text, text) to authenticated;

-- Same as before, plus: an invited email becomes a professor on its first
-- sign-in, and the invite is used up. If the professor number got taken in the
-- meantime, the invite is ignored so the sign-up still works.
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
  where email = lower(new.email)
    and not exists (
      select 1 from public.profiles
      where profiles.professor_no = professor_invites.professor_no
    );

  insert into public.profiles (id, email, full_name, professor_no, department)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    invite.professor_no,
    invite.department
  );

  if invite.email is not null then
    delete from public.professor_invites where email = invite.email;
  end if;

  return new;
end;
$$;
