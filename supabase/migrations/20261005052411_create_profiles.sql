-- Profiles: one row per user, holding the role that decides what they can do.
-- Students and officers use the mobile app; officers and admins use the web dashboard.

create type public.user_role as enum ('student', 'officer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- True when the logged-in user is an admin. "security definer" lets it read
-- profiles without running into the profiles RLS policies themselves.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

-- Every new account (seeded, email or Google) gets a profile with the
-- "student" role. Only an admin can promote it afterwards.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can update profiles"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
