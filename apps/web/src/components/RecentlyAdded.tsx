import { CalendarDays, ChevronRight, type LucideIcon, Users } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import { fetchEventsApprovedThisMonth, formatEventDay, formatEventTime, type OrgEvent, posterUrl } from '../lib/events'
import { fetchOrganizations, mediaUrl, type Organization } from '../lib/organizations'
import EventReviewModal from './EventReviewModal'
import OrganizationDetailsModal from './OrganizationDetailsModal'

function addedThisMonth(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

// Organizations created during the current calendar month, newest first.
export function RecentOrganizations() {
  const [orgs, setOrgs] = useState<Organization[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<Organization | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchOrganizations('active')
      .then((loaded) => {
        if (cancelled) return
        setOrgs(
          loaded
            .filter((org) => addedThisMonth(org.created_at))
            .sort((a, b) => b.created_at.localeCompare(a.created_at)),
        )
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <RecentPanel
      title="Recently Added Organizations"
      icon={Users}
      status={
        error
          ? `Could not load organizations: ${error}`
          : orgs === null
            ? 'Loading…'
            : orgs.length === 0
              ? 'No organizations added this month.'
              : null
      }
    >
      {orgs?.map((org) => {
        const logo = mediaUrl(org.logo_path)
        return (
          <RecentRow
            key={org.id}
            label={`View ${org.name}`}
            onClick={() => setViewing(org)}
            avatar={logo ? <img src={logo} alt="" className="size-full object-cover" /> : null}
            title={org.name}
            subtitle={org.categories.join(' • ')}
          />
        )
      })}
      {viewing && <OrganizationDetailsModal organization={viewing} onClose={() => setViewing(null)} />}
    </RecentPanel>
  )
}

// Events approved during the current calendar month, newest first.
export function RecentEvents() {
  const [events, setEvents] = useState<OrgEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<OrgEvent | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchEventsApprovedThisMonth()
      .then((loaded) => {
        if (!cancelled) setEvents(loaded)
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <RecentPanel
      title="Recently Added Events"
      icon={CalendarDays}
      status={
        error
          ? `Could not load events: ${error}`
          : events === null
            ? 'Loading…'
            : events.length === 0
              ? 'No events added this month.'
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
            subtitle={`${event.organization_name} • ${formatEventDay(event)} • ${formatEventTime(event)}`}
          />
        )
      })}
      {viewing && <EventReviewModal event={viewing} onClose={() => setViewing(null)} onReviewed={() => {}} />}
    </RecentPanel>
  )
}

// A white card with an icon and title, holding RecentRows.
export function RecentPanel({
  title,
  icon: Icon,
  status,
  children,
}: {
  title: string
  icon: LucideIcon
  status: string | null
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-md">
      <h2 className="flex items-center gap-2.5 text-base font-semibold text-[#3b4a7a]">
        <Icon size={18} className="shrink-0 text-brand-navy" aria-hidden="true" />
        {title}
      </h2>
      {status ? (
        <p className="mt-5 rounded-xl bg-[#f4f7fb] px-6 py-6 text-center text-sm text-zinc-500">{status}</p>
      ) : (
        <ul className="mt-5 space-y-3">{children}</ul>
      )}
    </section>
  )
}

export function RecentRow({
  label,
  onClick,
  avatar,
  title,
  subtitle,
}: {
  label: string
  onClick: () => void
  avatar: ReactNode
  title: string
  subtitle: ReactNode
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex w-full items-center gap-4 rounded-xl bg-[#f4f7fb] py-3 pr-5 pl-4 text-left transition hover:bg-[#e6edfb]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-300">
          {avatar}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-zinc-800">{title}</span>
          <span className="block truncate text-xs text-zinc-500">{subtitle}</span>
        </span>
        <ChevronRight size={14} strokeWidth={2.5} className="shrink-0 text-zinc-900" aria-hidden="true" />
      </button>
    </li>
  )
}
