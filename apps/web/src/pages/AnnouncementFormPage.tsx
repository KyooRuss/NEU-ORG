import { ArrowLeft } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { primaryButton } from '../components/Modal'
import {
  ANNOUNCEMENT_AUDIENCES,
  type Announcement,
  type AnnouncementAudience,
  createAnnouncement,
  updateAnnouncement,
} from '../lib/announcements'
import type { Organization } from '../lib/organizations'

const fieldClass =
  'mt-2 w-full rounded-xl border border-zinc-200 bg-[#f4f7fb] px-4 py-3 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/20'
const labelClass = 'block font-semibold text-brand-navy'

// Opened from Announcements. It isn't in the sidebar. Leave out the announcement
// to create one; pass one to edit it.
export default function AnnouncementFormPage({
  organization,
  announcement,
  onCancel,
  onSaved,
}: {
  organization: Pick<Organization, 'id' | 'name'>
  announcement?: Announcement
  onCancel: () => void
  onSaved: () => void
}) {
  const [date, setDate] = useState(announcement?.announcement_date ?? '')
  const [title, setTitle] = useState(announcement?.title ?? '')
  const [description, setDescription] = useState(announcement?.description ?? '')
  const [audience, setAudience] = useState<AnnouncementAudience | null>(announcement?.audience ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The first thing still wrong with the form, in the order the fields appear.
  function findProblem() {
    if (!audience) return 'Choose who the announcement is for: University Wide or Department-only.'
    if (!date) return 'Choose the date of the announcement.'
    if (!title.trim()) return 'Enter the announcement title.'
    if (!description.trim()) return 'Write a description of the announcement.'
    return null
  }

  async function handleSubmit(submitEvent: FormEvent) {
    submitEvent.preventDefault()
    const problem = findProblem()
    if (problem) return setError(problem)

    setSaving(true)
    setError(null)
    const input = {
      announcement_date: date,
      title: title.trim(),
      description: description.trim(),
      // findProblem made sure an audience is picked.
      audience: audience!,
    }
    try {
      if (announcement) await updateAnnouncement(announcement.id, input)
      else await createAnnouncement(organization.id, input)
      onSaved()
    } catch (caught) {
      setError((caught as Error).message)
      setSaving(false)
    }
  }

  return (
    <form noValidate onSubmit={(submitEvent) => void handleSubmit(submitEvent)}>
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          aria-label="Back to Announcements"
          title="Back to Announcements"
          className="flex size-9 items-center justify-center rounded-full text-brand-navy transition hover:bg-zinc-200/70"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-brand-navy">
            {announcement ? 'Edit Announcement' : 'Create Announcement'}
          </h1>
          <p className="truncate text-sm text-zinc-500">{organization.name}</p>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-6 lg:mx-auto lg:w-3/4 shadow-md ring-1 ring-zinc-200 sm:p-8">
        <div className="grid gap-6">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
              <label htmlFor="announcement-date" className={`${labelClass} pt-2`}>
                Date
              </label>
              <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
                <legend className="sr-only">Audience</legend>
                {ANNOUNCEMENT_AUDIENCES.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-zinc-600">
                    <input
                      type="radio"
                      name="audience"
                      checked={audience === value}
                      onChange={() => setAudience(value)}
                      className="size-4 accent-brand-blue"
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            </div>
            <input
              id="announcement-date"
              type="date"
              value={date}
              onChange={(change) => setDate(change.target.value)}
              className={fieldClass}
            />
          </div>

          <label className={labelClass}>
            Announcement Title
            <input
              value={title}
              onChange={(change) => setTitle(change.target.value)}
              placeholder="e.g. General Assembly this Friday"
              className={`${fieldClass} font-normal`}
            />
          </label>

          <label className={labelClass}>
            Description
            <textarea
              rows={5}
              value={description}
              onChange={(change) => setDescription(change.target.value)}
              placeholder="What students and members need to know, such as the time, place, and what to bring"
              className={`${fieldClass} font-normal`}
            />
          </label>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {error && (
              <p role="alert" className="mr-auto text-sm text-red-700">
                {error}
              </p>
            )}
            <button type="submit" disabled={saving} className={`${primaryButton} px-5`}>
              {saving ? 'Saving…' : announcement ? 'Save Changes' : 'Post Announcement'}
            </button>
          </div>
        </div>
      </section>
    </form>
  )
}
