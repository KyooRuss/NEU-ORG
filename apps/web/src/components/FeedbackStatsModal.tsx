import { CalendarDays, MapPin, Users, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'

import { formatAudience, formatEventDate, type OrgEvent } from '../lib/events'
import { FEEDBACK_CATEGORIES, type FeedbackSummary, fetchFeedbackSummary } from '../lib/feedback'

// Opened from a poster on the Feedback page: the event, its overall rating,
// and the average score of each category, all out of 100.
export default function FeedbackStatsModal({ event, onClose }: { event: OrgEvent; onClose: () => void }) {
  const titleId = useId()
  const [summary, setSummary] = useState<FeedbackSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchFeedbackSummary(event.id)
      .then((loaded) => {
        if (!cancelled) setSummary(loaded)
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [event.id])

  useEffect(() => {
    function handleKey(keyEvent: KeyboardEvent) {
      if (keyEvent.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    // Stop the page behind the modal from scrolling.
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white px-6 pt-8 pb-8 shadow-2xl sm:px-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-lg text-zinc-700 transition hover:bg-zinc-100"
        >
          <X size={16} strokeWidth={2.5} aria-hidden="true" />
        </button>

        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 pr-6">
          <div className="min-w-0">
            <h2 id={titleId} className="font-semibold text-zinc-900">
              {event.title}
            </h2>
            <p className="text-sm text-zinc-500">{event.organization_name}</p>
            <div className="mt-3 grid gap-1.5 text-sm text-zinc-700">
              <EventDetail icon={CalendarDays}>{formatEventDate(event)}</EventDetail>
              <EventDetail icon={MapPin}>{event.venue}</EventDetail>
              <EventDetail icon={Users}>{formatAudience(event)}</EventDetail>
            </div>
          </div>
          <div className="text-right">
            <p className="text-5xl leading-none font-bold text-green-500">{formatScore(summary?.overall, 2)}</p>
            <p className="mt-1 text-xs text-zinc-500 italic">Average Rating</p>
            {summary && (
              <p className="text-xs text-zinc-400">
                {summary.responses === 1 ? '1 response' : `${summary.responses.toLocaleString()} responses`}
              </p>
            )}
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-8 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Could not load feedback: {error}
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FEEDBACK_CATEGORIES.map(({ key, label }) => (
              <li
                key={key}
                className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-[#f4f7fb] px-3 py-4 text-center"
              >
                <span className="text-2xl font-bold text-brand-navy">{formatScore(summary?.scores[key], 1)}</span>
                <span className="mt-1 text-[11px] text-zinc-500">{label}</span>
              </li>
            ))}
          </ul>
        )}

        {summary?.responses === 0 && (
          <p className="mt-6 text-center text-sm text-zinc-500">No feedback yet. Ratings appear once attendees answer.</p>
        )}
      </div>
    </div>
  )
}

// A score out of 100, or a dash while it's loading or nobody has answered.
function formatScore(score: number | null | undefined, decimals: number) {
  return score == null ? '—' : score.toFixed(decimals)
}

function EventDetail({ icon: Icon, children }: { icon: typeof MapPin; children: string }) {
  return (
    <span className="flex items-start gap-2">
      <Icon size={16} className="mt-0.5 shrink-0 text-brand-blue" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </span>
  )
}
