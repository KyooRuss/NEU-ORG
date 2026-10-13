import { ArrowLeft, ImageIcon } from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'

import { CommentHistory } from '../components/EventReviewModal'
import { primaryButton, secondaryButton } from '../components/Modal'
import {
  createEvent,
  EVENT_AUDIENCES,
  type EventAudience,
  type EventComment,
  fetchEventComments,
  type OrgEvent,
  posterUrl,
  resubmitEvent,
} from '../lib/events'
import { COLLEGES, IMAGE_TYPES, type Organization, PHOTO_MAX_BYTES } from '../lib/organizations'

const fieldClass =
  'mt-1.5 w-full rounded-lg border border-zinc-200 bg-[#f4f7fb] px-4 py-2.5 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/20'
const labelClass = 'block text-sm font-medium text-zinc-700'

// An ISO date as the "2026-10-21T09:00" a datetime-local input uses, in the officer's own time zone.
function toLocalInput(iso: string) {
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function isWebLink(value: string) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

// Opened from Event Posts. It isn't in the sidebar. Leave out the event to create
// a request; pass one that is in revision to fix it and send it back to the admin.
export default function EventFormPage({
  organization,
  event,
  onCancel,
  onSaved,
}: {
  organization: Pick<Organization, 'id' | 'name' | 'department'>
  event?: OrgEvent
  onCancel: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [venue, setVenue] = useState(event?.venue ?? '')
  const [startsAt, setStartsAt] = useState(event ? toLocalInput(event.starts_at) : '')
  const [endsAt, setEndsAt] = useState(event?.ends_at ? toLocalInput(event.ends_at) : '')
  const [audience, setAudience] = useState<EventAudience>(event?.audience ?? 'everyone')
  const [colleges, setColleges] = useState<string[]>(event?.audience_colleges ?? [])
  const [registrationUrl, setRegistrationUrl] = useState(event?.registration_url ?? '')
  // A newly picked poster. While it's null, a request being edited keeps its current one.
  const [poster, setPoster] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string | null>(posterUrl(event?.poster_path ?? null))
  // What the admin asked to change, when editing.
  const [comments, setComments] = useState<EventComment[] | null>(null)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eventId = event?.id
  useEffect(() => {
    if (!eventId) return
    let cancelled = false
    fetchEventComments(eventId)
      .then((loaded) => {
        if (!cancelled) setComments(loaded)
      })
      .catch((caught: Error) => {
        if (!cancelled) setCommentsError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  // Free the temporary preview URL when the poster is replaced or the page closes.
  useEffect(() => {
    return () => {
      if (poster && posterPreview) URL.revokeObjectURL(posterPreview)
    }
  }, [poster, posterPreview])

  function handlePoster(file: File | undefined) {
    if (!file) return
    const problem = !IMAGE_TYPES.includes(file.type)
      ? `“${file.name}” must be a PNG, JPG or WebP image.`
      : file.size > PHOTO_MAX_BYTES
        ? `“${file.name}” is larger than ${PHOTO_MAX_BYTES / 1024 / 1024} MB.`
        : null
    setError(problem)
    if (problem) return
    setPoster(file)
    setPosterPreview(URL.createObjectURL(file))
  }

  function toggleCollege(college: string, checked: boolean) {
    setColleges((current) => (checked ? [...current, college] : current.filter((item) => item !== college)))
  }

  // The first thing still wrong with the form, in the order the fields appear.
  function findProblem() {
    if (!posterPreview) return 'Upload the event poster.'
    if (!title.trim()) return 'Enter the event title.'
    if (!description.trim()) return 'Write a description of the event.'
    if (!venue.trim()) return 'Enter the venue.'
    if (!startsAt) return 'Choose when the event starts.'
    if (endsAt && new Date(endsAt) < new Date(startsAt)) {
      return 'The end is earlier than the start. Check the date and AM/PM: 12:00 AM is midnight, 12:00 PM is noon.'
    }
    if (!event && new Date(startsAt) <= new Date()) return 'The event must start in the future.'
    if (audience === 'colleges' && colleges.length === 0) {
      return 'Tick at least one college, or choose another option for who can join.'
    }
    if (registrationUrl.trim() && !isWebLink(registrationUrl.trim())) {
      return 'The registration link must be a full link that starts with https://'
    }
    return null
  }

  async function handleSubmit(submitEvent: FormEvent) {
    submitEvent.preventDefault()
    const problem = findProblem()
    if (problem) return setError(problem)

    setSaving(true)
    setError(null)
    const input = {
      title,
      description,
      venue,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      audience,
      audience_colleges: colleges,
      registration_url: registrationUrl,
    }
    try {
      if (event) await resubmitEvent(event, input, poster)
      // findProblem made sure a new request has a poster.
      else await createEvent(organization, input, poster!)
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
          aria-label="Back to Event Posts"
          title="Back to Event Posts"
          className="flex size-9 items-center justify-center rounded-full text-brand-navy transition hover:bg-zinc-200/70"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-brand-navy">{event ? 'Edit Event Request' : 'Create Event'}</h1>
          <p className="truncate text-sm text-zinc-500">{organization.name}</p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_3fr]">
        {/* Left column: what the admin asked for, and the poster. */}
        <div className="grid gap-6">
          {(commentsError || (comments && comments.length > 0)) && (
            <Card>
              <h2 className="font-semibold text-brand-navy">What the admin asked you to change</h2>
              <CommentHistory comments={comments} error={commentsError} className="mt-3" />
            </Card>
          )}

          <Card>
            <h2 className="font-semibold text-brand-navy">
              Event Poster <span className="text-red-600">*</span>
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">PNG, JPG or WebP, up to 5 MB.</p>
            <label
              title={posterPreview ? 'Change poster' : 'Upload poster'}
              className="group relative mt-3 flex aspect-[4/5] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-zinc-300 bg-[#f4f7fb] text-zinc-400 transition hover:border-brand-blue/50 focus-within:ring-2 focus-within:ring-brand-blue/40"
            >
              {posterPreview ? (
                <>
                  <img src={posterPreview} alt="Poster preview" className="absolute inset-0 size-full object-contain" />
                  <span className="relative rounded-full bg-black/60 px-3 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                    Change poster
                  </span>
                </>
              ) : (
                <span className="flex flex-col items-center gap-2 text-sm">
                  <ImageIcon size={32} aria-hidden="true" />
                  Click to upload the poster
                </span>
              )}
              <span className="sr-only">Event poster (required)</span>
              <input
                type="file"
                accept={IMAGE_TYPES.join(',')}
                className="sr-only"
                onChange={(change) => {
                  handlePoster(change.target.files?.[0])
                  change.target.value = ''
                }}
              />
            </label>
          </Card>
        </div>

        {/* Right column: the details, who can join, and where to sign up. */}
        <div className="grid gap-6">
          <Card>
            <h2 className="font-semibold text-brand-navy">Event Details</h2>
            <div className="mt-3 grid gap-4">
              <label className={labelClass}>
                Event Title <Required />
                <input
                  value={title}
                  onChange={(change) => setTitle(change.target.value)}
                  placeholder="e.g. Intro to Web Development Workshop"
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Description <Required />
                <textarea
                  rows={5}
                  value={description}
                  onChange={(change) => setDescription(change.target.value)}
                  placeholder="What the event is about, and what students should know or bring"
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Venue <Required />
                <input
                  value={venue}
                  onChange={(change) => setVenue(change.target.value)}
                  placeholder="e.g. NEU Main Campus Auditorium"
                  className={fieldClass}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Starts <Required />
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(change) => setStartsAt(change.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Ends <span className="font-normal text-zinc-500">(optional)</span>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    min={startsAt || undefined}
                    onChange={(change) => setEndsAt(change.target.value)}
                    className={fieldClass}
                  />
                  <span className="mt-1 block text-xs font-normal text-zinc-500">
                    Leave it empty if you don’t know yet when it ends.
                  </span>
                </label>
              </div>
            </div>
          </Card>

          <Card>
            <fieldset>
              <legend className="font-semibold text-brand-navy">
                Who Can Join <Required />
              </legend>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {EVENT_AUDIENCES.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-zinc-700">
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
              </div>
            </fieldset>

            {audience === 'colleges' && (
              <fieldset className="mt-4 rounded-lg bg-surface p-4 ring-1 ring-zinc-200">
                <legend className="sr-only">Colleges that can join</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {COLLEGES.map((college) => (
                    <label key={college} className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={colleges.includes(college)}
                        onChange={(change) => toggleCollege(college, change.target.checked)}
                        className="size-4 accent-brand-blue"
                      />
                      {college}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </Card>

          <Card>
            <label className="block">
              <span className="font-semibold text-brand-navy">Registration Link</span>
              <span className="mt-1 block text-xs text-zinc-500">
                Optional. Paste the link to your sign-up form, such as a Google Form. Students open
                it from the event, and the answers stay in your form.
              </span>
              <input
                type="url"
                value={registrationUrl}
                onChange={(change) => setRegistrationUrl(change.target.value)}
                placeholder="https://forms.gle/…"
                className={`${fieldClass} mt-3`}
              />
            </label>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {error ? (
              <p role="alert" className="mr-auto text-sm text-red-700">
                {error}
              </p>
            ) : (
              <p className="mr-auto text-xs text-zinc-500">
                The request goes to the OSAS admin. You can’t change it while it waits for approval.
              </p>
            )}
            <button type="button" onClick={onCancel} disabled={saving} className={secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={`${primaryButton} px-5`}>
              {saving ? 'Submitting…' : event ? 'Resubmit' : 'Submit for Approval'}
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

function Required() {
  return <span className="text-red-600">*</span>
}
