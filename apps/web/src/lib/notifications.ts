import { fetchMyOrganizationIds } from './officers'
import { supabase } from './supabase'

// Notifications aren't stored. They're built from applications, events,
// comments, memorandums, feedback and sign-ups; the notification_reads table
// (shared with the mobile app) only remembers which ones each user has read.

// How far back the bell looks.
const FEED_DAYS = 30
const DAY = 24 * 60 * 60 * 1000

export type NotificationKind =
  | 'application'
  | 'approved'
  | 'declined'
  | 'revision'
  | 'memo'
  | 'feedback'
  | 'request'
  | 'resubmitted'
  | 'students'

export type WebNotification = {
  // Unique, and what's saved when it's read, e.g. "application:<id>".
  key: string
  kind: NotificationKind
  title: string
  body: string
  at: Date
  // The dashboard page it opens, by its menu label.
  page: string
}

type OrgRef = { name: string } | null

function since() {
  return new Date(Date.now() - FEED_DAYS * DAY).toISOString()
}

function newestFirst(items: WebNotification[]) {
  return items.sort((a, b) => b.at.getTime() - a.at.getTime())
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

// ---------------------------------------------------------------------------
// Officers
// ---------------------------------------------------------------------------

export async function fetchOfficerNotifications(profileId: string): Promise<WebNotification[]> {
  const orgIds = await fetchMyOrganizationIds(profileId)
  const from = since()
  const items: WebNotification[] = []

  // Everyone gets the memorandums OSAS uploads.
  const memos = await supabase.from('memorandums').select('id, title, created_at').gte('created_at', from)
  if (memos.error) throw new Error(memos.error.message)
  for (const memo of memos.data) {
    items.push({
      key: `memo:${memo.id}`,
      kind: 'memo',
      title: `OSAS posted a memorandum: ${memo.title}`,
      body: 'Open the Dashboard to view or download it.',
      at: new Date(memo.created_at),
      page: 'Dashboard',
    })
  }

  if (orgIds.length === 0) return newestFirst(items)

  const [applications, events, comments] = await Promise.all([
    supabase
      .from('membership_applications')
      .select('id, applied_at, organizations(name), profiles!membership_applications_profile_id_fkey(full_name, email)')
      .in('organization_id', orgIds)
      .eq('status', 'pending')
      .gte('applied_at', from),
    supabase
      .from('events')
      .select('id, title, status, decline_reason, approved_at, updated_at, starts_at, ends_at')
      .in('organization_id', orgIds)
      .gte('updated_at', from),
    supabase
      .from('event_comments')
      .select('id, body, created_at, events!inner(title, status, organization_id)')
      .in('events.organization_id', orgIds)
      .gte('created_at', from),
  ])
  if (applications.error) throw new Error(applications.error.message)
  if (events.error) throw new Error(events.error.message)
  if (comments.error) throw new Error(comments.error.message)

  for (const row of applications.data as unknown as {
    id: string
    applied_at: string
    organizations: OrgRef
    profiles: { full_name: string | null; email: string } | null
  }[]) {
    const name = row.profiles?.full_name || row.profiles?.email || 'A student'
    items.push({
      key: `application:${row.id}`,
      kind: 'application',
      title: `${name} applied to join ${row.organizations?.name ?? 'your organization'}`,
      body: 'Review the application on the Recruitment page.',
      at: new Date(row.applied_at),
      page: 'Recruitment',
    })
  }

  type EventRow = {
    id: string
    title: string
    status: 'pending' | 'revision' | 'approved' | 'declined'
    decline_reason: string | null
    approved_at: string | null
    updated_at: string
    starts_at: string
    ends_at: string | null
  }
  const eventRows = events.data as EventRow[]

  for (const row of eventRows) {
    if (row.status === 'approved' && row.approved_at) {
      items.push({
        key: `event-approved:${row.id}`,
        kind: 'approved',
        title: `“${row.title}” was approved`,
        body: 'It’s now public in the mobile app.',
        at: new Date(row.approved_at),
        page: 'Event Posts',
      })
    } else if (row.status === 'declined') {
      items.push({
        key: `event-declined:${row.id}`,
        kind: 'declined',
        title: `“${row.title}” was declined`,
        body: row.decline_reason ?? 'See Event Posts for details.',
        at: new Date(row.updated_at),
        page: 'Event Posts',
      })
    }
  }

  for (const row of comments.data as unknown as {
    id: string
    body: string
    created_at: string
    events: { title: string; status: string } | null
  }[]) {
    items.push({
      key: `event-revision:${row.id}`,
      kind: 'revision',
      title: `“${row.events?.title ?? 'Your event'}” was sent back for revision`,
      body: row.body,
      at: new Date(row.created_at),
      page: 'Event Posts',
    })
  }

  // Feedback: approved events that ended in the last 30 days. Officers only
  // ever see how many responded, so ratings stay anonymous.
  const now = Date.now()
  const ended = eventRows.filter((row) => {
    const end = new Date(row.ends_at ?? row.starts_at).getTime()
    return row.status === 'approved' && end < now && end > now - FEED_DAYS * DAY
  })
  const summaries = await Promise.all(
    ended.map((row) =>
      supabase
        .rpc('event_feedback_summary', { target_event: row.id })
        .then(({ data }) => ({ row, responses: (data as { responses: number }[] | null)?.[0]?.responses ?? 0 })),
    ),
  )
  for (const { row, responses } of summaries) {
    if (responses === 0) continue
    items.push({
      // Includes the count, so more ratings make it unread again.
      key: `feedback:${row.id}:${responses}`,
      kind: 'feedback',
      title: `${plural(responses, 'rating')} for “${row.title}”`,
      body: 'See how students rated it on the Feedback page.',
      at: new Date(row.ends_at ?? row.starts_at),
      page: 'Feedback',
    })
  }

  return newestFirst(items)
}

// ---------------------------------------------------------------------------
// Admins
// ---------------------------------------------------------------------------

export async function fetchAdminNotifications(): Promise<WebNotification[]> {
  const from = since()
  const [pending, students] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, submitted_at, updated_at, organizations(name), event_comments(count)')
      .eq('status', 'pending'),
    supabase.from('profiles').select('created_at').eq('role', 'student').gte('created_at', from),
  ])
  if (pending.error) throw new Error(pending.error.message)
  if (students.error) throw new Error(students.error.message)

  const items: WebNotification[] = []

  for (const row of pending.data as unknown as {
    id: string
    title: string
    submitted_at: string
    updated_at: string
    organizations: OrgRef
    event_comments: { count: number }[]
  }[]) {
    const org = row.organizations?.name ?? 'An organization'
    // A pending request with revision comments was sent back and resubmitted.
    if ((row.event_comments[0]?.count ?? 0) > 0) {
      items.push({
        // Includes the time, so resubmitting again makes it unread again.
        key: `resubmitted:${row.id}:${row.updated_at}`,
        kind: 'resubmitted',
        title: `${org} resubmitted “${row.title}” after revision`,
        body: 'Check the changes on Event Requests.',
        at: new Date(row.updated_at),
        page: 'Event Requests',
      })
    } else {
      items.push({
        key: `request:${row.id}`,
        kind: 'request',
        title: `${org} submitted “${row.title}” for approval`,
        body: 'Review it on Event Requests.',
        at: new Date(row.submitted_at),
        page: 'Event Requests',
      })
    }
  }

  // Sign-ups, one notification per day.
  const byDay = new Map<string, { count: number; latest: Date }>()
  for (const row of students.data) {
    const at = new Date(row.created_at)
    const day = at.toLocaleDateString('en-CA')
    const entry = byDay.get(day) ?? { count: 0, latest: at }
    entry.count += 1
    if (at > entry.latest) entry.latest = at
    byDay.set(day, entry)
  }
  for (const [day, { count, latest }] of byDay) {
    const label = latest.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    items.push({
      // Includes the count, so more sign-ups that day make it unread again.
      key: `students:${day}:${count}`,
      kind: 'students',
      title: `${plural(count, 'new student')} registered on ${label}`,
      body: 'See them on the Students page.',
      at: latest,
      page: 'Students',
    })
  }

  return newestFirst(items)
}

