import { supabase } from './supabase'

export type AccountStatus = 'active' | 'suspended' | 'inactive'

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  inactive: 'Inactive',
}

export type Student = {
  id: string
  // "2022-00002", or null until it's filled in.
  student_no: string | null
  name: string
  email: string
  year_level: number | null
  status: AccountStatus
  created_at: string
}

export const YEAR_LEVELS = [1, 2, 3, 4, 5]

// ---------------------------------------------------------------------------
// Sample data, used while the student columns aren't in Supabase yet.
// ---------------------------------------------------------------------------

let sampleStore: Student[] | null = null

export function usingSampleStudents() {
  return sampleStore !== null
}

function isMissingColumn(error: { code?: string }) {
  // 42703: column doesn't exist. PGRST204: column not in PostgREST's schema cache.
  return error.code === '42703' || error.code === 'PGRST204'
}

function createSampleStore(): Student[] {
  const sample = (
    student_no: string,
    name: string,
    year_level: number,
    status: AccountStatus = 'active',
  ): Student => ({
    id: crypto.randomUUID(),
    student_no,
    name,
    email: `student${Number(student_no.slice(-5))}@orgfinder.com`,
    year_level,
    status,
    created_at: new Date().toISOString(),
  })

  return [
    sample('2021-00001', 'Mark Villanueva', 4),
    sample('2022-00002', 'Juan dela Cruz', 2),
    sample('2023-00003', 'Ana Reyes', 4),
    sample('2023-00004', 'Bea Gonzales', 3, 'suspended'),
    sample('2024-00005', 'Paolo Ramos', 1),
    sample('2022-00006', 'Kristine Lim', 3, 'inactive'),
  ]
}

function findSample(id: string): Student {
  const student = sampleStore?.find((item) => item.id === id)
  if (!student) throw notFound()
  return student
}

// ---------------------------------------------------------------------------
// Reads and writes. Each one uses the sample data instead while it's active.
// ---------------------------------------------------------------------------

type StudentRow = Omit<Student, 'name'> & { full_name: string | null }

export async function fetchStudents(): Promise<Student[]> {
  if (!sampleStore) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, student_no, full_name, email, year_level, status, created_at')
      .eq('role', 'student')
      // Professors have the student role too; they have their own page.
      .is('professor_no', null)
      .order('student_no', { nullsFirst: false })

    if (!error) {
      return (data as StudentRow[]).map(({ full_name, ...row }) => ({ ...row, name: full_name || row.email }))
    }
    if (!isMissingColumn(error)) throw new Error(error.message)
    sampleStore = createSampleStore()
  }

  return [...sampleStore].sort((a, b) => (a.student_no ?? '').localeCompare(b.student_no ?? ''))
}

export async function setStudentStatus(id: string, status: AccountStatus) {
  if (sampleStore) {
    findSample(id).status = status
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', id)
    .eq('role', 'student')
    .is('professor_no', null)
    .select('id')
  if (error) throw new Error(error.message)
  if (data.length === 0) throw notFound()
}

// Deletes the student's account for good, through the delete_student database function.
export async function deleteStudent(id: string) {
  if (sampleStore) {
    findSample(id)
    sampleStore = sampleStore.filter((student) => student.id !== id)
    return
  }

  const { error } = await supabase.rpc('delete_student', { target_profile: id })
  if (error) throw new Error(error.message)
}

// Row-level security hides rows instead of raising an error, so 0 rows means "not allowed or gone".
function notFound() {
  return new Error('This student was not found, or your account is not allowed to change it.')
}
