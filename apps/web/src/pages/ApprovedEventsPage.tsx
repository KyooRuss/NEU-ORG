import { useEffect, useState } from 'react'

import EventCard from '../components/EventCard'
import EventFilters from '../components/EventFilters'
import EventReviewModal from '../components/EventReviewModal'
import EventTable, { SampleEventsNotice } from '../components/EventTable'
import { type EventFilterValues, filterEvents, hasFilters, NO_FILTERS } from '../lib/eventFilters'
import { type EventTiming, fetchApprovedEvents, type OrgEvent, usingSampleEvents } from '../lib/events'

const PAGES: Record<EventTiming, { title: string; description: string; empty: string }> = {
  upcoming: {
    title: 'Upcoming Events',
    description: 'Approved events that haven’t ended yet, nearest first.',
    empty: 'No upcoming events. Approved requests will appear here.',
  },
  past: {
    title: 'Past Events',
    description: 'Approved events that have already ended, most recent first.',
    empty: 'No past events yet.',
  },
}

// Approved events, for viewing: Upcoming as cards, Past as a table. They move from
// Upcoming to Past on their own once they end.
export default function ApprovedEventsPage({ timing }: { timing: EventTiming }) {
  const [events, setEvents] = useState<OrgEvent[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [sample, setSample] = useState(false)
  const [viewing, setViewing] = useState<OrgEvent | null>(null)
  const [filters, setFilters] = useState<EventFilterValues>(NO_FILTERS)

  useEffect(() => {
    let cancelled = false
    fetchApprovedEvents(timing)
      .then((loaded) => {
        if (cancelled) return
        setEvents(loaded)
        setSample(usingSampleEvents())
        setLoadError(null)
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message)
      })
    return () => {
      cancelled = true
    }
  }, [timing, reloadKey])

  const { title, description, empty } = PAGES[timing]
  const filtering = hasFilters(filters)
  const shown = events && filterEvents(events, filters)
  const emptyMessage = filtering ? 'No events match your search or filters.' : empty

  return (
    <section className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 className="font-semibold text-brand-navy">{title}</h1>
          {/* Upcoming shows a short description; Past shows the count instead. */}
          <p className="mt-1 text-sm text-zinc-500">
            {timing === 'upcoming' ? (
              description
            ) : (
              <>
                Total Approved Events:{' '}
                <span className="font-semibold text-brand-navy">
                  {shown ? (filtering ? `${shown.length} of ${events!.length}` : shown.length) : '—'}
                </span>
              </>
            )}
          </p>
        </div>
        <EventFilters events={events} filters={filters} onChange={setFilters} />
      </div>

      {sample && (
        <div className="px-6 pb-4">
          <SampleEventsNotice />
        </div>
      )}

      {timing === 'past' ? (
        <EventTable
          events={shown}
          error={loadError}
          empty={emptyMessage}
          onOpen={setViewing}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : loadError || !shown || shown.length === 0 ? (
        <p className="px-6 pt-4 pb-10 text-center text-sm text-zinc-500">
          {loadError ? (
            <span className="text-red-700">
              Could not load events: {loadError}{' '}
              <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="font-medium underline">
                Try again
              </button>
            </span>
          ) : !shown ? (
            'Loading…'
          ) : (
            emptyMessage
          )}
        </p>
      ) : (
        // Upcoming events show as cards, starting at the left.
        <ul className="flex flex-wrap gap-6 px-6 pt-2 pb-8 sm:px-12">
          {shown.map((event) => (
            <EventCard key={event.id} event={event} actionLabel="View Details" onAction={setViewing} />
          ))}
        </ul>
      )}

      {/* Approved events are view only, so there's nothing to refresh after closing. */}
      {viewing && <EventReviewModal event={viewing} onClose={() => setViewing(null)} onReviewed={() => {}} />}
    </section>
  )
}
