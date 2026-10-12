import { useEffect, useState } from 'react'

import {
  createOrganization,
  IMAGE_TYPES,
  LOGO_MAX_BYTES,
  MAX_CATEGORIES,
  MAX_PHOTOS,
  mediaUrl,
  type Organization,
  type OrganizationInput,
  PHOTO_MAX_BYTES,
  PRESET_CATEGORIES,
  PROGRAM_OPTIONS,
  type Testimonial,
  updateOrganization,
  updateOrganizationProfile,
} from '../lib/organizations'

// A photo already saved (path) or a new one picked in this form (file).
export type PhotoItem = { key: string; url: string; path?: string; file?: File }

// The state and rules shared by the Add Organization page and the edit form.
// Leave out the organization to add a new one; pass one to edit it.
// With profileOnly, saving leaves the admin-only fields alone (the officer's edit form).
export default function useOrganizationForm(org?: Organization, { profileOnly = false } = {}) {
  const [values, setValues] = useState<OrganizationInput>({
    name: org?.name ?? '',
    categories: org?.categories ?? [],
    // Empty until the admin picks one; it's required.
    department: org?.department ?? '',
    description: org?.description ?? '',
    vision: org?.vision ?? '',
    mission: org?.mission ?? '',
    room_number: org?.room_number ?? '',
    telegram_contact: org?.telegram_contact ?? '',
    facebook_contact: org?.facebook_contact ?? '',
    program_eligibility: org?.program_eligibility ?? PROGRAM_OPTIONS[0],
    // Start with one empty row so there's somewhere to type.
    reasons_to_join: org?.reasons_to_join.length ? org.reasons_to_join : [''],
    testimonials: org?.testimonials.length ? org.testimonials : [{ author: '', text: '' }],
  })
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(mediaUrl(org?.logo_path ?? null))
  const [photos, setPhotos] = useState<PhotoItem[]>(
    (org?.photo_paths ?? []).map((path) => ({ key: path, path, url: mediaUrl(path) ?? '' })),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Free temporary preview URLs when they're replaced or the form closes.
  useEffect(() => {
    return () => {
      if (logo && logoPreview) URL.revokeObjectURL(logoPreview)
    }
  }, [logo, logoPreview])

  function set<K extends keyof OrganizationInput>(key: K, value: OrganizationInput[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  // --- Categories -----------------------------------------------------------

  const categoriesFull = values.categories.length >= MAX_CATEGORIES
  const hasCategory = (category: string) =>
    values.categories.some((item) => item.toLowerCase() === category.toLowerCase())

  function toggleCategory(category: string) {
    if (hasCategory(category)) removeCategory(category)
    else addCategory(category)
  }

  // Adds a preset or custom category. A custom name that matches a preset uses the preset's spelling.
  function addCategory(name: string) {
    const typed = name.trim()
    if (!typed || categoriesFull || hasCategory(typed)) return
    const preset = PRESET_CATEGORIES.find((item) => item.toLowerCase() === typed.toLowerCase())
    set('categories', [...values.categories, preset ?? typed])
  }

  function removeCategory(category: string) {
    set('categories', values.categories.filter((item) => item.toLowerCase() !== category.toLowerCase()))
  }

  // --- Images ---------------------------------------------------------------

  function checkImage(file: File, maxBytes: number) {
    if (!IMAGE_TYPES.includes(file.type)) return `“${file.name}” must be a PNG, JPG or WebP image.`
    if (file.size > maxBytes) return `“${file.name}” is larger than ${maxBytes / 1024 / 1024} MB.`
    return null
  }

  function handleLogo(file: File | undefined) {
    if (!file) return
    const problem = checkImage(file, LOGO_MAX_BYTES)
    setError(problem)
    if (problem) return
    setLogo(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function handlePhotos(files: FileList | null) {
    if (!files) return
    const picked = Array.from(files)
    const problem = picked.map((file) => checkImage(file, PHOTO_MAX_BYTES)).find(Boolean)
    if (problem) {
      setError(problem)
      return
    }
    if (photos.length + picked.length > MAX_PHOTOS) {
      setError(`You can add up to ${MAX_PHOTOS} photos.`)
      return
    }
    setError(null)
    setPhotos((current) => [
      ...current,
      ...picked.map((file) => ({ key: crypto.randomUUID(), file, url: URL.createObjectURL(file) })),
    ])
  }

  function removePhoto(item: PhotoItem) {
    if (item.file) URL.revokeObjectURL(item.url)
    setPhotos((current) => current.filter((photo) => photo.key !== item.key))
  }

  // --- Lists ----------------------------------------------------------------

  function updateReason(index: number, value: string) {
    set('reasons_to_join', values.reasons_to_join.map((reason, i) => (i === index ? value : reason)))
  }

  function updateTestimonial(index: number, changes: Partial<Testimonial>) {
    set(
      'testimonials',
      values.testimonials.map((item, i) => (i === index ? { ...item, ...changes } : item)),
    )
  }

  // --- Save -----------------------------------------------------------------

  // Checks the form and saves it. Resolves true once saved; on a problem it shows the error instead.
  async function submit(): Promise<boolean> {
    if (!values.name.trim()) {
      setError('Enter the organization name.')
      return false
    }
    if (values.categories.length === 0) {
      setError('Pick at least one category.')
      return false
    }
    if (!values.department) {
      setError('Choose the department the organization is under.')
      return false
    }
    if (values.testimonials.some(({ author, text }) => author.trim() && !text.trim())) {
      setError('Add the testimonial text, or remove the author name.')
      return false
    }

    setSaving(true)
    setError(null)
    const files = {
      logo,
      keptPhotoPaths: photos.flatMap((photo) => (photo.path ? [photo.path] : [])),
      newPhotos: photos.flatMap((photo) => (photo.file ? [photo.file] : [])),
    }
    try {
      if (!org) await createOrganization(values, files)
      else if (profileOnly) await updateOrganizationProfile(org, values, files)
      else await updateOrganization(org, values, files)
      return true
    } catch (caught) {
      setError((caught as Error).message)
      setSaving(false)
      return false
    }
  }

  return {
    values,
    set,
    categoriesFull,
    hasCategory,
    toggleCategory,
    addCategory,
    removeCategory,
    logoPreview,
    handleLogo,
    photos,
    handlePhotos,
    removePhoto,
    updateReason,
    updateTestimonial,
    saving,
    error,
    submit,
  }
}
