-- Rating codes: officers set a 6-character code (letters and numbers) of their
-- own when they request an event, and announce it
-- at the event. Students must enter it in the mobile app before they can rate
-- the event, so only people who were there can rate it.
--
-- The code lives in its own table, not on events, because students can read
-- every column of an approved event. Only the event's officers and admins can
-- read a code. Students only ever learn whether the code they typed is right.
--
-- Events requested before this have no code. Those can still be rated without
-- one, until an officer sets a code.

create table public.event_rating_codes (
  event_id uuid primary key references public.events (id) on delete cascade,
  -- Saved in capitals; students' input is compared ignoring case and spaces.
  code text not null check (code ~ '^[A-Z0-9]{6}$'),
  updated_at timestamptz not null default now()
);

create trigger event_rating_codes_set_updated_at
  before update on public.event_rating_codes
  for each row execute function public.set_updated_at();

alter table public.event_rating_codes enable row level security;

create policy "Officers can read their events' rating codes"
  on public.event_rating_codes for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.events
      where events.id = event_rating_codes.event_id
        and public.is_officer_of(events.organization_id::text)
    )
  );

-- Officers can set or change the code at any time, even after approval: it
-- isn't part of what the admin reviews.
create policy "Officers can set their events' rating codes"
  on public.event_rating_codes for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.events
      where events.id = event_rating_codes.event_id
        and public.is_officer_of(events.organization_id::text)
    )
  );

create policy "Officers can change their events' rating codes"
  on public.event_rating_codes for update
  to authenticated
  using (
    exists (
      select 1
      from public.events
      where events.id = event_rating_codes.event_id
        and public.is_officer_of(events.organization_id::text)
    )
  )
  with check (
    exists (
      select 1
      from public.events
      where events.id = event_rating_codes.event_id
        and public.is_officer_of(events.organization_id::text)
    )
  );

-- Whether the student must enter a code to rate this event.
create function public.rating_code_required(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.event_rating_codes where event_id = target_event);
$$;

-- True when the code is right, or when the event has no code.
create function public.check_rating_code(target_event uuid, entered_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select code = upper(regexp_replace(coalesce(entered_code, ''), '\s', '', 'g'))
      from public.event_rating_codes
      where event_id = target_event
    ),
    true
  );
$$;

revoke execute on function public.rating_code_required(uuid) from public, anon;
grant execute on function public.rating_code_required(uuid) to authenticated;
revoke execute on function public.check_rating_code(uuid, text) from public, anon;
grant execute on function public.check_rating_code(uuid, text) to authenticated;

-- Students no longer insert ratings directly: that would skip the code. They
-- go through submit_event_feedback below, which checks it first.
drop policy "Users can rate events that have ended" on public.event_feedback;

-- Saves the logged-in student's ratings for an approved event that has ended,
-- once the code is right. Errors: 42501 when the event can't be rated (yet),
-- 22023 when the code is wrong, 23505 when they already rated it.
create function public.submit_event_feedback(
  target_event uuid,
  entered_code text,
  execution smallint,
  program_content smallint,
  engagement smallint,
  audio_visual smallint,
  registration smallint,
  instructions smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Log in to rate events.' using errcode = '42501';
  end if;

  -- Same rule as before: only approved events that have ended. An event
  -- without an end time counts as ended once it has started.
  if not exists (
    select 1
    from public.events
    where events.id = target_event
      and events.status = 'approved'
      and coalesce(events.ends_at, events.starts_at) < now()
  ) then
    raise exception 'This event can''t be rated yet.' using errcode = '42501';
  end if;

  if not public.check_rating_code(target_event, entered_code) then
    raise exception 'The rating code is incorrect.' using errcode = '22023';
  end if;

  insert into public.event_feedback (
    event_id, profile_id, execution, program_content, engagement, audio_visual, registration, instructions
  )
  values (
    target_event, auth.uid(), execution, program_content, engagement, audio_visual, registration, instructions
  );
end;
$$;

revoke execute on function public.submit_event_feedback(uuid, text, smallint, smallint, smallint, smallint, smallint, smallint)
  from public, anon;
grant execute on function public.submit_event_feedback(uuid, text, smallint, smallint, smallint, smallint, smallint, smallint)
  to authenticated;
