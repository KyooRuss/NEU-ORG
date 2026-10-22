-- Announcements: officers post them for their organization from the
-- Announcements page of the web dashboard, and can edit or delete them there.
-- Students read them in the mobile app.
--
-- 'university' announcements are for every logged-in user. 'department'
-- announcements are only for the organization's members, since student
-- profiles don't record a department yet.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text not null check (char_length(trim(description)) > 0),
  audience text not null check (audience in ('university', 'department')),
  -- The date chosen on the form, shown as "Date Posted".
  announcement_date date not null,
  posted_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The Announcements page lists an organization's announcements, newest first.
create index announcements_org_date_idx
  on public.announcements (organization_id, announcement_date desc, created_at desc);

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;

create policy "Officers can read their organization's announcements"
  on public.announcements for select
  to authenticated
  using (public.is_officer_of(organization_id::text));

create policy "Admins can read all announcements"
  on public.announcements for select
  to authenticated
  using ((select public.is_admin()));

create policy "Logged-in users can read university-wide announcements"
  on public.announcements for select
  to authenticated
  using (audience = 'university');

create policy "Members can read their organization's announcements"
  on public.announcements for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members
      where organization_members.organization_id = announcements.organization_id
        and organization_members.profile_id = (select auth.uid())
    )
  );

create policy "Officers can post announcements for their organization"
  on public.announcements for insert
  to authenticated
  with check (
    public.is_officer_of(organization_id::text)
    and posted_by = (select auth.uid())
  );

-- "with check" keeps an officer from moving an announcement to an organization they don't run.
create policy "Officers can edit their organization's announcements"
  on public.announcements for update
  to authenticated
  using (public.is_officer_of(organization_id::text))
  with check (public.is_officer_of(organization_id::text));

create policy "Officers can delete their organization's announcements"
  on public.announcements for delete
  to authenticated
  using (public.is_officer_of(organization_id::text));
