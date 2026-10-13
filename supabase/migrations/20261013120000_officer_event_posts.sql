-- Officer side of events: officers submit event requests for their own
-- organization from the web dashboard, follow their status, and fix and resubmit
-- the ones the admin sent back for revision.
--
-- A request is locked while it is pending, and after it is approved or declined.
-- Officers can only change it while it is in revision, and can never delete it.

-- Who can join, and where to sign up. Registrations are not stored here: the
-- link goes to an outside form (e.g. Google Forms).
alter table public.events
  add column audience text not null default 'everyone'
    check (audience in ('everyone', 'members', 'colleges')),
  -- The colleges the event is for. Only filled in when audience is 'colleges'.
  add column audience_colleges text[] not null default '{}',
  add column registration_url text check (registration_url ~* '^https?://'),
  add constraint events_colleges_match_audience check (
    (audience = 'colleges') = (cardinality(audience_colleges) > 0)
  );

-- Every status, so officers can follow a request from pending to posted.
create policy "Officers can read their organization's events"
  on public.events for select
  to authenticated
  using (public.is_officer_of(organization_id::text));

-- A new request always starts as pending, with a poster, and with nothing
-- filled in for the admin's side.
create policy "Officers can submit events for their organization"
  on public.events for insert
  to authenticated
  with check (
    public.is_officer_of(organization_id::text)
    and status = 'pending'
    and poster_path is not null
    and submitted_by = (select auth.uid())
    and reviewed_by is null
    and approved_at is null
    and decline_reason is null
  );

-- "using" picks the rows an officer may change: only those in revision.
-- "with check" is what the row must look like afterwards: pending again.
create policy "Officers can resubmit events sent back for revision"
  on public.events for update
  to authenticated
  using (status = 'revision' and public.is_officer_of(organization_id::text))
  with check (
    status = 'pending'
    and poster_path is not null
    and public.is_officer_of(organization_id::text)
  );

-- The policy above opens the whole row, so this keeps the columns that belong
-- to the admin's review closed. Changes made without a logged-in user (the seed
-- script, the SQL editor) are left alone.
create function public.protect_event_review_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.organization_id is distinct from old.organization_id
    or new.submitted_by is distinct from old.submitted_by
    or new.submitted_at is distinct from old.submitted_at
    or new.reviewed_by is distinct from old.reviewed_by
    or new.approved_at is distinct from old.approved_at
    or new.decline_reason is distinct from old.decline_reason
  then
    raise exception 'Only an admin can change an event''s organization or review details.';
  end if;

  return new;
end;
$$;

create trigger events_protect_review_columns
  before update on public.events
  for each row execute function public.protect_event_review_columns();

-- Officers read what the admin asked them to fix.
create policy "Officers can read comments on their organization's events"
  on public.event_comments for select
  to authenticated
  using (
    exists (
      select 1
      from public.events
      where events.id = event_comments.event_id
        and public.is_officer_of(events.organization_id::text)
    )
  );

-- Posters are stored as <org id>/<event id>/..., so the first folder says which
-- organization a file belongs to.
-- Public URLs work without this; Storage needs it before officers can remove files.
create policy "Officers can list their event media"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'event-media' and public.is_officer_of((storage.foldername(name))[1]));

create policy "Officers can upload their event media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-media' and public.is_officer_of((storage.foldername(name))[1]));

create policy "Officers can replace their event media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'event-media' and public.is_officer_of((storage.foldername(name))[1]));

create policy "Officers can remove their event media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-media' and public.is_officer_of((storage.foldername(name))[1]));
