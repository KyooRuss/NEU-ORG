import { CalendarDays, ImageIcon, MapPin, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

import { fetchApprovedEvents, formatAudience, formatEventDate, type OrgEvent, posterUrl } from '../lib/events'
import { fetchMyOrganizationIds } from '../lib/officers'
import DashboardPanel from './DashboardPanel'
import EventReviewModal from './EventReviewModal'

// The officer dashboard's list: approved events of the officer's organizations
// that haven't ended yet, nearest first.
export default function UpcomingEvents({ profileId }: { profileId: string }) {
  const [events, setEvents] = useState<OrgEvent[] | null>(null)
  // True when the officer holds no active position in any organization.
  const [noOrganization, setNoOrganization] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<OrgEvent | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMyOrganizationIds(profileId)
      .then(async (organizationIds) => {
        const loaded = await fetchApprovedEvents('upcoming', organizationIds)
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
          ? 'No upcoming events. Approved event posts will appear here.'
          : null

  return (
    <DashboardPanel title="Upcoming Events" icon={CalendarDays} className="bg-white shadow-md ring-1 ring-zinc-200">
      {status ? (
        <p className="px-6 py-10 text-center text-sm text-zinc-500">{status}</p>
      ) : (
        <ul className="px-6 sm:px-10">
          {events!.map((event) => {
            const poster = posterUrl(event.poster_path)
            return (
              <li key={event.id} className="border-b border-zinc-300 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setViewing(event)}
                  aria-label={`View ${event.title}`}
                  className="flex w-full items-start gap-6 rounded-lg py-6 text-left transition hover:bg-zinc-50 sm:gap-10 sm:px-6"
                >
                  <span className="flex h-30 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-300/70 text-zinc-400">
                    {poster ? (
                      <img src={poster} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageIcon size={24} aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-zinc-900">{event.title}</span>
                    <span className="block truncate text-sm text-zinc-500">{event.organization_name}</span>
                    <span className="mt-3 grid gap-1.5 text-sm text-zinc-700">
                      <EventDetail icon={CalendarDays}>{formatEventDate(event)}</EventDetail>
                      <EventDetail icon={MapPin}>{event.venue}</EventDetail>
                      <EventDetail icon={Users}>{formatAudience(event)}</EventDetail>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {viewing && <EventReviewModal event={viewing} readOnly onClose={() => setViewing(null)} onReviewed={() => {}} />}
    </DashboardPanel>
  )
}

function EventDetail({ icon: Icon, children }: { icon: typeof MapPin; children: string }) {
  return (
    <span className="flex items-start gap-2">
      <Icon size={16} className="mt-0.5 shrink-0 text-brand-blue" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </span>
  )
}
