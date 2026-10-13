import { fetchOrganizations, type Organization } from './organizations'
import { supabase } from './supabase'

export type EventStatus = 'pending' | 'revision' | 'approved' | 'declined'

// Who can join the event. 'colleges' comes with the list in audience_colleges.
export type EventAudience = 'everyone' | 'members' | 'colleges'
export const EVENT_AUDIENCES: { value: EventAudience; label: string }[] = [
  { value: 'everyone', label: 'Open to all students' },
  { value: 'members', label: 'Members only' },
  { value: 'colleges', label: 'Specific colleges' },
]

// The parts of a request an admin can ask the officers to fix.
export type EventSection = 'poster' | 'description' | 'details'
export const EVENT_SECTIONS: { value: EventSection; label: string }[] = [
  { value: 'poster', label: 'Poster' },
  { value: 'description', label: 'Description' },
  { value: 'details', label: 'Details' },
]

// "OrgEvent" so it doesn't clash with the browser's built-in Event type.
export type OrgEvent = {
  id: string
  organization_id: string
  organization_name: string
  organization_department: string
  title: string
  description: string
  venue: string
  starts_at: string
  // Null when the officers don't know yet when it will end.
  ends_at: string | null
  // Path inside the "event-media" storage bucket.
  poster_path: string | null
  audience: EventAudience
  // Only filled in when the audience is 'colleges'.
  audience_colleges: string[]
  // An outside sign-up form (e.g. Google Forms). Registrations aren't stored in the app.
  registration_url: string | null
  status: EventStatus
  decline_reason: string | null
  submitted_at: string
  approved_at: string | null
  updated_at: string
  // How many revision comments it has. A pending request with comments was resubmitted.
  comment_count: number
}

// What the officer's event form sends. The dates are ISO strings.
export type EventInput = {
  title: string
  description: string
  venue: string
  starts_at: string
  // Null when the end time isn't known.
  ends_at: string | null
  audience: EventAudience
  audience_colleges: string[]
  // Empty when there's no sign-up form.
  registration_url: string
}

export type EventComment = {
  id: string
  event_id: string
  body: string
  sections: EventSection[]
  created_at: string
}

// The admin pages: the three request tabs, plus Upcoming and Past.
export type RequestTab = 'pending' | 'revision' | 'declined'
export type EventTiming = 'upcoming' | 'past'

const EVENT_BUCKET = 'event-media'

export function posterUrl(path: string | null): string | null {
  if (!path) return null
  // Sample-data posters are kept as temporary browser URLs.
  if (path.startsWith('blob:')) return path
  return supabase.storage.from(EVENT_BUCKET).getPublicUrl(path).data.publicUrl
}

const dayFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' })
const timeFormat = new Intl.DateTimeFormat('en-PH', { timeStyle: 'short' })

// "Oct 21, 2026 · 9:00 AM – 4:00 PM", or both dates when it spans several days.
// With no end time: "Oct 21, 2026 · 9:00 AM onwards".
export function formatEventDate(event: Pick<OrgEvent, 'starts_at' | 'ends_at'>) {
  const start = new Date(event.starts_at)
  if (!event.ends_at) return `${dayFormat.format(start)} · ${timeFormat.format(start)} onwards`
  const end = new Date(event.ends_at)
  if (start.toDateString() === end.toDateString()) {
    return `${dayFormat.format(start)} · ${timeFormat.format(start)} – ${timeFormat.format(end)}`
  }
  return `${dayFormat.format(start)}, ${timeFormat.format(start)} – ${dayFormat.format(end)}, ${timeFormat.format(end)}`
}

// "Oct 21, 2026", or "Oct 21, 2026 – Oct 23, 2026" when it spans several days.
export function formatEventDay(event: Pick<OrgEvent, 'starts_at' | 'ends_at'>) {
  const start = new Date(event.starts_at)
  const end = event.ends_at ? new Date(event.ends_at) : start
  if (start.toDateString() === end.toDateString()) return dayFormat.format(start)
  return `${dayFormat.format(start)} – ${dayFormat.format(end)}`
}

