import { CalendarDays, ImageIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import EventReviewModal from '../components/EventReviewModal'
import PageBanner from '../components/PageBanner'
import { fetchApprovedEvents, type OrgEvent, posterUrl } from '../lib/events'
import { fetchMyOrganizationIds } from '../lib/officers'

// The officer's Feedback page: the past events of their organizations, as a row of posters.
export default function FeedbackPage({ profileId }: { profileId: string }) {
  const [events, setEvents] = useState<OrgEvent[] | null>(null)
  // True when the officer holds no active position in any organization.
  const [noOrganization, setNoOrganization] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<OrgEvent | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMyOrganizationIds(profileId)
      .then(async (organizationIds) => {
        const loaded = await fetchApprovedEvents('past', organizationIds)
        if (cancelled) return
        setNoOrganization(organizationIds.length === 0)
        setEvents(loaded)
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [profileId])

  const status = error
    ? `Could not load events: ${error}`
    : events === null
      ? 'Loading…'
      : noOrganization
        ? "You aren't assigned to an organization yet."
        : events.length === 0
          ? 'No past events yet. Events appear here once they have ended.'
          : null

  return (
    <>
      <PageBanner>
        <h1 className="truncate text-2xl font-bold">Feedback</h1>
        <p className="mt-1 text-sm text-white/90">
          Review attendee ratings and comments to evaluate event performance and identify opportunities for
          improvement.
        </p>
      </PageBanner>

      <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white px-6 pt-7 pb-20">
        <h2 className="flex items-center gap-3 font-semibold text-[#3b4a7a]">
          <CalendarDays size={18} className="text-brand-navy" aria-hidden="true" />
          Past Events
        </h2>

        {status ? (
          <p className="mt-10 rounded-xl bg-[#f4f7fb] px-6 py-10 text-center text-sm text-zinc-500">{status}</p>
        ) : (
          // The light band runs edge to edge across the card, behind the middle of the posters.
          <div className="relative -mx-6 mt-10">
            <div className="absolute inset-x-0 top-1/3 h-[45%] border-y border-zinc-200 bg-[#f4f7fb]" aria-hidden="true" />
            <ul className="relative flex gap-10 overflow-x-auto px-12 pt-1 pb-4 sm:justify-center-safe">
              {events!.map((event) => {
                const poster = posterUrl(event.poster_path)
                return (
                  <li key={event.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewing(event)}
                      aria-label={`View ${event.title}`}
                      title={event.title}
                      className="flex h-49 w-36 items-center justify-center overflow-hidden rounded-lg bg-zinc-300 text-zinc-400 shadow-lg shadow-zinc-400/60 transition hover:-translate-y-1"
                    >
                      {poster ? (
                        <img src={poster} alt="" className="size-full object-cover" />
                      ) : (
                        <ImageIcon size={24} aria-hidden="true" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      {viewing && <EventReviewModal event={viewing} readOnly onClose={() => setViewing(null)} onReviewed={() => {}} />}
    </>
  )
}
