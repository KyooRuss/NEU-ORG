import type { AccountStatus } from './students'
import { supabase } from './supabase'

export type Professor = {
  id: string
  professor_no: string
  name: string
  email: string
  // A college from COLLEGES, or null until it's filled in.
  department: string | null
  status: AccountStatus
  // When the professor was moved to Trash, or null.
  archived_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Sample data, used while the professor columns aren't in Supabase yet.
// ---------------------------------------------------------------------------

let sampleStore: Professor[] | null = null

export function usingSampleProfessors() {
  return sampleStore !== null
}

function isMissingColumn(error: { code?: string }) {
  // 42703: column doesn't exist. PGRST204: column not in PostgREST's schema cache.
  return error.code === '42703' || error.code === 'PGRST204'
}

function createSampleStore(): Professor[] {
  const sample = (
    professor_no: string,
    name: string,
    department: string,
    status: AccountStatus = 'active',
  ): Professor => ({
    id: crypto.randomUUID(),
    professor_no,
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@neu.edu.ph`,
    department,
    status,
    archived_at: null,
    created_at: new Date().toISOString(),
  })

  return [
    sample('P0001', 'Dr. Ramon Castillo', 'College of Computer Studies'),
    sample('P0002', 'Prof. Liza Navarro', 'College of Accountancy'),
    sample('P0003', 'Engr. Victor Tan', 'College of Engineering and Architecture'),
    sample('P0004', 'Prof. Grace Aquino', 'College of Nursing', 'inactive'),
    sample('P0005', 'Dr. Miguel Santos', 'College of Arts and Sciences'),
  ]
}

function findSample(id: string): Professor {
  const professor = sampleStore?.find((item) => item.id === id)
  if (!professor) throw notFound()
  return professor
}

// ---------------------------------------------------------------------------
// Reads and writes. Each one uses the sample data instead while it's active.
// ---------------------------------------------------------------------------

type ProfessorRow = Omit<Professor, 'name'> & { full_name: string | null }

// Everyone with a professor number, including professors who are currently advisers.
// The professors in Trash when archived is true, the others otherwise.
export async function fetchProfessors(archived = false): Promise<Professor[]> {
  if (!sampleStore) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, professor_no, full_name, email, department, status, archived_at, created_at')
      .not('professor_no', 'is', null)
      .neq('role', 'admin')
      .filter('archived_at', archived ? 'not.is' : 'is', null)
      .order('professor_no')

    if (!error) {
      return (data as ProfessorRow[]).map(({ full_name, ...row }) => ({ ...row, name: full_name || row.email }))
    }
    if (!isMissingColumn(error)) throw new Error(error.message)
    sampleStore = createSampleStore()
  }

  return sampleStore
    .filter((professor) => (professor.archived_at !== null) === archived)
    .sort((a, b) => a.professor_no.localeCompare(b.professor_no))
}

export async function setProfessorStatus(id: string, status: AccountStatus) {
  if (sampleStore) {
    findSample(id).status = status
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', id)
    .not('professor_no', 'is', null)
    .neq('role', 'admin')
    .select('id')
  if (error) throw new Error(error.message)
  if (data.length === 0) throw notFound()
}

// Moves the professor to Trash, hiding them from the Professors list until restored.
// Refused while they're an active officer (an adviser), like deleting.
export async function archiveProfessor(id: string) {
  if (sampleStore) {
    findSample(id).archived_at = new Date().toISOString()
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .not('professor_no', 'is', null)
    .eq('role', 'student')
    .select('id')
  if (error) throw new Error(error.message)
  if (data.length === 0) {
    throw new Error('This professor was not found, or they are still an active officer. Remove them on Admin Officers first.')
  }
}

export async function restoreProfessor(id: string) {
  if (sampleStore) {
    findSample(id).archived_at = null
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ archived_at: null })
    .eq('id', id)
    .not('professor_no', 'is', null)
    .neq('role', 'admin')
    .select('id')
  if (error) throw new Error(error.message)
  if (data.length === 0) throw notFound()
}

// Deletes the professor's account for good, through the delete_professor database function.
export async function deleteProfessor(id: string) {
  if (sampleStore) {
    findSample(id)
    sampleStore = sampleStore.filter((professor) => professor.id !== id)
    return
  }

  const { error } = await supabase.rpc('delete_professor', { target_profile: id })
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Adding professors. Only admins can, through the add_professor database
// function (see the professor_invites migration).
// ---------------------------------------------------------------------------

// An email OSAS added as a professor that hasn't signed in yet.
export type ProfessorInvite = {
  email: string
  professor_no: string
  department: string
  created_at: string
}

// Makes the account with this email a professor ('linked'), or, when the email
// has no account yet, invites it so it becomes one on its first sign-in ('invited').
export async function addProfessor(
  email: string,
  professorNo: string,
  department: string,
): Promise<'linked' | 'invited'> {
  if (sampleStore) {
    sampleStore.push({
      id: crypto.randomUUID(),
      professor_no: professorNo.trim(),
      name: email.trim(),
      email: email.trim().toLowerCase(),
      department,
      status: 'active',
      archived_at: null,
      created_at: new Date().toISOString(),
    })
    return 'linked'
  }

  const { data, error } = await supabase.rpc('add_professor', {
    target_email: email,
    new_professor_no: professorNo,
    new_department: department,
  })
  if (error) throw new Error(error.message)
  return data === 'invited' ? 'invited' : 'linked'
}

// Invites waiting for their first sign-in, oldest first. Empty until the
// professor_invites migration is in Supabase.
export async function fetchProfessorInvites(): Promise<ProfessorInvite[]> {
  if (sampleStore) return []

  const { data, error } = await supabase
    .from('professor_invites')
    .select('email, professor_no, department, created_at')
    .order('created_at')
  if (error) {
    // PGRST205: table not in PostgREST's schema cache. 42P01: table doesn't exist.
    if (error.code === 'PGRST205' || error.code === '42P01') return []
    throw new Error(error.message)
  }
  return data
}

export async function cancelProfessorInvite(email: string) {
  const { data, error } = await supabase.from('professor_invites').delete().eq('email', email).select('email')
  if (error) throw new Error(error.message)
  if (data.length === 0) throw new Error('This invite was not found. They may have just signed in.')
}

// Row-level security hides rows instead of raising an error, so 0 rows means "not allowed or gone".
function notFound() {
  return new Error('This professor was not found, or your account is not allowed to change it.')
}