// "9:00 AM – 4:00 PM", or "9:00 AM onwards" with no end time.
export function formatEventTime(event: Pick<OrgEvent, 'starts_at' | 'ends_at'>) {
  const start = timeFormat.format(new Date(event.starts_at))
  return event.ends_at ? `${start} – ${timeFormat.format(new Date(event.ends_at))}` : `${start} onwards`
}

// An event is upcoming until it ends. One with no end time stays upcoming for
// the whole day it starts on.
function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function isUpcoming(event: Pick<OrgEvent, 'starts_at' | 'ends_at'>) {
  return event.ends_at ? event.ends_at >= new Date().toISOString() : event.starts_at >= startOfToday()
}

// The same rule as isUpcoming, as a Supabase "or" filter.
function timingFilter(timing: EventTiming) {
  const now = new Date().toISOString()
  return timing === 'upcoming'
    ? `ends_at.gte.${now},and(ends_at.is.null,starts_at.gte.${startOfToday()})`
    : `ends_at.lt.${now},and(ends_at.is.null,starts_at.lt.${startOfToday()})`
}

export function formatDay(iso: string) {
  return dayFormat.format(new Date(iso))
}

// "Open to all students", "Members only", or the names of the colleges.
export function formatAudience(event: Pick<OrgEvent, 'audience' | 'audience_colleges'>) {
  if (event.audience === 'colleges') return event.audience_colleges.join(', ')
  return (EVENT_AUDIENCES.find((item) => item.value === event.audience) ?? EVENT_AUDIENCES[0]).label
}

// True when a pending request came back from the officers after a revision.
export function isResubmitted(event: OrgEvent) {
  return event.status === 'pending' && event.comment_count > 0
}

// ---------------------------------------------------------------------------
// Sample data, used while the events table isn't in Supabase yet. The sample
// events belong to the organizations already listed, so the names look real.
// ---------------------------------------------------------------------------

let sampleStore: OrgEvent[] | null = null
let sampleComments: EventComment[] = []

export function usingSampleEvents() {
  return sampleStore !== null
}

function isMissingTable(error: { code?: string }) {
  // PGRST205: table not in PostgREST's schema cache. 42P01: table doesn't exist.
  return error.code === 'PGRST205' || error.code === '42P01'
}

