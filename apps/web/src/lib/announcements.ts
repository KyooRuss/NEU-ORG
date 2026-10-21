import { supabase } from './supabase'

export type AnnouncementAudience = 'university' | 'department'

export const ANNOUNCEMENT_AUDIENCES: { value: AnnouncementAudience; label: string }[] = [
  { value: 'university', label: 'University Wide' },
  { value: 'department', label: 'Department-only' },
]

export type Announcement = {
  id: string
  organization_id: string
  title: string
  description: string
  audience: AnnouncementAudience
  // "2026-10-24": the date chosen on the form.
  announcement_date: string
  created_at: string
}

// What the officer fills in on the form.
export type AnnouncementInput = Pick<Announcement, 'title' | 'description' | 'audience' | 'announcement_date'>

const COLUMNS = 'id, organization_id, title, description, audience, announcement_date, created_at'

// ---------------------------------------------------------------------------
// Sample data, used while the announcements table isn't in Supabase yet.
// Nothing is saved: it's gone after a reload.
// ---------------------------------------------------------------------------

let sampleStore: Announcement[] | null = null

export function usingSampleAnnouncements() {
  return sampleStore !== null
}

function isMissingTable(error: { code?: string }) {
  // PGRST205: table not in PostgREST's schema cache. 42P01: table doesn't exist.
  return error.code === 'PGRST205' || error.code === '42P01'
}

// Newest date first, and the latest posted first within a day.
function newestFirst(a: Announcement, b: Announcement) {
  return b.announcement_date.localeCompare(a.announcement_date) || b.created_at.localeCompare(a.created_at)
}

const notFound = 'This announcement was not found, or your account is not allowed to change it.'

// ---------------------------------------------------------------------------
// Reads and writes. Each one uses the sample data instead while it's active.
// ---------------------------------------------------------------------------

// The organization's announcements, newest first.
export async function fetchAnnouncements(organizationId: string): Promise<Announcement[]> {
  if (!sampleStore) {
    const { data, error } = await supabase
      .from('announcements')
      .select(COLUMNS)
      .eq('organization_id', organizationId)
      .order('announcement_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error) return data as Announcement[]
    if (!isMissingTable(error)) throw new Error(error.message)
    sampleStore = []
  }

  return sampleStore.filter((item) => item.organization_id === organizationId).sort(newestFirst)
}

// For the officer dashboard: the latest announcements across the officer's organizations.
export async function fetchRecentAnnouncements(organizationIds: string[], limit = 5): Promise<Announcement[]> {
  if (organizationIds.length === 0) return []

  if (!sampleStore) {
    const { data, error } = await supabase
      .from('announcements')
      .select(COLUMNS)
      .in('organization_id', organizationIds)
      .order('announcement_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!error) return data as Announcement[]
    if (!isMissingTable(error)) throw new Error(error.message)
    sampleStore = []
  }

  return sampleStore
    .filter((item) => organizationIds.includes(item.organization_id))
    .sort(newestFirst)
    .slice(0, limit)
}

export async function createAnnouncement(organizationId: string, input: AnnouncementInput) {
  if (!sampleStore) {
    // posted_by defaults to the logged-in user.
    const { error } = await supabase.from('announcements').insert({ ...input, organization_id: organizationId })

    if (!error) return
    if (!isMissingTable(error)) throw new Error(error.message)
    sampleStore = []
  }

  sampleStore.push({
    ...input,
    id: crypto.randomUUID(),
    organization_id: organizationId,
    created_at: new Date().toISOString(),
  })
}

export async function updateAnnouncement(id: string, input: AnnouncementInput) {
  if (!sampleStore) {
    const { data, error } = await supabase.from('announcements').update(input).eq('id', id).select('id')

    if (error) throw new Error(error.message)
    // Row-level security hides rows instead of raising an error.
    if (data.length === 0) throw new Error(notFound)
    return
  }

  const index = sampleStore.findIndex((item) => item.id === id)
  if (index === -1) throw new Error(notFound)
  sampleStore[index] = { ...sampleStore[index], ...input }
}

export async function deleteAnnouncement(id: string) {
  if (!sampleStore) {
    const { data, error } = await supabase.from('announcements').delete().eq('id', id).select('id')

    if (error) throw new Error(error.message)
    if (data.length === 0) throw new Error(notFound)
    return
  }

  if (!sampleStore.some((item) => item.id === id)) throw new Error(notFound)
  sampleStore = sampleStore.filter((item) => item.id !== id)
}
