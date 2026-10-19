-- Membership: students apply to join an organization from the mobile app, and
-- the organization's officers accept or decline them on the Recruitment page of
-- the web dashboard. An accepted student becomes a member.
--
-- Officers only see pending applications. The status stays on the row so the
-- mobile app can later show students what happened to theirs.

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),

  constraint organization_members_org_profile_key unique (organization_id, profile_id)
);

create index organization_members_profile_id_idx on public.organization_members (profile_id);

alter table public.organization_members enable row level security;

create policy "Students can read their own memberships"
  on public.organization_members for select
  to authenticated
  using ((select auth.uid()) = profile_id);

create policy "Officers can read their organization's members"
  on public.organization_members for select
  to authenticated
  using (public.is_officer_of(organization_id::text));

create policy "Admins can read all members"
  on public.organization_members for select
  to authenticated
  using ((select public.is_admin()));

-- Members are only added by accepting an application (accept_application, in
-- the next migration), so there are no insert or update policies.

-- ---------------------------------------------------------------------------
-- Applications
-- ---------------------------------------------------------------------------

create type public.application_status as enum ('pending', 'accepted', 'declined');

create table public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  -- Filled in by the student when applying: "BS Computer Science"
  program text not null check (char_length(trim(program)) > 0),
  -- A link to the student's social media profile (e.g. Facebook).
  social_url text not null check (social_url ~* '^https?://'),
  status public.application_status not null default 'pending',
  applied_at timestamptz not null default now(),
  -- Who accepted or declined it, and when. Empty while pending.
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,

  constraint membership_applications_decided_when_not_pending check (
    (status = 'pending') = (decided_at is null)
  )
);

-- A student has at most one pending application per organization.
create unique index membership_applications_one_pending_idx
  on public.membership_applications (organization_id, profile_id)
  where status = 'pending';

-- The Recruitment page lists an organization's pending applications, oldest first.
create index membership_applications_org_status_idx
  on public.membership_applications (organization_id, status, applied_at);

alter table public.membership_applications enable row level security;

create policy "Students can read their own applications"
  on public.membership_applications for select
  to authenticated
  using ((select auth.uid()) = profile_id);

create policy "Officers can read their organization's applications"
  on public.membership_applications for select
  to authenticated
  using (public.is_officer_of(organization_id::text));

create policy "Admins can read all applications"
  on public.membership_applications for select
  to authenticated
  using ((select public.is_admin()));

-- A student applies for themselves, only while the organization is active and
-- recruiting, and only if they aren't a member already. A new application is
-- always pending, with nothing filled in for the officer's side.
create policy "Students can apply while recruitment is open"
  on public.membership_applications for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and status = 'pending'
    and decided_by is null
    and decided_at is null
    and exists (
      select 1
      from public.organizations
      where organizations.id = membership_applications.organization_id
        and organizations.status = 'active'
        and organizations.recruitment_open
    )
    and not exists (
      select 1
      from public.organization_members
      where organization_members.organization_id = membership_applications.organization_id
        and organization_members.profile_id = (select auth.uid())
    )
  );

-- Officers decide through accept_application and decline_application (next
-- migration), so there are no update policies.

-- ---------------------------------------------------------------------------
-- Officers read their applicants' and members' profiles
-- ---------------------------------------------------------------------------

-- Profiles are otherwise private to their owner and admins. Officers need the
-- name, email, student number and year level of the students who applied to,
-- or joined, their organization.
create policy "Officers can read their applicants' and members' profiles"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.membership_applications
      where membership_applications.profile_id = profiles.id
        and public.is_officer_of(membership_applications.organization_id::text)
    )
    or exists (
      select 1
      from public.organization_members
      where organization_members.profile_id = profiles.id
        and public.is_officer_of(organization_members.organization_id::text)
    )
  );
