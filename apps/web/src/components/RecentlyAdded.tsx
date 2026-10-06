import { ChevronRight } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import { fetchOrganizations, mediaUrl, type Organization } from '../lib/organizations'
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

// Events aren't stored in Supabase yet. Once the events table exists, list the
// events approved this month here, the same way RecentOrganizations does.
export function RecentEvents() {
  return (
    <RecentPanel title="Recently Added Events" status="No events added this month.">
      {null}
    </RecentPanel>
  )
}

function RecentPanel({
  title,
  status,
  children,
}: {
  title: string
  status: string | null
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="rounded-lg bg-[#e8eefc] px-6 py-4 text-base font-semibold text-brand-navy shadow-md ring-1 ring-zinc-300">
        {title}
      </h2>
      <ul className="mt-2 px-1">{children}</ul>
      {status && <p className="px-6 py-6 text-center text-sm text-zinc-500">{status}</p>}
    </section>
  )
}

function RecentRow({
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
    <li className="border-b border-zinc-300">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-white/70"
      >
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-500 text-white">
          {avatar}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-900">{title}</span>
          <span className="block truncate text-[11px] text-zinc-500">{subtitle}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-zinc-600" aria-hidden="true" />
      </button>
    </li>
  )
}