// A date `days` from today (negative for the past) at the given hour.
function dayAt(days: number, hour: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

async function createSampleStore(): Promise<OrgEvent[]> {
  const orgs = await fetchOrganizations('active').catch(() => [])
  const org = (index: number) =>
    orgs.length > 0
      ? {
          organization_id: orgs[index % orgs.length].id,
          organization_name: orgs[index % orgs.length].name,
          organization_department: orgs[index % orgs.length].department,
        }
      : {
          organization_id: `sample-org-${index}`,
          organization_name: 'Sample Organization',
          organization_department: 'University Wide',
        }

  const sample = (
    index: number,
    title: string,
    status: EventStatus,
    startDay: number,
    extra: Partial<OrgEvent> = {},
  ): OrgEvent => ({
    id: crypto.randomUUID(),
    ...org(index),
    title,
    description: `${title} — a sample event so the admin pages have something to show.`,
    venue: 'NEU Main Campus Auditorium',
    starts_at: dayAt(startDay, 9),
    ends_at: dayAt(startDay, 16),
    poster_path: null,
    audience: 'everyone',
    audience_colleges: [],
    registration_url: null,
    status,
    decline_reason: null,
    submitted_at: dayAt(-7 + index, 10),
    approved_at: status === 'approved' ? dayAt(Math.min(startDay - 3, -1), 14) : null,
    updated_at: dayAt(-1, 10),
    comment_count: 0,
    ...extra,
  })

  const events = [
    sample(0, 'Intro to Web Development Workshop', 'pending', 14),
    sample(1, 'Accounting Quiz Bee', 'pending', 21),
    sample(2, 'Inter-College Debate Cup', 'pending', 18, { comment_count: 1 }),
    sample(3, 'Blood Donation Drive', 'revision', 25, { comment_count: 1 }),
    sample(5, 'Battle of the Bands', 'declined', 10, {
      decline_reason: 'The venue is not available on the requested date.',
    }),
    sample(4, 'Engineering Week Opening', 'approved', 5),
    sample(0, 'Hackathon 2026', 'approved', 30),
    sample(3, 'Health Awareness Seminar', 'approved', -12),
    sample(1, 'Tax Season Orientation', 'approved', -40),
  ]

  sampleComments = [
    {
      id: crypto.randomUUID(),
      event_id: events[2].id,
      body: 'Please put the registration link on the poster.',
      sections: ['poster'],
      created_at: dayAt(-3, 11),
    },
    {
      id: crypto.randomUUID(),
      event_id: events[3].id,
      body: 'Add the time slots for each college and the exact room.',
      sections: ['details'],
      created_at: dayAt(-1, 10),
    },
  ]

  return events
}

function findSample(id: string): OrgEvent {
  const event = sampleStore?.find((item) => item.id === id)
  if (!event) throw notFound()
  return event
}

// ---------------------------------------------------------------------------
// Reads. Each one uses the sample data instead while it's active.
// ---------------------------------------------------------------------------

// Includes the organization's name and department, and the number of revision comments.
const EVENT_COLUMNS = '*, organization:organizations(name, department), event_comments(count)'

type EventRow = Omit<OrgEvent, 'organization_name' | 'organization_department' | 'comment_count'> & {
  organization: { name: string; department: string } | null
  event_comments: { count: number }[]
}

function fromRow({ organization, event_comments, ...row }: EventRow): OrgEvent {
  return {
    ...row,
    organization_name: organization?.name ?? 'Unknown organization',
    organization_department: organization?.department ?? '—',
    comment_count: event_comments[0]?.count ?? 0,
  }
}

// Loads the sample data the first time the events table turns out to be missing.
// Calls that arrive together (badge and list) share one load, so the IDs match.
let sampleLoading: Promise<OrgEvent[]> | null = null

async function ensureSampleStore(error: { code?: string; message: string }) {
  if (!isMissingTable(error)) throw new Error(error.message)
  sampleLoading ??= createSampleStore().then((events) => (sampleStore = events))
  return sampleLoading
}

// Pending: oldest first, so nothing waits too long. Revision and Declined: latest change first.
export async function fetchEventRequests(tab: RequestTab): Promise<OrgEvent[]> {
  if (!sampleStore) {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .eq('status', tab)
      .order(tab === 'pending' ? 'submitted_at' : 'updated_at', { ascending: tab === 'pending' })

    if (!error) return (data as EventRow[]).map(fromRow)
    await ensureSampleStore(error)
  }

  return sampleStore!
    .filter((event) => event.status === tab)
    .sort((a, b) =>
      tab === 'pending'
        ? a.submitted_at.localeCompare(b.submitted_at)
        : b.updated_at.localeCompare(a.updated_at),
    )
}

// Approved events. "Upcoming" lasts until the event ends, so one happening today still shows.
// Upcoming: nearest first. Past: most recent first.
// Pass organizationIds to keep only those organizations' events (the officer dashboard).
export async function fetchApprovedEvents(timing: EventTiming, organizationIds?: string[]): Promise<OrgEvent[]> {
  if (organizationIds?.length === 0) return []

  if (!sampleStore) {
    let query = supabase.from('events').select(EVENT_COLUMNS).eq('status', 'approved')
    if (organizationIds) query = query.in('organization_id', organizationIds)
    const { data, error } = await query
      .or(timingFilter(timing))
      .order('starts_at', { ascending: timing === 'upcoming' })

    if (!error) return (data as EventRow[]).map(fromRow)
    await ensureSampleStore(error)
  }

  return sampleStore!
    .filter(
      (event) =>
        event.status === 'approved' &&
        isUpcoming(event) === (timing === 'upcoming') &&
        (!organizationIds || organizationIds.includes(event.organization_id)),
    )
    .sort((a, b) =>
      timing === 'upcoming'
        ? a.starts_at.localeCompare(b.starts_at)
        : b.starts_at.localeCompare(a.starts_at),
    )
}

// Every request of the officer's organizations, whatever its status. Newest first.
export async function fetchMyEvents(organizationIds: string[]): Promise<OrgEvent[]> {
  if (organizationIds.length === 0) return []

  if (!sampleStore) {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .in('organization_id', organizationIds)
      .order('submitted_at', { ascending: false })

    if (!error) return (data as EventRow[]).map(fromRow)
    await ensureSampleStore(error)
  }

  return sampleStore!
    .filter((event) => organizationIds.includes(event.organization_id))
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
}

// For the officer dashboard card: requests still waiting for the admin.
export async function countMyPendingEvents(organizationIds: string[]): Promise<number> {
  if (organizationIds.length === 0) return 0

  if (!sampleStore) {
    const { count, error } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .in('organization_id', organizationIds)

    if (!error) return count ?? 0
    await ensureSampleStore(error)
  }

  return sampleStore!.filter(
    (event) => event.status === 'pending' && organizationIds.includes(event.organization_id),
  ).length
}

// For the badge on the Events menu.
export async function countPendingEvents(): Promise<number> {
  if (!sampleStore) {
    const { count, error } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (!error) return count ?? 0
    await ensureSampleStore(error)
  }

  return sampleStore!.filter((event) => event.status === 'pending').length
}

// For the dashboard card: approved events that haven't ended, same as the Upcoming Events page.
export async function countUpcomingEvents(): Promise<number> {
  if (!sampleStore) {
    const { count, error } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .or(timingFilter('upcoming'))

    if (!error) return count ?? 0
    await ensureSampleStore(error)
  }

  return sampleStore!.filter((event) => event.status === 'approved' && isUpcoming(event)).length
}

// For the dashboard's "Recently Added Events": approved since the 1st of this month, newest first.
export async function fetchEventsApprovedThisMonth(): Promise<OrgEvent[]> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const since = monthStart.toISOString()

  if (!sampleStore) {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .eq('status', 'approved')
      .gte('approved_at', since)
      .order('approved_at', { ascending: false })

    if (!error) return (data as EventRow[]).map(fromRow)
    await ensureSampleStore(error)
  }

  return sampleStore!
    .filter((event) => event.status === 'approved' && event.approved_at && event.approved_at >= since)
    .sort((a, b) => (b.approved_at ?? '').localeCompare(a.approved_at ?? ''))
}

