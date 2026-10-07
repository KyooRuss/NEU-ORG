import { fetchOrganizations } from './organizations'
import { supabase } from './supabase'

export type EventStatus = 'pending' | 'revision' | 'approved' | 'declined'

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
  title: string
  description: string
  venue: string
  starts_at: string
  ends_at: string
  // Path inside the "event-media" storage bucket.
  poster_path: string | null
  status: EventStatus
  decline_reason: string | null
  submitted_at: string
  approved_at: string | null
  updated_at: string
  // How many revision comments it has. A pending request with comments was resubmitted.
  comment_count: number
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
export function formatEventDate(event: Pick<OrgEvent, 'starts_at' | 'ends_at'>) {
  const start = new Date(event.starts_at)
  const end = new Date(event.ends_at)
  if (start.toDateString() === end.toDateString()) {
    return `${dayFormat.format(start)} · ${timeFormat.format(start)} – ${timeFormat.format(end)}`
  }
  return `${dayFormat.format(start)}, ${timeFormat.format(start)} – ${dayFormat.format(end)}, ${timeFormat.format(end)}`
}

export function formatDay(iso: string) {
  return dayFormat.format(new Date(iso))
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
      ? { organization_id: orgs[index % orgs.length].id, organization_name: orgs[index % orgs.length].name }
      : { organization_id: `sample-org-${index}`, organization_name: 'Sample Organization' }

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

// Includes the organization's name and the number of revision comments.
const EVENT_COLUMNS = '*, organization:organizations(name), event_comments(count)'

type EventRow = Omit<OrgEvent, 'organization_name' | 'comment_count'> & {
  organization: { name: string } | null
  event_comments: { count: number }[]
}

function fromRow({ organization, event_comments, ...row }: EventRow): OrgEvent {
  return {
    ...row,
    organization_name: organization?.name ?? 'Unknown organization',
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
export async function fetchApprovedEvents(timing: EventTiming): Promise<OrgEvent[]> {
  const now = new Date().toISOString()

  if (!sampleStore) {
    const query = supabase.from('events').select(EVENT_COLUMNS).eq('status', 'approved')
    const { data, error } = await (timing === 'upcoming'
      ? query.gte('ends_at', now).order('starts_at', { ascending: true })
      : query.lt('ends_at', now).order('starts_at', { ascending: false }))

    if (!error) return (data as EventRow[]).map(fromRow)
    await ensureSampleStore(error)
  }

  return sampleStore!
    .filter(
      (event) =>
        event.status === 'approved' && (timing === 'upcoming' ? event.ends_at >= now : event.ends_at < now),
    )
    .sort((a, b) =>
      timing === 'upcoming'
        ? a.starts_at.localeCompare(b.starts_at)
        : b.starts_at.localeCompare(a.starts_at),
    )
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
  const now = new Date().toISOString()

  if (!sampleStore) {
    const { count, error } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('ends_at', now)

    if (!error) return count ?? 0
    await ensureSampleStore(error)
  }

  return sampleStore!.filter((event) => event.status === 'approved' && event.ends_at >= now).length
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
// Helpers
// ---------------------------------------------------------------------------

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
