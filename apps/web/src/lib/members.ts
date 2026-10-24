import { supabase } from './supabase'

// A student who joined an organization (an officer accepted their application
// on the Recruitment page), with the profile details the Members page shows.
export type Member = {
  id: string
  organization_id: string
  profile_id: string
  name: string
  email: string
  // "2022-00002", or null until it's filled in on the profile.
  student_no: string | null
  year_level: number | null
  // From their accepted application, e.g. "BS Computer Science". Null if there isn't one.
  program: string | null
  joined_at: string
}

// Members and approved events per organization, for the admin pages.
export type OrganizationCounts = Map<string, { members: number; events: number }>

// Set while the membership tables aren't in Supabase yet, so the pages can say so.
let missingTables = false

export function usingSampleMembers() {
  return missingTables
}

function isMissingTable(error: { code?: string }) {
  // PGRST205: table not in PostgREST's schema cache. 42P01: table doesn't exist.
  return error.code === 'PGRST205' || error.code === '42P01'
}

type MemberRow = {
  id: string
  organization_id: string
  profile_id: string
  joined_at: string
  profiles: {
    full_name: string | null
    email: string
    student_no: string | null
    year_level: number | null
  } | null
}

// The organization's members, newest first.
export async function fetchMembers(organizationId: string): Promise<Member[]> {
  const [members, accepted] = await Promise.all([
    supabase
      .from('organization_members')
      .select('id, organization_id, profile_id, joined_at, profiles(full_name, email, student_no, year_level)')
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: false }),
    // The program comes from the application they were accepted with.
    supabase
      .from('membership_applications')
      .select('profile_id, program, decided_at')
      .eq('organization_id', organizationId)
      .eq('status', 'accepted')
      .order('decided_at', { ascending: false }),
  ])

  if (members.error) {
    if (!isMissingTable(members.error)) throw new Error(members.error.message)
    missingTables = true
    return []
  }
  missingTables = false

  // Newest first, so the first one seen for each student is their latest.
  const programs = new Map<string, string>()
  for (const row of accepted.data ?? []) {
    if (!programs.has(row.profile_id)) programs.set(row.profile_id, row.program)
  }

  return (members.data as unknown as MemberRow[]).map(({ profiles, ...row }) => ({
    ...row,
    name: profiles?.full_name || profiles?.email || 'Unknown student',
    email: profiles?.email ?? '',
    student_no: profiles?.student_no ?? null,
    year_level: profiles?.year_level ?? null,
    program: programs.get(row.profile_id) ?? null,
  }))
}

// Takes the student out of the organization. They can apply again later.
export async function removeMember(id: string) {
  const { error } = await supabase.rpc('remove_member', { target_member_id: id })
  if (error) throw new Error(error.message)
}

// For the officer dashboard card: members across the officer's organizations.
export async function countMembers(organizationIds: string[]): Promise<number> {
  if (organizationIds.length === 0) return 0

  const { count, error } = await supabase
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .in('organization_id', organizationIds)

  if (!error) return count ?? 0
  if (isMissingTable(error)) return 0
  throw new Error(error.message)
}

// Members and approved (public) events for every organization. Counted here
// from the organization IDs, which is plenty fast at a school's size.
export async function fetchOrganizationCounts(): Promise<OrganizationCounts> {
  const [members, events] = await Promise.all([
    supabase.from('organization_members').select('organization_id'),
    supabase.from('events').select('organization_id').eq('status', 'approved'),
  ])

  const counts: OrganizationCounts = new Map()
  const entry = (id: string) => {
    let value = counts.get(id)
    if (!value) {
      value = { members: 0, events: 0 }
      counts.set(id, value)
    }
    return value
  }

  if (members.error && !isMissingTable(members.error)) throw new Error(members.error.message)
  if (events.error && !isMissingTable(events.error)) throw new Error(events.error.message)
  for (const row of members.data ?? []) entry(row.organization_id).members += 1
  for (const row of events.data ?? []) entry(row.organization_id).events += 1
  return counts
}
