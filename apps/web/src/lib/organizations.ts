import { supabase } from './supabase'

export type OrgStatus = 'active' | 'archived'

export type Testimonial = { author: string; text: string }

export type Organization = {
  id: string
  // The year it was added and its number within that year, e.g. "2026-001". Set by the database.
  org_code: string
  name: string
  categories: string[]
  // A college from DEPARTMENT_OPTIONS, or "University Wide".
  department: string
  description: string | null
  vision: string | null
  mission: string | null
  room_number: string | null
  telegram_contact: string | null
  facebook_contact: string | null
  program_eligibility: string
  reasons_to_join: string[]
  testimonials: Testimonial[]
  // Paths inside the "org-media" storage bucket.
  logo_path: string | null
  photo_paths: string[]
  status: OrgStatus
  archived_at: string | null
  created_at: string
  updated_at: string
  // Only the sample data has these until memberships and events are stored in Supabase.
  member_count?: number
  event_count?: number
}

// What the add/edit form sends. Empty strings and blank list items are dropped.
export type OrganizationInput = {
  name: string
  categories: string[]
  department: string
  description: string
  vision: string
  mission: string
  room_number: string
  telegram_contact: string
  facebook_contact: string
  program_eligibility: string
  reasons_to_join: string[]
  testimonials: Testimonial[]
}

// New files from the form, plus the existing photos the user kept.
export type OrganizationFiles = {
  logo: File | null
  keptPhotoPaths: string[]
  newPhotos: File[]
}

export const PRESET_CATEGORIES = ['Academic', 'Cultural', 'Sports', 'Religious', 'Special Interest']
export const MAX_CATEGORIES = 3

// Edit this list to match the colleges NEU actually has.
export const COLLEGES = [
  'College of Accountancy',
  'College of Arts and Sciences',
  'College of Business Administration',
  'College of Communication',
  'College of Computer Studies',
  'College of Criminology',
  'College of Education',
  'College of Engineering and Architecture',
  'College of Medical Technology',
  'College of Music',
  'College of Nursing',
  'College of Physical Therapy',
  'College of Respiratory Therapy',
]

export const ALL_PROGRAMS = 'All Programs'
export const PROGRAM_OPTIONS = [ALL_PROGRAMS, ...COLLEGES]

// For orgs open to students of every course, whatever their college.
export const UNIVERSITY_WIDE = 'University Wide'
export const DEPARTMENT_OPTIONS = [UNIVERSITY_WIDE, ...COLLEGES]

const MEDIA_BUCKET = 'org-media'
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const LOGO_MAX_BYTES = 2 * 1024 * 1024
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const MAX_PHOTOS = 10

export function mediaUrl(path: string | null): string | null {
  if (!path) return null
  // Sample-data uploads are kept as temporary browser URLs.
  if (path.startsWith('blob:')) return path
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}

// ---------------------------------------------------------------------------
// Sample data, used while the organizations table isn't in Supabase yet.
// ---------------------------------------------------------------------------

let sampleStore: Organization[] | null = null
// Numbers the sample orgs' IDs, like the database does for real ones.
let sampleCount = 0

export function usingSampleData() {
  return sampleStore !== null
}

function isMissingTable(error: { code?: string }) {
  // PGRST205: table not in PostgREST's schema cache. 42P01: table doesn't exist.
  return error.code === 'PGRST205' || error.code === '42P01'
}

function sampleOrganization(
  name: string,
  categories: string[],
  member_count: number,
  event_count: number,
  extra: Partial<Organization> = {},
): Organization {
  const now = new Date().toISOString()
  sampleCount += 1
  return {
    id: crypto.randomUUID(),
    org_code: `${now.slice(0, 4)}-${String(sampleCount).padStart(3, '0')}`,
    name,
    categories,
    department: UNIVERSITY_WIDE,
    description: null,
    vision: null,
    mission: null,
    room_number: null,
    telegram_contact: null,
    facebook_contact: null,
    program_eligibility: ALL_PROGRAMS,
    reasons_to_join: [],
    testimonials: [],
    logo_path: null,
    photo_paths: [],
    status: 'active',
    archived_at: null,
    created_at: now,
    updated_at: now,
    member_count,
    event_count,
    ...extra,
  }
}

