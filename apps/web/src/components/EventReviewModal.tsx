import { CalendarDays, Clock, ImageOff, MapPin } from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'

import {
  approveEvent,
  declineEvent,
  EVENT_SECTIONS,
  type EventComment,
  type EventSection,
  type EventStatus,
  fetchEventComments,
  formatDay,
  formatEventDate,
  isResubmitted,
  type OrgEvent,
  posterUrl,
  requestRevision,
} from '../lib/events'
import { ResubmittedTag } from './EventTable'
import Modal, { dangerButton, primaryButton, secondaryButton } from './Modal'

// "view" shows the request. The others open the form for that action below it.
type Mode = 'view' | 'approve' | 'revision' | 'decline'

const STATUS_LABELS: Record<EventStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-brand-blue/10 text-brand-blue' },
  revision: { label: 'For Revision', className: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700' },
  declined: { label: 'Declined', className: 'bg-red-50 text-red-700' },
}

const sectionLabel = (value: EventSection) =>
  EVENT_SECTIONS.find((section) => section.value === value)?.label ?? value

const commentDate = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

// Shows one event in full. Pending requests get Approve, Request Revision and
// Decline; requests in revision can still be declined; the rest are view only.
export default function EventReviewModal({
  event,
  onClose,
  onReviewed,
}: {
  event: OrgEvent
  onClose: () => void
  onReviewed: () => void
}) {
  const [mode, setMode] = useState<Mode>('view')
  const [comments, setComments] = useState<EventComment[] | null>(null)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  // The revision and decline forms.
  const [sections, setSections] = useState<EventSection[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchEventComments(event.id)
      .then((loaded) => {
        if (!cancelled) setComments(loaded)
      })
      .catch((caught: Error) => {
        if (!cancelled) setCommentsError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [event.id])

  const poster = posterUrl(event.poster_path)
  const status = STATUS_LABELS[event.status]

  function switchMode(next: Mode) {
    setMode(next)
    setText('')
    setSections([])
    setError(null)
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onReviewed()
      onClose()
    } catch (caught) {
      setError((caught as Error).message)
      setBusy(false)
    }
  }

  function handleSubmit(submitEvent: FormEvent) {
    submitEvent.preventDefault()
    if (mode === 'approve') void run(() => approveEvent(event.id))
    if (mode === 'revision') {
      if (!text.trim()) return setError('Write what the officers need to change.')
      void run(() => requestRevision(event.id, text, sections))
    }
    if (mode === 'decline') {
      if (!text.trim()) return setError('Write the reason for declining.')
      void run(() => declineEvent(event.id, text))
    }
  }

  const back = (
    <button type="button" onClick={() => switchMode('view')} disabled={busy} className={secondaryButton}>
      Back
    </button>
  )
  const submit = (label: string, className: string) => (
    <button type="submit" form="event-review-form" disabled={busy} className={className}>
      {busy ? 'Working…' : label}
    </button>
  )
  const close = (
    <button type="button" onClick={onClose} className={secondaryButton}>
      Close
    </button>
  )
  const declineButton = (
    <button
      type="button"
      onClick={() => switchMode('decline')}
      className="mr-auto rounded-full border border-red-200 bg-white px-4 py-2 text-sm text-red-700 transition hover:bg-red-50"
    >
      Decline
    </button>
  )

  const footer =
    mode === 'approve' ? (
      <>
        {back}
        {submit('Approve and Post', primaryButton)}
      </>
    ) : mode === 'revision' ? (
      <>
        {back}
        {submit('Send to Officers', primaryButton)}
      </>
    ) : mode === 'decline' ? (
      <>
        {back}
        {submit('Decline Request', dangerButton)}
      </>
    ) : event.status === 'pending' ? (
      <>
        {declineButton}
        <button type="button" onClick={() => switchMode('revision')} className={secondaryButton}>
          Request Revision
        </button>
        <button type="button" onClick={() => switchMode('approve')} className={primaryButton}>
          Approve
        </button>
      </>
    ) : event.status === 'revision' ? (
      <>
        {declineButton}
        {close}
      </>
    ) : (
      close
    )

  return (
    <Modal title={event.status === 'approved' ? 'Event details' : 'Event request'} size="xl" onClose={busy ? () => {} : onClose} footer={footer}>
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[2fr_3fr]">
        {/* Poster */}
        <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl bg-field ring-1 ring-zinc-200">
          {poster ? (
            <a href={poster} target="_blank" rel="noreferrer" title="Open the full poster" className="size-full">
              <img src={poster} alt={`${event.title} poster`} className="size-full object-contain" />
            </a>
          ) : (
            <p className="flex flex-col items-center gap-2 text-sm text-zinc-500">
              <ImageOff size={28} aria-hidden="true" />
              No poster uploaded
            </p>
          )}
        </div>

        {/* Details */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-0.5 font-medium ${status.className}`}>{status.label}</span>
            {isResubmitted(event) && <ResubmittedTag />}
          </div>
          <h3 className="mt-2 text-xl font-semibold text-brand-navy">{event.title}</h3>
          <p className="text-sm text-zinc-500">{event.organization_name}</p>

          <ul className="mt-4 grid gap-2 text-sm text-zinc-800">
            <IconLine icon={CalendarDays}>{formatEventDate(event)}</IconLine>
            <IconLine icon={MapPin}>{event.venue}</IconLine>
            <IconLine icon={Clock}>
              Submitted {formatDay(event.submitted_at)}
              {event.approved_at && ` · Approved ${formatDay(event.approved_at)}`}
            </IconLine>
          </ul>

          {event.status === 'declined' && event.decline_reason && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">Reason for declining</p>
              <p className="mt-1 whitespace-pre-line">{event.decline_reason}</p>
            </div>
          )}

          <h4 className="mt-6 text-xs font-medium tracking-wide text-zinc-500 uppercase">Description</h4>
          <p className="mt-1 text-sm whitespace-pre-line text-zinc-800">{event.description}</p>

          <CommentHistory comments={comments} error={commentsError} />
        </div>
      </div>

      {mode !== 'view' && (
        <form
          id="event-review-form"
          onSubmit={handleSubmit}
          className="mt-6 grid gap-3 rounded-xl bg-surface p-4 ring-1 ring-zinc-200"
        >
          {mode === 'approve' && (
            <p className="text-sm text-zinc-700">
              Only approve once this event has been <strong>approved offline</strong>. It will be
              posted for students right away.
            </p>
          )}

          {mode === 'revision' && (
            <>
              <fieldset>
                <legend className="text-sm font-medium text-zinc-800">What needs to change?</legend>
                <div className="mt-2 flex flex-wrap gap-4">
                  {EVENT_SECTIONS.map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={sections.includes(value)}
                        onChange={(change) =>
                          setSections((current) =>
                            change.target.checked ? [...current, value] : current.filter((item) => item !== value),
                          )
                        }
                        className="size-4 accent-brand-blue"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <FormText
                label="Comment for the officers"
                placeholder="e.g. Please put the registration link on the poster."
                value={text}
                onChange={setText}
              />
            </>
          )}

          {mode === 'decline' && (
            <FormText
              label="Reason for declining"
              placeholder="e.g. The event was not approved offline."
              value={text}
              onChange={setText}
            />
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </form>
      )}
    </Modal>
  )
}

function IconLine({ icon: Icon, children }: { icon: typeof MapPin; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Icon size={16} className="mt-0.5 shrink-0 text-brand-blue" aria-hidden="true" />
      <span>{children}</span>
    </li>
  )
}

function FormText({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
      {label}
      <textarea
        value={value}
        onChange={(change) => onChange(change.target.value)}
        rows={3}
        autoFocus
        required
        placeholder={placeholder}
        className="w-full resize-y rounded-lg bg-white px-3 py-2 font-normal text-zinc-800 ring-1 ring-zinc-300 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-blue/40"
      />
    </label>
  )
}

// Every comment sent to the officers, oldest first, so the admin can check what was fixed.
function CommentHistory({ comments, error }: { comments: EventComment[] | null; error: string | null }) {
  if (error) {
    return <p className="mt-6 text-sm text-red-700">Could not load the revision comments: {error}</p>
  }
  if (!comments || comments.length === 0) return null

  return (
    <section className="mt-6">
      <h4 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Revision comments</h4>
      <ol className="mt-2 grid gap-2">
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-lg bg-surface p-3 text-sm ring-1 ring-zinc-200">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              {commentDate.format(new Date(comment.created_at))}
              {comment.sections.map((section) => (
                <span key={section} className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                  {sectionLabel(section)}
                </span>
              ))}
            </div>
            <p className="mt-1 whitespace-pre-line text-zinc-800">{comment.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
