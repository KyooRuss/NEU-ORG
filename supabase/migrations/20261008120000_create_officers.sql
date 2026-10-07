-- Officers: links an officer account to the organization they manage, with
-- their position. Admins (OSAS) list them on the web dashboard under
-- Users > Admin Officers, and can deactivate or reactivate them there.
--
-- The name and email come from the officer's profile.

create type public.officer_status as enum ('active', 'inactive');

-- Gives each officer an admin number: A0001, A0002, ...
create sequence public.officer_admin_no_seq;

create table public.officers (
  id uuid primary key default gen_random_uuid(),
  admin_no text not null unique
    default ('A' || lpad(nextval('public.officer_admin_no_seq')::text, 4, '0')),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  position text not null default 'Admin Officer' check (char_length(trim(position)) > 0),
  status public.officer_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One row per officer per organization.
  constraint officers_profile_org_key unique (profile_id, organization_id)
);

alter sequence public.officer_admin_no_seq owned by public.officers.admin_no;

create index officers_organization_id_idx on public.officers (organization_id);

create trigger officers_set_updated_at
  before update on public.officers
  for each row execute function public.set_updated_at();

alter table public.officers enable row level security;

create policy "Officers can read their own officer rows"
  on public.officers for select
  to authenticated
  using ((select auth.uid()) = profile_id);

create policy "Admins can read all officers"
  on public.officers for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can add officers"
  on public.officers for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update officers"
  on public.officers for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete officers"
  on public.officers for delete
  to authenticated
  using ((select public.is_admin()));