function createSampleStore(): Organization[] {
  return [
    sampleOrganization('Computer Studies Society', ['Academic', 'Special Interest'], 128, 6, {
      department: 'College of Computer Studies',
      description: 'A community for students who love building software, hardware and ideas.',
      vision: 'A campus where every student can build technology that helps people.',
      mission: 'To grow skilled, ethical and collaborative computing professionals.',
      room_number: 'Room 402, CCS Building',
      telegram_contact: '@css_neu',
      facebook_contact: 'CSS NEU Main',
      program_eligibility: 'College of Computer Studies',
      reasons_to_join: ['Hands-on workshops every month', 'Hackathons and coding contests'],
      testimonials: [{ author: 'Sample Alumnus', text: 'CSS taught me teamwork outside the classroom.' }],
    }),
    sampleOrganization('Junior Philippine Institute of Accountants', ['Academic'], 214, 9, {
      department: 'College of Accountancy',
    }),
    sampleOrganization('NEU Debate Society', ['Academic', 'Special Interest'], 42, 3),
    sampleOrganization('Nursing Students Association', ['Academic'], 176, 5, {
      department: 'College of Nursing',
    }),
    sampleOrganization('Engineering Council', ['Academic'], 158, 7, {
      department: 'College of Engineering and Architecture',
    }),
    sampleOrganization('NEU Music Club', ['Cultural', 'Special Interest'], 64, 4),
  ]
}

function findSample(id: string): Organization {
  const org = sampleStore?.find((item) => item.id === id)
  if (!org) throw notFound()
  return org
}

// ---------------------------------------------------------------------------
// Reads and writes. Each one uses the sample data instead while it's active.
// ---------------------------------------------------------------------------

export async function fetchOrganizations(status: OrgStatus): Promise<Organization[]> {
  if (!sampleStore) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('status', status)
      .order(status === 'archived' ? 'archived_at' : 'name', { ascending: status !== 'archived' })

    if (!error) return data
    if (!isMissingTable(error)) throw friendlyError(error)
    sampleStore = createSampleStore()
  }

  return sampleStore
    .filter((org) => org.status === status)
    .sort((a, b) =>
      status === 'archived'
        ? (b.archived_at ?? '').localeCompare(a.archived_at ?? '')
        : a.name.localeCompare(b.name),
    )
}

// The organizations with these IDs, by name. For officers, who only work with their own.
export async function fetchOrganizationsByIds(ids: string[]): Promise<Organization[]> {
  if (ids.length === 0) return []

  if (!sampleStore) {
    const { data, error } = await supabase.from('organizations').select('*').in('id', ids).order('name')

    if (!error) return data
    if (!isMissingTable(error)) throw friendlyError(error)
    sampleStore = createSampleStore()
  }

  return sampleStore.filter((org) => ids.includes(org.id)).sort((a, b) => a.name.localeCompare(b.name))
}

export async function createOrganization(input: OrganizationInput, files: OrganizationFiles) {
  const values = clean(input)
  const id = crypto.randomUUID()

  if (sampleStore) {
    checkSampleName(values.name)
    sampleStore.push(
      sampleOrganization(values.name, values.categories, 0, 0, {
        ...values,
        id,
        logo_path: files.logo ? URL.createObjectURL(files.logo) : null,
        photo_paths: files.newPhotos.map((file) => URL.createObjectURL(file)),
      }),
    )
    return
  }

  const uploaded = await uploadAll(id, files)
  const { error } = await supabase.from('organizations').insert({
    id,
    ...values,
    logo_path: uploaded.logoPath,
    photo_paths: uploaded.photoPaths,
    status: 'active',
  })

  if (error) {
    await removeFiles(uploaded.newPaths)
    throw friendlyError(error)
  }
}

export async function updateOrganization(
  org: Organization,
  input: OrganizationInput,
  files: OrganizationFiles,
) {
  const values = clean(input)

  if (sampleStore) {
    checkSampleName(values.name, org.id)
    Object.assign(findSample(org.id), values, {
      logo_path: files.logo ? URL.createObjectURL(files.logo) : org.logo_path,
      photo_paths: [...files.keptPhotoPaths, ...files.newPhotos.map((file) => URL.createObjectURL(file))],
      updated_at: new Date().toISOString(),
    })
    return
  }

  const uploaded = await uploadAll(org.id, files, org.logo_path)
  const { data, error } = await supabase
    .from('organizations')
    .update({ ...values, logo_path: uploaded.logoPath, photo_paths: uploaded.photoPaths })
    .eq('id', org.id)
    .select('id')

  if (error || data.length === 0) {
    await removeFiles(uploaded.newPaths)
    throw error ? friendlyError(error) : notFound()
  }

  // Only drop replaced or removed files once the new record is saved.
  const stillUsed = new Set([uploaded.logoPath, ...uploaded.photoPaths])
  await removeFiles([org.logo_path, ...org.photo_paths].filter((path) => path && !stillUsed.has(path)))
}

