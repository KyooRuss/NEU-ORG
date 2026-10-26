-- Only NEU school accounts can sign up. Students and professors sign in on the
-- mobile app with "Continue with Google" (plus an emailed code), and only
-- @neu.edu.ph emails are allowed. Checking it here refuses a new account from
-- any app or API, not just the mobile app. Existing accounts (like the seeded
-- admin and test accounts) aren't affected.

-- Same as in professor_invites (an invited email becomes a professor on its
-- first sign-in), plus the @neu.edu.ph check first.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.professor_invites;
begin
  if lower(coalesce(new.email, '')) not like '%@neu.edu.ph' then
    raise exception 'Only NEU accounts (@neu.edu.ph) can sign up.' using errcode = '42501';
  end if;

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
