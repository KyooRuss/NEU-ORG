-- Notification read state for the mobile app. Notifications aren't stored:
-- the app builds them from announcements, approved events, application results
-- and event times. This table only remembers which ones each student has read,
-- so the unread dots and the bell's count are the same on every device.
--
-- A key names what the notification is about, e.g. "announcement:<id>",
-- "event:<id>", "application:<id>", "reminder:<event id>" or "rate:<event id>".

create table public.notification_reads (
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  notification_key text not null check (char_length(notification_key) between 1 and 200),
  read_at timestamptz not null default now(),

  primary key (profile_id, notification_key)
);

alter table public.notification_reads enable row level security;

create policy "Users can read their own notification reads"
  on public.notification_reads for select
  to authenticated
  using (profile_id = (select auth.uid()));

-- Marking as read only ever adds rows ("on conflict do nothing" for repeats),
-- so there are no update or delete policies.
create policy "Users can mark their own notifications as read"
  on public.notification_reads for insert
  to authenticated
  with check (profile_id = (select auth.uid()));
