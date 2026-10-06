import { supabase } from './supabase'

export type Responsibility = {
  id: string
  body: string
  position: number
}

const DEFAULT_RESPONSIBILITIES = [
  'Add, edit, deactivate, or delete user accounts and manage user roles.',
  'Add, edit, approve, or remove website content such as posts, announcements, and information.',
  'View, update, organize, and maintain records stored in the system.',
  'Review and approve or reject requests submitted by users or other staff.',
  'Monitor activities, view logs, manage system status, and ensure the website is functioning properly.',
]

// ---------------------------------------------------------------------------
// Sample data, used while the admin_responsibilities table isn't in Supabase yet.
// ---------------------------------------------------------------------------

let sampleStore: Responsibility[] | null = null

export function usingSampleResponsibilities() {
  return sampleStore !== null
}

function isMissingTable(error: { code?: string }) {
  // PGRST205: table not in PostgREST's schema cache. 42P01: table doesn't exist.
  return error.code === 'PGRST205' || error.code === '42P01'
}

// ---------------------------------------------------------------------------
// Reads and writes. Each one uses the sample data instead while it's active.
// ---------------------------------------------------------------------------

export async function fetchResponsibilities(): Promise<Responsibility[]> {
  if (!sampleStore) {
    const { data, error } = await supabase
      .from('admin_responsibilities')
      .select('id, body, position')
      .order('position')
      .order('created_at')

    if (!error) return data
    if (!isMissingTable(error)) throw new Error(error.message)
    sampleStore = DEFAULT_RESPONSIBILITIES.map((body, index) => ({
      id: crypto.randomUUID(),
      body,
      position: index + 1,
    }))
  }

  return [...sampleStore]
}

// Adds the item to the end of the list.
export async function createResponsibility(body: string, current: Responsibility[]) {
  const position = Math.max(0, ...current.map((item) => item.position)) + 1

  if (sampleStore) {
    sampleStore.push({ id: crypto.randomUUID(), body: body.trim(), position })
    return
  }

  const { error } = await supabase
    .from('admin_responsibilities')
    .insert({ body: body.trim(), position })
  if (error) throw new Error(error.message)
}

export async function updateResponsibility(id: string, body: string) {
  if (sampleStore) {
    const item = sampleStore.find((entry) => entry.id === id)
    if (!item) throw notFound()
    item.body = body.trim()
    return
  }

  const { data, error } = await supabase
    .from('admin_responsibilities')
    .update({ body: body.trim() })
    .eq('id', id)
    .select('id')
  if (error) throw new Error(error.message)
  if (data.length === 0) throw notFound()
}

export async function deleteResponsibility(id: string) {
  if (sampleStore) {
    sampleStore = sampleStore.filter((item) => item.id !== id)
    return
  }

  const { data, error } = await supabase
    .from('admin_responsibilities')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw new Error(error.message)
  if (data.length === 0) throw notFound()
}

// Row-level security hides rows instead of raising an error, so 0 rows means "not allowed or gone".
function notFound() {
  return new Error('This responsibility was not found, or your account is not allowed to change it.')
}
