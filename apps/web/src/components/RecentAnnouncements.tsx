import { ChevronRight, Megaphone } from 'lucide-react'
import { useEffect, useState } from 'react'

import { type Announcement, fetchRecentAnnouncements } from '../lib/announcements'
import { fetchMyOrganizationIds } from '../lib/officers'
import DashboardPanel from './DashboardPanel'

// The officer dashboard's latest announcements. The arrow opens one on the Announcements page.
export default function RecentAnnouncements({
  profileId,
  onOpen,
}: {
  profileId: string
  onOpen: (announcement: Announcement) => void
}) {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMyOrganizationIds(profileId)
      .then(fetchRecentAnnouncements)
      .then((loaded) => {
        if (!cancelled) setAnnouncements(loaded)
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [profileId])

  const status = error
    ? `Could not load announcements: ${error}`
    : announcements === null
      ? 'Loading…'
      : announcements.length === 0
        ? 'No announcements yet.'
        : null

  return (
    <DashboardPanel title="Recent Announcements" icon={Megaphone}>
      {status ? (
        <p className="border-b border-zinc-300 px-6 py-8 text-center text-sm text-zinc-500">{status}</p>
      ) : (
        <ul>
          {announcements!.map((announcement) => (
            <li key={announcement.id} className="flex items-center gap-4 border-b border-zinc-300 py-3 pr-2 pl-10">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">{announcement.title}</p>
                <p className="truncate text-xs text-zinc-500 italic">{announcement.description}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpen(announcement)}
                aria-label={`Open ${announcement.title}`}
                title="Open announcement"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition hover:bg-[#e6edfb] hover:text-brand-navy"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </DashboardPanel>
  )
}