export async function archiveOrganization(id: string) {
  await setStatus(id, { status: 'archived', archived_at: new Date().toISOString() })
}

export async function restoreOrganization(id: string) {
  await setStatus(id, { status: 'active', archived_at: null })
}

export async function deleteOrganizationForever(org: Organization) {
  if (sampleStore) {
    findSample(org.id)
    sampleStore = sampleStore.filter((item) => item.id !== org.id)
    return
  }

  const { data, error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', org.id)
    .select('id')
  if (error) throw friendlyError(error)
  if (data.length === 0) throw notFound()
  await removeFiles([org.logo_path, ...org.photo_paths])
}

async function setStatus(id: string, changes: { status: OrgStatus; archived_at: string | null }) {
  if (sampleStore) {
    Object.assign(findSample(id), changes)
    return
  }

  const { data, error } = await supabase
    .from('organizations')
    .update(changes)
    .eq('id', id)
    .select('id')
  if (error) throw friendlyError(error)
  if (data.length === 0) throw notFound()
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

async function uploadAll(orgId: string, files: OrganizationFiles, currentLogo: string | null = null) {
  const newPaths: string[] = []
  try {
    const logoPath = files.logo ? await uploadFile(orgId, 'logo', files.logo) : currentLogo
    if (files.logo && logoPath) newPaths.push(logoPath)
    for (const photo of files.newPhotos) {
      newPaths.push(await uploadFile(orgId, 'photos', photo))
    }
    const photoPaths = [...files.keptPhotoPaths, ...newPaths.filter((path) => path !== logoPath)]
    return { logoPath, photoPaths, newPaths }
  } catch (error) {
    await removeFiles(newPaths)
    throw error
  }
}

async function uploadFile(orgId: string, folder: 'logo' | 'photos', file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  // A new name each time, so browsers don't keep showing a cached old image.
  const path = `${orgId}/${folder}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type })

  if (error) throw new Error(`Could not upload “${file.name}”: ${error.message}`)
  return path
}

async function removeFiles(paths: (string | null)[]) {
  const existing = paths.filter((path): path is string => !!path && !path.startsWith('blob:'))
  if (existing.length === 0) return
  // A leftover file is harmless, so a failed cleanup shouldn't block the user.
  await supabase.storage.from(MEDIA_BUCKET).remove(existing)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clean(input: OrganizationInput) {
  const optional = (value: string) => value.trim() || null
  return {
    name: input.name.trim(),
    categories: input.categories.map((category) => category.trim()).filter(Boolean),
    department: input.department,
    description: optional(input.description),
    vision: optional(input.vision),
    mission: optional(input.mission),
    room_number: optional(input.room_number),
    telegram_contact: optional(input.telegram_contact),
    facebook_contact: optional(input.facebook_contact),
    program_eligibility: input.program_eligibility || ALL_PROGRAMS,
    reasons_to_join: input.reasons_to_join.map((reason) => reason.trim()).filter(Boolean),
    testimonials: input.testimonials
      .map(({ author, text }) => ({ author: author.trim(), text: text.trim() }))
      .filter(({ text }) => text),
  }
}

function checkSampleName(name: string, ignoreId?: string) {
  const taken = sampleStore?.some(
    (org) => org.id !== ignoreId && org.name.toLowerCase() === name.toLowerCase(),
  )
  if (taken) throw friendlyError({ code: '23505', message: '' })
}

// Row-level security hides rows instead of raising an error, so 0 rows means "not allowed or gone".
function notFound() {
  return new Error('This organization was not found, or your account is not allowed to change it.')
}

function friendlyError(error: { code?: string; message: string }) {
  if (error.code === '23505') {
    return new Error('An organization with this name already exists (check Trash too).')
  }
  return new Error(error.message)
}