// Oldest first, so the history reads top to bottom.
export async function fetchEventComments(eventId: string): Promise<EventComment[]> {
  if (sampleStore) {
    return sampleComments
      .filter((comment) => comment.event_id === eventId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  const { data, error } = await supabase
    .from('event_comments')
    .select('id, event_id, body, sections, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

// ---------------------------------------------------------------------------
// Admin actions
// ---------------------------------------------------------------------------

// Only a pending request can be approved: one in revision waits for the officers first.
export async function approveEvent(id: string) {
  const approvedAt = new Date().toISOString()

  if (sampleStore) {
    const event = findReviewable(id, ['pending'])
    Object.assign(event, { status: 'approved', approved_at: approvedAt, updated_at: approvedAt })
    return
  }

  const { data, error } = await supabase
    .from('events')
    .update({ status: 'approved', approved_at: approvedAt, reviewed_by: await currentUserId() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
  if (error) throw new Error(error.message)
  if (data.length === 0) throw notFound()
}

// Sends a pending request back to the officers. The comment is required.
export async function requestRevision(id: string, body: string, sections: EventSection[]) {
  const cleanBody = body.trim()
  if (!cleanBody) throw new Error('Write what the officers need to change.')

  if (sampleStore) {
    const event = findReviewable(id, ['pending'])
    const now = new Date().toISOString()
    sampleComments.push({ id: crypto.randomUUID(), event_id: id, body: cleanBody, sections, created_at: now })
    Object.assign(event, { status: 'revision', updated_at: now, comment_count: event.comment_count + 1 })
    return
  }

  // Saves the comment and changes the status together (see the events migration).
  const { error } = await supabase.rpc('request_event_revision', {
    target_event_id: id,
    comment_body: cleanBody,
    comment_sections: sections,
  })
  if (error) throw new Error(error.message)
}

// For events that weren't approved offline. Works while pending or in revision. The reason is required.
export async function declineEvent(id: string, reason: string) {
  const cleanReason = reason.trim()
  if (!cleanReason) throw new Error('Write the reason for declining.')

  if (sampleStore) {
    const event = findReviewable(id, ['pending', 'revision'])
    Object.assign(event, { status: 'declined', decline_reason: cleanReason, updated_at: new Date().toISOString() })
    return
  }

  const { data, error } = await supabase
    .from('events')
    .update({ status: 'declined', decline_reason: cleanReason, reviewed_by: await currentUserId() })
    .eq('id', id)
    .in('status', ['pending', 'revision'])
    .select('id')
  if (error) throw new Error(error.message)
  if (data.length === 0) throw notFound()
}

// ---------------------------------------------------------------------------
// Officer actions
// ---------------------------------------------------------------------------

// Submits a new request. It starts as pending and can't be edited until the admin sends it back.
export async function createEvent(
  organization: Pick<Organization, 'id' | 'name' | 'department'>,
  input: EventInput,
  poster: File,
) {
  const values = clean(input)
  const id = crypto.randomUUID()

  if (sampleStore) {
    const now = new Date().toISOString()
    sampleStore.push({
      id,
      organization_id: organization.id,
      organization_name: organization.name,
      organization_department: organization.department,
      ...values,
      poster_path: URL.createObjectURL(poster),
      status: 'pending',
      decline_reason: null,
      submitted_at: now,
      approved_at: null,
      updated_at: now,
      comment_count: 0,
    })
    return
  }

  // The poster goes up first, so the request is never saved without one.
  const posterPath = await uploadPoster(organization.id, id, poster)
  const { error } = await supabase
    .from('events')
    .insert({ id, organization_id: organization.id, ...values, poster_path: posterPath })

  if (error) {
    await removePosters([posterPath])
    throw new Error(error.message)
  }
}

// Saves the officer's changes to a request in revision and sends it back to the admin.
// Leave out the poster to keep the current one.
export async function resubmitEvent(event: OrgEvent, input: EventInput, poster: File | null) {
  const values = clean(input)

  if (sampleStore) {
    Object.assign(findReviewable(event.id, ['revision']), values, {
      poster_path: poster ? URL.createObjectURL(poster) : event.poster_path,
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    return
  }

  const posterPath = poster
    ? await uploadPoster(event.organization_id, event.id, poster)
    : event.poster_path
  const { data, error } = await supabase
    .from('events')
    .update({ ...values, poster_path: posterPath, status: 'pending' })
    .eq('id', event.id)
    .eq('status', 'revision')
    .select('id')

  if (error || data.length === 0) {
    if (poster) await removePosters([posterPath])
    throw error
      ? new Error(error.message)
      : new Error('This request can no longer be edited. Refresh the page and try again.')
  }

  // Only drop the replaced poster once the new one is saved.
  if (poster) await removePosters([event.poster_path])
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

async function uploadPoster(organizationId: string, eventId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  // A new name each time, so browsers don't keep showing a cached old poster.
  const path = `${organizationId}/${eventId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(EVENT_BUCKET).upload(path, file, { contentType: file.type })

  if (error) throw new Error(`Could not upload “${file.name}”: ${error.message}`)
  return path
}

async function removePosters(paths: (string | null)[]) {
  const existing = paths.filter((path): path is string => !!path && !path.startsWith('blob:'))
  if (existing.length === 0) return
  // A leftover file is harmless, so a failed cleanup shouldn't block the user.
  await supabase.storage.from(EVENT_BUCKET).remove(existing)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clean(input: EventInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    venue: input.venue.trim(),
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    audience: input.audience,
    // The database only accepts colleges when the audience is 'colleges'.
    audience_colleges: input.audience === 'colleges' ? input.audience_colleges : [],
    registration_url: input.registration_url.trim() || null,
  }
}

function findReviewable(id: string, allowed: EventStatus[]): OrgEvent {
  const event = findSample(id)
  if (!allowed.includes(event.status)) throw notFound()
  return event
}

async function currentUserId() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

// Row-level security hides rows instead of raising an error, so 0 rows means
// "not allowed, gone, or already reviewed by someone else".
function notFound() {
  return new Error('This request was not found or was already reviewed. Refresh the page and try again.')
}
