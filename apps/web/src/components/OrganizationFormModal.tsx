import { Check, ImagePlus, Plus, X } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'

import {
  DEPARTMENT_OPTIONS,
  IMAGE_TYPES,
  MAX_CATEGORIES,
  MAX_PHOTOS,
  type Organization,
  PRESET_CATEGORIES,
} from '../lib/organizations'
import ApplicationFormField from './ApplicationFormField'
import Modal, { primaryButton, secondaryButton } from './Modal'
import useOrganizationForm from './useOrganizationForm'

// Adding an organization has its own page (AddOrganizationPage); this edits one.
type Props = {
  organization: Organization
  // The officer's version: without the name, department and category, which only admins change.
  profileOnly?: boolean
  onClose: () => void
  onSaved: () => void
}

const fieldClass =
  'mt-1 w-full rounded-lg bg-field px-3 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-blue/40'
const addButton =
  'inline-flex items-center gap-1.5 rounded-full border border-dashed border-brand-blue/50 px-3 py-1.5 text-sm font-medium text-brand-blue transition hover:bg-brand-blue/5 disabled:opacity-50'
const removeButton =
  'flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600'

export default function OrganizationFormModal({ organization: org, profileOnly, onClose, onSaved }: Props) {
  const form = useOrganizationForm(org, { profileOnly })
  const { values, set, categoriesFull, logoPreview, photos, saving, error } = form
  const [customCategory, setCustomCategory] = useState('')

  function addCustomCategory() {
    form.addCategory(customCategory)
    setCustomCategory('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (await form.submit()) {
      onSaved()
      onClose()
    }
  }

  return (
    <Modal
      title={profileOnly ? 'Edit Profile' : `Edit ${org.name}`}
      size="xl"
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          {error && (
            <p role="alert" className="mr-auto self-center text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" form="organization-form" disabled={saving} className={primaryButton}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      <form
        id="organization-form"
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="grid gap-x-10 gap-y-6 lg:grid-cols-[3fr_2fr]"
      >
        {/* Left column: who the org is and how to reach them. */}
        <div className="grid content-start gap-5">
          {/* A circle, the shape the logo is shown in everywhere else. */}
          <div className="flex items-center gap-4">
            <label
              title={logoPreview ? 'Change logo' : 'Upload logo'}
              className="group relative flex size-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-zinc-300 bg-surface text-zinc-500 transition hover:border-brand-blue/60 focus-within:ring-2 focus-within:ring-brand-blue/40"
            >
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Logo preview" className="absolute inset-0 size-full object-cover" />
                  <span className="relative rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white opacity-0 transition group-hover:opacity-100">
                    Change
                  </span>
                </>
              ) : (
                <ImagePlus size={28} aria-hidden="true" />
              )}
              <span className="sr-only">Organization logo</span>
              <input
                type="file"
                accept={IMAGE_TYPES.join(',')}
                className="sr-only"
                onChange={(event) => form.handleLogo(event.target.files?.[0])}
              />
            </label>
            <div className="text-sm text-zinc-700">
              <p className="font-medium">Organization Logo</p>
              <p className="text-xs text-zinc-500">PNG, JPG or WebP, up to 2 MB</p>
            </div>
          </div>

          {!profileOnly && (
          <>
          <label className="text-sm text-zinc-700">
            Organization Name <span className="text-red-600">*</span>
            <input
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="e.g. Computer Studies Society"
              className={fieldClass}
            />
          </label>

          <label className="text-sm text-zinc-700">
            Department <span className="text-red-600">*</span>
            <select
              value={values.department}
              onChange={(event) => set('department', event.target.value)}
              className={`${fieldClass} ${values.department ? '' : 'text-zinc-500'}`}
            >
              <option value="" disabled>
                Choose a department
              </option>
              {/* Keep an older saved value selectable even if it's no longer in the list. */}
              {[...new Set([...DEPARTMENT_OPTIONS, values.department].filter(Boolean))].map((department) => (
                <option key={department} value={department} className="text-zinc-800">
                  {department}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-zinc-500">
              Choose “University Wide” if the organization is open to students of every course.
            </span>
          </label>

          <fieldset>
            <legend className="text-sm text-zinc-700">
              Category <span className="text-red-600">*</span>{' '}
              <span className="text-xs text-zinc-500">
                ({values.categories.length}/{MAX_CATEGORIES}, pick or add your own)
              </span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[...PRESET_CATEGORIES, ...values.categories.filter((c) => !PRESET_CATEGORIES.includes(c))].map(
                (category) => {
                  const selected = values.categories.includes(category)
                  return (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={selected}
                      disabled={!selected && categoriesFull}
                      onClick={() => form.toggleCategory(category)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition disabled:opacity-40 ${
                        selected
                          ? 'bg-brand-blue text-white'
                          : 'bg-field text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {selected && <Check size={14} aria-hidden="true" />}
                      {category}
                    </button>
                  )
                },
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={customCategory}
                onChange={(event) => setCustomCategory(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addCustomCategory()
                  }
                }}
                disabled={categoriesFull}
                placeholder="Not listed? Type a new category"
                aria-label="Custom category"
                className={`${fieldClass} mt-0 disabled:opacity-50`}
              />
              <button
                type="button"
                onClick={addCustomCategory}
                disabled={categoriesFull || !customCategory.trim()}
                className={secondaryButton}
              >
                Add
              </button>
            </div>
          </fieldset>
          </>
          )}

          <label className="text-sm text-zinc-700">
            Short Description / Overview
            <textarea
              rows={3}
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
              placeholder="What the organization is about, in a few sentences"
              className={fieldClass}
            />
          </label>

          <label className="text-sm text-zinc-700">
            Vision
            <textarea
              rows={3}
              value={values.vision}
              onChange={(event) => set('vision', event.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="text-sm text-zinc-700">
            Mission
            <textarea
              rows={3}
              value={values.mission}
              onChange={(event) => set('mission', event.target.value)}
              className={fieldClass}
            />
          </label>

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-medium text-brand-navy">Contact Details</legend>
            <label className="text-sm text-zinc-700">
              Room Number
              <input
                value={values.room_number}
                onChange={(event) => set('room_number', event.target.value)}
                placeholder="e.g. Room 402, CCS Building"
                className={fieldClass}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-zinc-700">
                Telegram Contact Person
                <input
                  value={values.telegram_contact}
                  onChange={(event) => set('telegram_contact', event.target.value)}
                  placeholder="@username"
                  className={fieldClass}
                />
              </label>
              <label className="text-sm text-zinc-700">
                Facebook Contact Person
                <input
                  value={values.facebook_contact}
                  onChange={(event) => set('facebook_contact', event.target.value)}
                  placeholder="Name or profile link"
                  className={fieldClass}
                />
              </label>
            </div>
          </fieldset>

          <Section
            title="Photos from Previous Events / Activities"
            hint={`Up to ${MAX_PHOTOS} photos, 5 MB each.`}
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.map((photo) => (
                <div key={photo.key} className="relative aspect-square overflow-hidden rounded-lg bg-field">
                  <img src={photo.url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => form.removePhoto(photo)}
                    aria-label="Remove photo"
                    className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-red-600"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-zinc-300 text-xs font-medium text-brand-blue transition hover:border-brand-blue/60 focus-within:ring-2 focus-within:ring-brand-blue/40">
                  <Plus size={18} aria-hidden="true" />
                  Add Photo
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
                </label>
              )}
            </div>
          </Section>
        </div>

        {/* Right column: why students should join. */}
        <div className="grid content-start gap-6 lg:border-l lg:border-zinc-200 lg:pl-10">
          <ApplicationFormField form={form} />

          <Section title="Reasons to Join">
            <div className="grid gap-2">
              {values.reasons_to_join.map((reason, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-right text-sm text-zinc-400">{index + 1}.</span>
                  <input
                    value={reason}
                    onChange={(event) => form.updateReason(index, event.target.value)}
                    placeholder="e.g. Monthly hands-on workshops"
                    aria-label={`Reason ${index + 1}`}
                    className={`${fieldClass} mt-0`}
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
          </Section>

          <Section title="Member / Alumni Testimonials">
            <div className="grid gap-3">
              {values.testimonials.map((testimonial, index) => (
                <div key={index} className="rounded-lg bg-surface p-3 ring-1 ring-zinc-200">
                  <div className="flex items-center gap-2">
                    <input
                      value={testimonial.author}
                      onChange={(event) => form.updateTestimonial(index, { author: event.target.value })}
                      placeholder="Author name"
                      aria-label={`Testimonial ${index + 1} author`}
                      className={`${fieldClass} mt-0 bg-white`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set('testimonials', values.testimonials.filter((_, i) => i !== index))
                      }
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
          </Section>
        </div>
      </form>
    </Modal>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-brand-navy">{title}</p>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  )
}
