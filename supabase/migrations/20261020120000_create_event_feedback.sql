-- Event feedback: after an event ends, students rate it in the mobile app,
-- 1 to 5 in each of six categories. Officers see the averages on the
-- Feedback page of the web dashboard; admins can see them for every event.
--
-- One response per student per event. Officers never read single responses,
-- only the averages from event_feedback_summary, so ratings stay anonymous.

create table public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  execution smallint not null check (execution between 1 and 5),
  program_content smallint not null check (program_content between 1 and 5),
  engagement smallint not null check (engagement between 1 and 5),
  audio_visual smallint not null check (audio_visual between 1 and 5),
  registration smallint not null check (registration between 1 and 5),
  instructions smallint not null check (instructions between 1 and 5),
  created_at timestamptz not null default now(),
  unique (event_id, profile_id)
);

alter table public.event_feedback enable row level security;

create policy "Users can read their own feedback"
  on public.event_feedback for select
  to authenticated
  using (profile_id = (select auth.uid()));

-- Only approved events that have ended can be rated. An event without an end
-- time counts as ended once it has started.
create policy "Users can rate events that have ended"
  on public.event_feedback for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1
      from public.events
      where events.id = event_feedback.event_id
        and events.status = 'approved'
        and coalesce(events.ends_at, events.starts_at) < now()
    )
  );

-- The average of each category, out of 5, and how many responses they come from.
-- Only the event's officers and admins may see them.
create function public.event_feedback_summary(target_event uuid)
returns table (
  responses integer,
  execution numeric,
  program_content numeric,
  engagement numeric,
  audio_visual numeric,
  registration numeric,
  instructions numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    (select public.is_admin())
    or exists (
      select 1
      from public.events
      where events.id = target_event
        and public.is_officer_of(events.organization_id::text)
    )
  ) then
    raise exception 'Only the event''s officers and admins can see its feedback.'
      using errcode = '42501';
  end if;

  return query
  select
    count(*)::integer,
    avg(f.execution),
    avg(f.program_content),
    avg(f.engagement),
    avg(f.audio_visual),
    avg(f.registration),
    avg(f.instructions)
  from public.event_feedback f
  where f.event_id = target_event;
end;
$$;

revoke execute on function public.event_feedback_summary(uuid) from public, anon;
grant execute on function public.event_feedback_summary(uuid) to authenticated;
