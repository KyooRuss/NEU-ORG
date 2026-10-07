-- Events: requests that officers submit (details, description, poster) and
-- admins (OSAS) review on the web dashboard. The real approval happens offline;
-- once it comes through, the admin approves the request here and it goes public.
-- Before that, the admin can send it back for revision with comments, or decline it.
--
-- Upcoming and Past are not stored: an approved event is "upcoming" until its
-- end time passes, then it is "past".
--
-- Officer policies (submit, edit, resubmit, upload posters) come with the officer
-- side, once officers are linked to their organization.

create type public.event_status as enum ('pending', 'revision', 'approved', 'declined');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text not null check (char_length(trim(description)) > 0),
  venue text not null check (char_length(trim(venue)) > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Path inside the "event-media" storage bucket.
  poster_path text,
  status public.event_status not null default 'pending',
  decline_reason text,
  submitted_by uuid default auth.uid() references public.profiles (id) on delete set null,
  submitted_at timestamptz not null default now(),
  -- The admin who last approved, declined or sent it back.
  reviewed_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint events_ends_after_start check (ends_at >= starts_at),
  constraint events_decline_needs_reason check (
    status <> 'declined' or char_length(trim(coalesce(decline_reason, ''))) > 0
  ),
  constraint events_approved_needs_date check (status <> 'approved' or approved_at is not null)
);

-- The admin pages list events by status and date, and filter by organization.
create index events_status_starts_at_idx on public.events (status, starts_at);
create index events_organization_id_idx on public.events (organization_id);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

-- Students see approved events in the mobile app.
create policy "Logged-in users can read approved events"
  on public.events for select
  to authenticated
  using (status = 'approved');

create policy "Admins can read all events"
  on public.events for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can update events"
  on public.events for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Comments: what the admin wants changed when sending a request back. They are
-- never edited or deleted, so the admin can check later whether they were fixed.
create table public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  body text not null check (char_length(trim(body)) > 0),
  -- Which parts need fixing: any of 'poster', 'description', 'details'.
  sections text[] not null default '{}'
    check (sections <@ array['poster', 'description', 'details']),
  created_at timestamptz not null default now()
);

create index event_comments_event_id_idx on public.event_comments (event_id, created_at);

alter table public.event_comments enable row level security;

create policy "Admins can read event comments"
  on public.event_comments for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can add event comments"
  on public.event_comments for insert
  to authenticated
  with check ((select public.is_admin()));

-- Sending a request back saves the comment and changes the status together, so
-- one never happens without the other. "security invoker" keeps the admin-only
-- policies above in force.
create function public.request_event_revision(
  target_event_id uuid,
  comment_body text,
  comment_sections text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.events
  set status = 'revision', reviewed_by = auth.uid()
  where id = target_event_id and status = 'pending';

  if not found then
    raise exception 'Only pending requests can be sent back for revision.';
  end if;

  insert into public.event_comments (event_id, body, sections)
  values (target_event_id, comment_body, comment_sections);
end;
$$;

-- Event posters, stored as <org id>/<event id>/... Anyone can view them (they
-- show in the app). Upload policies are added with the officer side.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-media',
  'event-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
);
