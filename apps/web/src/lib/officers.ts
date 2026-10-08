import { supabase } from './supabase'

export type OfficerStatus = 'active' | 'inactive'

export type Officer = {
  id: string
  // "A0001"
  admin_no: string
  profile_id: string
  name: string
  email: string
  organization_id: string
  organization_name: string
  position: string
  status: OfficerStatus
  created_at: string
}

// ---------------------------------------------------------------------------
// Sample data, used while the officers table isn't in Supabase yet.
// ---------------------------------------------------------------------------

let sampleStore: Officer[] | null = null

export function usingSampleOfficers() {
  return sampleStore !== null
}

function isMissingTable(error: { code?: string }) {
  // PGRST205: table not in PostgREST's schema cache. 42P01: table doesn't exist.
  return error.code === 'PGRST205' || error.code === '42P01'
}

function createSampleStore(): Officer[] {
  const orgs = new Map<string, string>()
  const orgId = (name: string) => {
    if (!orgs.has(name)) orgs.set(name, crypto.randomUUID())
    return orgs.get(name)!
  }

  const sample = (
    number: number,
    name: string,
    organization_name: string,
    position: string,
    status: OfficerStatus = 'active',
  ): Officer => ({
    id: crypto.randomUUID(),
    admin_no: `A${String(number).padStart(4, '0')}`,
    profile_id: crypto.randomUUID(),
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@neu.edu.ph`,
    organization_id: orgId(organization_name),
    organization_name,
    position,
    status,
    created_at: new Date().toISOString(),
  })

  return [
    sample(1, 'Maria Santos', 'Cybersecurity Alliance', 'Organization President'),
    sample(2, 'Carlos Mendoza', 'Code Innovators Guild', 'Organization President'),
    sample(3, 'Angela Reyes', 'Cybersecurity Alliance', 'Admin Officer'),
    sample(4, 'Joshua Cruz', 'Code Innovators Guild', 'Admin Officer', 'inactive'),
    sample(5, 'Patricia Villanueva', 'Junior Philippine Institute of Accountants', 'Organization President'),
    sample(6, 'Mark Bautista', 'NEU Debate Society', 'Admin Officer'),
  ]
}

function findSample(id: string): Officer {
  const officer = sampleStore?.find((item) => item.id === id)
  if (!officer) throw notFound()
  return officer
}

// ---------------------------------------------------------------------------
// Reads and writes. Each one uses the sample data instead while it's active.
// ---------------------------------------------------------------------------

// Includes the officer's name and email, and the organization's name.
const OFFICER_COLUMNS =
  'id, admin_no, profile_id, organization_id, position, status, created_at, profile:profiles(full_name, email), organization:organizations(name)'

type OfficerRow = Omit<Officer, 'name' | 'email' | 'organization_name'> & {
  profile: { full_name: string | null; email: string } | null
  organization: { name: string } | null
}

function fromRow({ profile, organization, ...row }: OfficerRow): Officer {
  return {
    ...row,
    name: profile?.full_name || profile?.email || 'Unknown officer',
    email: profile?.email ?? '',
    organization_name: organization?.name ?? 'Unknown organization',
  }
}

export async function fetchOfficers(): Promise<Officer[]> {
  if (!sampleStore) {
    const { data, error } = await supabase
      .from('officers')
      .select(OFFICER_COLUMNS)
      .order('admin_no')

    if (!error) return (data as unknown as OfficerRow[]).map(fromRow)
    if (!isMissingTable(error)) throw new Error(error.message)
    sampleStore = createSampleStore()
  }

  return [...sampleStore].sort((a, b) => a.admin_no.localeCompare(b.admin_no))
}

// Goes through the set_officer_status database function, which also updates the
// person's role. Reactivating fails while the organization has another active president.
export async function setOfficerStatus(id: string, status: OfficerStatus) {
  if (sampleStore) {
    findSample(id).status = status
    return
  }

  const { error } = await supabase.rpc('set_officer_status', { target_officer: id, new_status: status })
  if (error) throw new Error(error.message)
}

// The positions an officer can hold. Each organization has at most one active person in each.
export const OFFICER_POSITIONS = ['President', 'Adviser'] as const
export type OfficerPosition = (typeof OFFICER_POSITIONS)[number]

// Makes the account the active holder of the position in the organization. Whoever
// held that position there, if anyone, becomes inactive and may lose officer access.
export async function assignOfficer(profileId: string, organizationId: string, position: OfficerPosition) {
  if (sampleStore) throw new Error('Run the database migrations first. Officers can’t be added on sample data.')

  const { error } = await supabase.rpc('assign_officer', {
    target_profile: profileId,
    target_org: organizationId,
    target_position: position,
  })
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Picking the account to add as an officer.
// ---------------------------------------------------------------------------

export type OfficerCandidate = {
  id: string
  name: string
  email: string
  student_no: string | null
}

// Active student and officer accounts whose name, email or student number contains
// the query. Officers are included because one person can lead more than one organization.
export async function searchOfficerCandidates(query: string): Promise<OfficerCandidate[]> {
  // Commas and brackets would break the "or" filter below; % and * are wildcards.
  const text = query.replace(/[,()%*\\]/g, ' ').trim()
  if (!text) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, student_no')
    .in('role', ['student', 'officer'])
    .eq('status', 'active')
    .or(`full_name.ilike.%${text}%,email.ilike.%${text}%,student_no.ilike.%${text}%`)
    .order('full_name')
    .limit(10)

  if (error) throw new Error(error.message)
  return data.map(({ full_name, ...row }) => ({ ...row, name: full_name || row.email }))
}

function notFound() {
  return new Error('This officer was not found, or your account is not allowed to change it.')
}
