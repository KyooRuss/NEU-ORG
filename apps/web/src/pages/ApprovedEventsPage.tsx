import { useEffect, useState } from 'react'

import EventReviewModal from '../components/EventReviewModal'
import EventTable, { SampleEventsNotice } from '../components/EventTable'
import { type EventTiming, fetchApprovedEvents, formatDay, type OrgEvent, usingSampleEvents } from '../lib/events'

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

// Approved events, for viewing. They move from Upcoming to Past on their own once they end.
export default function ApprovedEventsPage({ timing }: { timing: EventTiming }) {
  const [events, setEvents] = useState<OrgEvent[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [sample, setSample] = useState(false)
  const [viewing, setViewing] = useState<OrgEvent | null>(null)

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

  return (
    <section className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
      <div className="p-6">
        <h1 className="font-semibold text-brand-navy">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {description} Total:{' '}
          <span className="font-semibold text-brand-navy">{events?.length ?? '—'}</span>
        </p>
      </div>

      {sample && (
        <div className="px-6 pb-4">
          <SampleEventsNotice />
        </div>
      )}

      <EventTable
        events={events}
        error={loadError}
        empty={empty}
        dateColumn={{
          label: 'Approved',
          value: (event) => (event.approved_at ? formatDay(event.approved_at) : '—'),
        }}
        onOpen={setViewing}
        onRetry={() => setReloadKey((key) => key + 1)}
      />

      {/* Approved events are view only, so there's nothing to refresh after closing. */}
      {viewing && <EventReviewModal event={viewing} onClose={() => setViewing(null)} onReviewed={() => {}} />}
    </section>
  )
}
