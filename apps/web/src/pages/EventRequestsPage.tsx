import { useEffect, useState } from 'react'

import EventFilters from '../components/EventFilters'
import EventReviewModal from '../components/EventReviewModal'
import EventTable, { SampleEventsNotice } from '../components/EventTable'
import { type EventFilterValues, filterEvents, hasFilters, NO_FILTERS } from '../lib/eventFilters'
import { fetchEventRequests, type OrgEvent, type RequestTab, usingSampleEvents } from '../lib/events'

const TABS: { value: RequestTab; label: string; empty: string }[] = [
  {
    value: 'pending',
    label: 'Pending',
    empty: 'No pending requests. New requests from officers will appear here.',
  },
  {
    value: 'revision',
    label: 'For Revision',
    empty: 'No requests are waiting for the officers to revise them.',
  },
  {
    value: 'declined',
    label: 'Declined',
    empty: 'No declined requests.',
  },
]

// Requests that still need the admin: new ones (Pending), ones sent back to the
// officers (For Revision), and the ones that were turned down (Declined).
export default function EventRequestsPage({
  pendingCount,
  onReviewed,
}: {
  pendingCount: number | null
  // Lets the dashboard refresh the Events badge after an approval, revision or decline.
  onReviewed: () => void
}) {
  const [tab, setTab] = useState<RequestTab>('pending')
  const [events, setEvents] = useState<OrgEvent[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [sample, setSample] = useState(false)
  const [reviewing, setReviewing] = useState<OrgEvent | null>(null)
  // Kept when switching tabs, so the admin can follow one organization across them.
  const [filters, setFilters] = useState<EventFilterValues>(NO_FILTERS)

  useEffect(() => {
    let cancelled = false
    fetchEventRequests(tab)
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
  }, [tab, reloadKey])

  const reload = () => setReloadKey((key) => key + 1)
  const current = TABS.find((item) => item.value === tab)!
  const shown = events && filterEvents(events, filters)

  function selectTab(next: RequestTab) {
    if (next === tab) return
    setTab(next)
    setEvents(null)
    setLoadError(null)
  }

  return (
    <section className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 className="font-semibold text-brand-navy">Event Requests</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Approve a request once it has been approved offline, or send it back with comments.
          </p>
        </div>
        <EventFilters events={events} filters={filters} onChange={setFilters} />
      </div>

      <div role="tablist" aria-label="Request status" className="flex gap-1 overflow-x-auto px-6">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={value === tab}
            onClick={() => selectTab(value)}
            className="-mb-px flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 pb-3 text-sm whitespace-nowrap text-zinc-500 transition hover:text-brand-navy aria-selected:border-brand-blue aria-selected:font-semibold aria-selected:text-brand-navy"
          >
            {label}
            {value === 'pending' && !!pendingCount && (
              <span className="rounded-full bg-brand-blue/10 px-1.5 text-xs font-semibold text-brand-blue">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {sample && (
        <div className="border-t border-zinc-200 px-6 pt-4">
          <SampleEventsNotice />
        </div>
      )}

      <div className={sample ? 'mt-4' : ''}>
        <EventTable
          events={shown}
          error={loadError}
          empty={hasFilters(filters) ? 'No requests match your search or filters.' : current.empty}
          showPoster={false}
          onOpen={setReviewing}
          onRetry={reload}
        />
      </div>

      {reviewing && (
        <EventReviewModal
          event={reviewing}
          onClose={() => setReviewing(null)}
          onReviewed={() => {
            reload()
            onReviewed()
          }}
        />
      )}
    </section>
  )
}
