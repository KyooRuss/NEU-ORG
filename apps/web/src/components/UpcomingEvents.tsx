import { useEffect, useState } from 'react'

import { fetchApprovedEvents, formatEventDate, type OrgEvent, posterUrl } from '../lib/events'
import { fetchMyOrganizationIds } from '../lib/officers'
import EventReviewModal from './EventReviewModal'
import { RecentPanel, RecentRow } from './RecentlyAdded'

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

  return (
    <RecentPanel
      title="Upcoming Events"
      status={
        error
          ? `Could not load events: ${error}`
          : events === null
            ? 'Loading…'
            : noOrganization
              ? "You aren't assigned to an organization yet."
              : events.length === 0
                ? 'No upcoming events. Approved event posts will appear here.'
                : null
      }
    >
      {events?.map((event) => {
        const poster = posterUrl(event.poster_path)
        return (
          <RecentRow
            key={event.id}
            label={`View ${event.title}`}
            onClick={() => setViewing(event)}
            avatar={poster ? <img src={poster} alt="" className="size-full object-cover" /> : null}
            title={event.title}
            subtitle={`${event.organization_name} • ${formatEventDate(event)} • ${event.venue}`}
          />
        )
      })}
      {viewing && <EventReviewModal event={viewing} onClose={() => setViewing(null)} onReviewed={() => {}} />}
    </RecentPanel>
  )
}
