import { type Organization, usingSampleData } from './organizations'
import { supabase } from './supabase'

// A student's pending application to join an organization, with the profile
// details the Recruitment page shows.
export type Application = {
  id: string
  organization_id: string
  profile_id: string
  name: string
  email: string
  // "2022-00002", or null until it's filled in on the profile.
  student_no: string | null
  year_level: number | null
  // From the application form: "BS Computer Science"
  program: string
  social_url: string
  applied_at: string
}

// ---------------------------------------------------------------------------
// Sample data, used while the recruitment tables aren't in Supabase yet.
// ---------------------------------------------------------------------------

// The sample applications, by organization ID. Each organization gets its own
// set the first time it's opened.
let sampleStore: Map<string, Application[]> | null = null
// Recruitment open or closed per organization, while the column is missing.
const sampleRecruitment = new Map<string, boolean>()

export function usingSampleApplications() {
  return sampleStore !== null
}

function isMissingTable(error: { code?: string }) {
  // PGRST205: table not in PostgREST's schema cache. 42P01: table doesn't exist.
  return error.code === 'PGRST205' || error.code === '42P01'
}

function isMissingColumn(error: { code?: string }) {
  // 42703: column doesn't exist. PGRST204: column not in PostgREST's schema cache.
  return error.code === '42703' || error.code === 'PGRST204'
}

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function createSampleApplications(organizationId: string): Application[] {
  const sample = (
    name: string,
    student_no: string,
    year_level: number,
    program: string,
    days: number,
  ): Application => ({
    id: crypto.randomUUID(),
    organization_id: organizationId,
    profile_id: crypto.randomUUID(),
    name,
    email: `student${Number(student_no.slice(-5))}@orgfinder.com`,
    student_no,
    year_level,
    program,
    social_url: 'https://www.facebook.com/',
    applied_at: daysAgo(days),
  })

  return [
    sample('Juan Dela Cruz', '2022-00002', 2, 'BS Computer Science', 3),
    sample('Ana Reyes', '2023-00003', 4, 'BS Information Technology', 2),
    sample('Paolo Ramos', '2024-00005', 1, 'BS Accountancy', 0),
  ]
}

function sampleApplications(organizationId: string) {
  sampleStore ??= new Map()
  if (!sampleStore.has(organizationId)) {
    sampleStore.set(organizationId, createSampleApplications(organizationId))
  }
  return sampleStore.get(organizationId)!
}

function removeSample(id: string) {
  for (const [orgId, applications] of sampleStore ?? []) {
    if (applications.some((application) => application.id === id)) {
      sampleStore!.set(
        orgId,
        applications.filter((application) => application.id !== id),
      )
      return
    }
  }
  throw new Error('This application was not found, or your account is not allowed to decide it.')
}

// ---------------------------------------------------------------------------
// Reads and writes. Each one uses the sample data instead while it's active.
// ---------------------------------------------------------------------------

type ApplicationRow = Omit<Application, 'name' | 'email' | 'student_no' | 'year_level'> & {
  profiles: {
    full_name: string | null
    email: string
    student_no: string | null
    year_level: number | null
  } | null
}

// The organization's pending applications, oldest first.
export async function fetchPendingApplications(organizationId: string): Promise<Application[]> {
  if (!sampleStore) {
    const { data, error } = await supabase
      .from('membership_applications')
      // Named by its foreign key: decided_by points at profiles too.
      .select(
        'id, organization_id, profile_id, program, social_url, applied_at, profiles!membership_applications_profile_id_fkey(full_name, email, student_no, year_level)',
      )
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('applied_at')

    if (!error) {
      return (data as unknown as ApplicationRow[]).map(({ profiles, ...row }) => ({
        ...row,
        name: profiles?.full_name || profiles?.email || 'Unknown student',
        email: profiles?.email ?? '',
        student_no: profiles?.student_no ?? null,
        year_level: profiles?.year_level ?? null,
      }))
    }
    if (!isMissingTable(error)) throw new Error(error.message)
  }

  return [...sampleApplications(organizationId)]
}

// For the officer dashboard card: pending applications across the officer's organizations.
export async function countMyPendingApplications(organizationIds: string[]): Promise<number> {
  if (organizationIds.length === 0) return 0

  if (!sampleStore) {
    const { count, error } = await supabase
      .from('membership_applications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .in('organization_id', organizationIds)

    if (!error) return count ?? 0
    if (!isMissingTable(error)) throw new Error(error.message)
  }

  return organizationIds.reduce((total, id) => total + sampleApplications(id).length, 0)
}

// Marks the application accepted and adds the student as a member.
export async function acceptApplication(id: string) {
  await decide('accept_application', id)
}

export async function declineApplication(id: string) {
  await decide('decline_application', id)
}

async function decide(fn: 'accept_application' | 'decline_application', id: string) {
  if (sampleStore) {
    removeSample(id)
    return
  }

  const { error } = await supabase.rpc(fn, { target_application_id: id })
  if (error) throw new Error(error.message)
}

export function isRecruitmentOpen(org: Organization) {
  return sampleRecruitment.get(org.id) ?? org.recruitment_open ?? false
}

// Opens or closes recruitment for the organization.
export async function setRecruitmentOpen(organizationId: string, open: boolean) {
  // Sample organizations aren't in Supabase, so their setting stays here too.
  if (!sampleRecruitment.has(organizationId) && !usingSampleData()) {
    const { data, error } = await supabase
      .from('organizations')
      .update({ recruitment_open: open })
      .eq('id', organizationId)
      .select('id')

    if (!error) {
      // Row-level security hides rows instead of raising an error.
      if (data.length === 0) {
        throw new Error('This organization was not found, or your account is not allowed to change it.')
      }
      return
    }
    if (!isMissingColumn(error)) throw new Error(error.message)
  }

  sampleRecruitment.set(organizationId, open)
}
