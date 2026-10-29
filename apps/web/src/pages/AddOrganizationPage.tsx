import { ArrowLeft, Check, ImageIcon, Plus, X } from 'lucide-react'
import { type FormEvent, type ReactNode, useRef, useState } from 'react'

import ApplicationFormField from '../components/ApplicationFormField'
import { primaryButton, secondaryButton } from '../components/Modal'
import useOrganizationForm from '../components/useOrganizationForm'
import {
  DEPARTMENT_OPTIONS,
  IMAGE_TYPES,
  MAX_CATEGORIES,
  MAX_PHOTOS,
  PRESET_CATEGORIES,
} from '../lib/organizations'

const fieldClass =
  'w-full rounded-lg border border-zinc-200 bg-[#f4f7fb] px-4 py-2.5 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/20'
const addButton =
  'inline-flex items-center gap-1.5 rounded-full border border-dashed border-brand-blue/50 px-3 py-1.5 text-sm font-medium text-brand-blue transition hover:bg-brand-blue/5 disabled:opacity-50'
const removeButton =
  'flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600'

// Empty photo tiles shown until there are at least this many photos.
const PHOTO_SLOTS = 3

// Opened from Organizations > Add Organization. It isn't in the sidebar.
export default function AddOrganizationPage({
  onCancel,
  onSaved,
}: {
  onCancel: () => void
  onSaved: () => void
}) {
  const form = useOrganizationForm()
  const { values, set, logoPreview, photos, saving, error } = form

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (await form.submit()) onSaved()
  }

  const photoInput = (
    <input
      type="file"
      multiple
      accept={IMAGE_TYPES.join(',')}
      className="sr-only"
      onChange={(event) => {
        form.handlePhotos(event.target.files)
        event.target.value = ''
      }}
    />
  )

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)}>
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          aria-label="Back to Organizations"
          title="Back to Organizations"
          className="flex size-9 items-center justify-center rounded-full text-brand-navy transition hover:bg-zinc-200/70"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="text-xl font-bold text-brand-navy">Add Organization</h1>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left column: who the org is, how to reach them, and photos. */}
        <div className="grid gap-6">
          <Card>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <label
                title={logoPreview ? 'Change logo' : 'Upload logo'}
                className="group relative flex size-24 shrink-0 cursor-pointer items-center justify-center self-center overflow-hidden rounded-full bg-[#eef2f8] text-zinc-400 transition hover:bg-[#e3e9f3] focus-within:ring-2 focus-within:ring-brand-blue/40 sm:self-start"
              >
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Logo preview" className="absolute inset-0 size-full object-cover" />
                    <span className="relative rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white opacity-0 transition group-hover:opacity-100">
                      Change
                    </span>
                  </>
                ) : (
                  <ImageIcon size={28} aria-hidden="true" />
                )}
                <span className="sr-only">Organization logo (PNG, JPG or WebP, up to 2 MB)</span>
                <input
                  type="file"
                  accept={IMAGE_TYPES.join(',')}
                  className="sr-only"
                  onChange={(event) => form.handleLogo(event.target.files?.[0])}
                />
              </label>

              <div className="grid flex-1 gap-3">
                <input
                  value={values.name}
                  onChange={(event) => set('name', event.target.value)}
                  placeholder="Enter the organization name *"
                  aria-label="Organization name (required)"
                  className={fieldClass}
                />
                <CategoryPicker form={form} />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <textarea
                rows={2}
                value={values.description}
                onChange={(event) => set('description', event.target.value)}
                placeholder="Write short description about the organization"
                aria-label="Short description"
                className={fieldClass}
              />
              <textarea
                rows={2}
                value={values.vision}
                onChange={(event) => set('vision', event.target.value)}
                placeholder="Enter the organization vision"
                aria-label="Vision"
                className={fieldClass}
              />
              <textarea
                rows={2}
                value={values.mission}
                onChange={(event) => set('mission', event.target.value)}
                placeholder="Enter the organization’s mission"
                aria-label="Mission"
                className={fieldClass}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  value={values.room_number}
                  onChange={(event) => set('room_number', event.target.value)}
                  placeholder="Org’s room number"
                  aria-label="Room number"
                  className={fieldClass}
                />
                <input
                  value={values.telegram_contact}
                  onChange={(event) => set('telegram_contact', event.target.value)}
                  placeholder="Contact person (Telegram)"
                  aria-label="Telegram contact person"
                  className={fieldClass}
                />
                <input
                  value={values.facebook_contact}
                  onChange={(event) => set('facebook_contact', event.target.value)}
                  placeholder="Contact person (Facebook)"
                  aria-label="Facebook contact person"
                  className={fieldClass}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-brand-navy">Upload photos from previous events or activities</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Up to {MAX_PHOTOS} photos, 5 MB each.</p>
              </div>
              {photos.length < MAX_PHOTOS && (
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-brand-blue/10 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-brand-blue transition hover:bg-brand-blue/15 focus-within:ring-2 focus-within:ring-brand-blue/40">
                  <Plus size={14} aria-hidden="true" />
                  Add Photo
                  {photoInput}
                </label>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div key={photo.key} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-field ring-1 ring-zinc-300">
                  <img src={photo.url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => form.removePhoto(photo)}
                    aria-label="Remove photo"
                    className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-red-600"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {/* Empty tiles; clicking one also adds photos. */}
              {Array.from({ length: Math.max(0, PHOTO_SLOTS - photos.length) }, (_, index) => (
                <label
                  key={index}
                  className="flex aspect-[4/3] cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-[#f4f7fb] text-zinc-300 transition hover:border-brand-blue/50 hover:text-brand-blue/50 focus-within:ring-2 focus-within:ring-brand-blue/40"
                >
                  <ImageIcon size={22} aria-hidden="true" />
                  <span className="sr-only">Add photos</span>
                  {photoInput}
                </label>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column: who can join and why. */}
        <div className="grid gap-6">
          <Card>
            <label className="block">
              <span className="font-semibold text-brand-navy">
                Department <span className="text-red-600">*</span>
              </span>
              <span className="mt-1 block text-xs text-zinc-500">
                Select the department this organization is under. Choose University Wide if it’s open
                to students of every course.
              </span>
              <select
                value={values.department}
                onChange={(event) => set('department', event.target.value)}
                className={`${fieldClass} mt-3 ${values.department ? '' : 'text-zinc-500'}`}
              >
                <option value="" disabled>
                  Choose a department
                </option>
                {DEPARTMENT_OPTIONS.map((department) => (
                  <option key={department} value={department} className="text-zinc-800">
                    {department}
                  </option>
                ))}
              </select>
            </label>
          </Card>

          <Card>
            <ApplicationFormField form={form} />
          </Card>

          <Card>
            <h2 className="font-semibold text-brand-navy">Reasons to Join</h2>
            <div className="mt-3 grid gap-2">
              {values.reasons_to_join.map((reason, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-right text-sm text-zinc-400">{index + 1}.</span>
                  <input
                    value={reason}
                    onChange={(event) => form.updateReason(index, event.target.value)}
                    placeholder="e.g. Monthly hands-on workshops"
                    aria-label={`Reason ${index + 1}`}
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      set('reasons_to_join', values.reasons_to_join.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove reason ${index + 1}`}
                    className={removeButton}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => set('reasons_to_join', [...values.reasons_to_join, ''])}
              className={`${addButton} mt-3`}
            >
              <Plus size={14} aria-hidden="true" />
              Add Reason
            </button>
          </Card>

          <Card>
            <h2 className="font-semibold text-brand-navy">Member / Alumni Testimonials</h2>
            <div className="mt-3 grid gap-3">
              {values.testimonials.map((testimonial, index) => (
                <div key={index} className="rounded-lg bg-surface p-3 ring-1 ring-zinc-200">
                  <div className="flex items-center gap-2">
                    <input
                      value={testimonial.author}
                      onChange={(event) => form.updateTestimonial(index, { author: event.target.value })}
                      placeholder="Author name"
                      aria-label={`Testimonial ${index + 1} author`}
                      className={`${fieldClass} bg-white`}
                    />
                    <button
                      type="button"
                      onClick={() => set('testimonials', values.testimonials.filter((_, i) => i !== index))}
                      aria-label={`Remove testimonial ${index + 1}`}
                      className={removeButton}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={testimonial.text}
                    onChange={(event) => form.updateTestimonial(index, { text: event.target.value })}
                    placeholder="What they said about the organization"
                    aria-label={`Testimonial ${index + 1} text`}
                    className={`${fieldClass} mt-2 bg-white`}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => set('testimonials', [...values.testimonials, { author: '', text: '' }])}
              className={`${addButton} mt-3`}
            >
              <Plus size={14} aria-hidden="true" />
              Add Testimonial
            </button>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {error && (
              <p role="alert" className="mr-auto text-sm text-red-700">
                {error}
              </p>
            )}
            <button type="button" onClick={onCancel} disabled={saving} className={secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={`${primaryButton} px-5`}>
              {saving ? 'Saving…' : 'Add Organization'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-zinc-200">{children}</section>
}

// A search box over the preset categories. Enter (or the Add button) adds the first
// match, or the typed text as a custom category if nothing matches.
function CategoryPicker({ form }: { form: ReturnType<typeof useOrganizationForm> }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const typed = query.trim().toLowerCase()
  const matches = PRESET_CATEGORIES.filter(
    (category) => !form.hasCategory(category) && category.toLowerCase().includes(typed),
  )
  const full = form.categoriesFull
  // Offer the typed text as a new category unless it's already a preset or already chosen.
  const canAddNew =
    typed !== '' &&
    !form.hasCategory(typed) &&
    !PRESET_CATEGORIES.some((category) => category.toLowerCase() === typed)
  const showList = open && !full && (matches.length > 0 || canAddNew)

  const input = useRef<HTMLInputElement>(null)
  const chosen = form.values.categories

  function add(category: string) {
    form.addCategory(category)
    setQuery('')
  }

  return (
    <div>
      <div className="relative">
        {/* Looks like one text box: the chosen categories sit inside it, before the typing area. */}
        <div
          onClick={() => input.current?.focus()}
          className="flex min-h-[42px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 focus-within:border-brand-blue/50 focus-within:ring-2 focus-within:ring-brand-blue/20"
        >
          {chosen.map((category) => (
            <span
              key={category}
              className="inline-flex items-center gap-1 rounded-full bg-brand-blue py-1 pr-1.5 pl-2.5 text-xs font-medium text-white"
            >
              <Check size={12} aria-hidden="true" />
              {category}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  form.removeCategory(category)
                }}
                aria-label={`Remove ${category}`}
                className="flex size-4 items-center justify-center rounded-full transition hover:bg-white/25"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
          {!full && (
            <input
              ref={input}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  if (typed) add(matches[0] ?? query)
                } else if (event.key === 'Escape') {
                  setOpen(false)
                } else if (event.key === 'Backspace' && !query && chosen.length > 0) {
                  // Backspace in an empty box removes the last category, like most tag inputs.
                  form.removeCategory(chosen[chosen.length - 1])
                }
              }}
              placeholder={chosen.length ? 'Add another…' : 'Choose a category or type a new one… *'}
              aria-label="Category (required)"
              role="combobox"
              aria-expanded={showList}
              aria-controls="category-options"
              className="min-w-32 flex-1 bg-transparent px-2 py-1 text-sm text-zinc-800 outline-none placeholder:text-zinc-500"
            />
          )}
          {!full && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                if (typed) add(matches[0] ?? query)
              }}
              disabled={!typed}
              className="inline-flex items-center gap-1 rounded-md bg-brand-blue px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              <Plus size={12} aria-hidden="true" />
              Add
            </button>
          )}
        </div>
        {showList && (
          <ul
            id="category-options"
            role="listbox"
            className="absolute inset-x-0 z-20 mt-1 rounded-lg bg-white p-1 shadow-lg ring-1 ring-zinc-200"
          >
            {matches.map((category) => (
              <li key={category} role="option" aria-selected={false}>
                <button
                  type="button"
                  // Keep focus in the input so the list doesn't close before the click lands.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => add(category)}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-700 hover:bg-surface"
                >
                  {category}
                </button>
              </li>
            ))}
            {canAddNew && (
              <li role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => add(query)}
                  className="flex w-full items-center gap-1.5 rounded-md px-3 py-2 text-left text-sm text-brand-blue hover:bg-surface"
                >
                  <Plus size={14} aria-hidden="true" />
                  Add “{query.trim()}”
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        Choose up to {MAX_CATEGORIES} categories. Not listed? Type it and click Add.
      </p>
    </div>
  )
}
