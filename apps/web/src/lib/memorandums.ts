import { supabase } from './supabase'

export type Memorandum = {
  id: string
  title: string
  file_name: string
  // Path inside the "memorandums" storage bucket.
  file_path: string
  created_at: string
}

const MEMO_BUCKET = 'memorandums'
export const MEMO_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]
export const MEMO_ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg'
export const MEMO_MAX_BYTES = 10 * 1024 * 1024

// ---------------------------------------------------------------------------
// Sample data, used while the memorandums table isn't in Supabase yet.
// ---------------------------------------------------------------------------

let sampleStore: Memorandum[] | null = null

export function usingSampleMemos() {
  return sampleStore !== null
}

function isMissingTable(error: { code?: string }) {
  // PGRST205: table not in PostgREST's schema cache. 42P01: table doesn't exist.
  return error.code === 'PGRST205' || error.code === '42P01'
}

function createSampleStore(): Memorandum[] {
  return [
    {
      id: crypto.randomUUID(),
      title: 'Suspension of Class',
      file_name: 'Suspension of Class Regarding Super Typhoon.pdf',
      // No real file behind the sample memo, so View has nothing to open.
      file_path: '',
      created_at: new Date().toISOString(),
    },
  ]
}

// ---------------------------------------------------------------------------
// Reads and writes. Each one uses the sample data instead while it's active.
// ---------------------------------------------------------------------------

export async function fetchMemorandums(): Promise<Memorandum[]> {
  if (!sampleStore) {
    const { data, error } = await supabase
      .from('memorandums')
      .select('id, title, file_name, file_path, created_at')
      .order('created_at', { ascending: false })

    if (!error) return data
    if (!isMissingTable(error)) throw new Error(error.message)
    sampleStore = createSampleStore()
  }

  return [...sampleStore]
}

export async function createMemorandum(title: string, file: File) {
  const cleanTitle = title.trim()

  if (sampleStore) {
    sampleStore.unshift({
      id: crypto.randomUUID(),
      title: cleanTitle,
      file_name: file.name,
      file_path: URL.createObjectURL(file),
      created_at: new Date().toISOString(),
    })
    return
  }

  const path = await uploadFile(file)
  const { error } = await supabase
    .from('memorandums')
    .insert({ title: cleanTitle, file_name: file.name, file_path: path })

  if (error) {
    await supabase.storage.from(MEMO_BUCKET).remove([path])
    throw new Error(error.message)
  }
}

// Changes the title and, when a new file is given, replaces the file.
export async function updateMemorandum(memo: Memorandum, title: string, file: File | null) {
  const cleanTitle = title.trim()

  if (sampleStore) {
    const item = sampleStore.find((entry) => entry.id === memo.id)
    if (!item) throw notFound()
    item.title = cleanTitle
    if (file) {
      if (item.file_path.startsWith('blob:')) URL.revokeObjectURL(item.file_path)
      item.file_name = file.name
      item.file_path = URL.createObjectURL(file)
    }
    return
  }

  const newPath = file ? await uploadFile(file) : null
  const { data, error } = await supabase
    .from('memorandums')
    .update(
      file && newPath
        ? { title: cleanTitle, file_name: file.name, file_path: newPath }
        : { title: cleanTitle },
    )
    .eq('id', memo.id)
    .select('id')

  if (error || data.length === 0) {
    if (newPath) await supabase.storage.from(MEMO_BUCKET).remove([newPath])
    throw error ? new Error(error.message) : notFound()
  }

  // Only drop the old file once the memo points to the new one.
  if (newPath) await supabase.storage.from(MEMO_BUCKET).remove([memo.file_path])
}

export async function deleteMemorandum(memo: Memorandum) {
  if (sampleStore) {
    sampleStore = sampleStore.filter((item) => item.id !== memo.id)
    return
  }

  const { data, error } = await supabase
    .from('memorandums')
    .delete()
    .eq('id', memo.id)
    .select('id')
  if (error) throw new Error(error.message)
  if (data.length === 0) throw notFound()
  // A leftover file is harmless, so a failed cleanup shouldn't block the user.
  await supabase.storage.from(MEMO_BUCKET).remove([memo.file_path])
}

async function uploadFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
  const path = `${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from(MEMO_BUCKET)
    .upload(path, file, { contentType: file.type })
  if (error) throw new Error(`Could not upload “${file.name}”: ${error.message}`)
  return path
}

// Row-level security hides rows instead of raising an error, so 0 rows means "not allowed or gone".
function notFound() {
  return new Error('This memorandum was not found, or your account is not allowed to change it.')
}

// A link that opens the file, valid for 10 minutes. Null when there's no file.
export async function memorandumUrl(memo: Memorandum): Promise<string | null> {
  if (!memo.file_path) return null
  if (memo.file_path.startsWith('blob:')) return memo.file_path

  const { data, error } = await supabase.storage
    .from(MEMO_BUCKET)
    .createSignedUrl(memo.file_path, 600)
  if (error) throw new Error(error.message)
  return data.signedUrl
}