// ---------------------------------------------------------------------------
// Read state
// ---------------------------------------------------------------------------

function isMissingTable(error: { code?: string }) {
  // PGRST205: table not in PostgREST's schema cache. 42P01: table doesn't exist.
  return error.code === 'PGRST205' || error.code === '42P01'
}

// The keys the user has read. Until the notification_reads migration is in
// Supabase, everything counts as unread instead of the bell failing.
export async function fetchReadKeys(profileId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('notification_reads')
    .select('notification_key')
    .eq('profile_id', profileId)
  if (error) {
    if (isMissingTable(error)) return new Set()
    throw new Error(error.message)
  }
  return new Set(data.map((row) => row.notification_key as string))
}

export async function markRead(keys: string[]) {
  if (keys.length === 0) return
  const { error } = await supabase
    .from('notification_reads')
    .upsert(
      keys.map((key) => ({ notification_key: key })),
      { onConflict: 'profile_id,notification_key', ignoreDuplicates: true },
    )
  if (error) throw new Error(error.message)
  notifyReadChanged()
}

// Lets every bell on the page update as soon as something is marked read.
const listeners = new Set<() => void>()

export function onReadChanged(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notifyReadChanged() {
  for (const listener of listeners) listener()
}

// "just now", "5 minutes ago", "3 days ago"
export function timeAgo(date: Date): string {
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  const units: [number, string][] = [
    [60 * 60 * 24 * 7, 'week'],
    [60 * 60 * 24, 'day'],
    [60 * 60, 'hour'],
    [60, 'minute'],
  ]
  for (const [size, name] of units) {
    if (seconds >= size) return `${plural(Math.floor(seconds / size), name)} ago`
  }
  return 'just now'
}
