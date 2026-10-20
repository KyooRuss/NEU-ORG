import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import EventReviewModal from '../components/EventReviewModal'
import EventTable, { SampleEventsNotice } from '../components/EventTable'
import { primaryButton } from '../components/Modal'
import PageBanner from '../components/PageBanner'
import { type EventStatus, fetchMyEvents, type OrgEvent, usingSampleEvents } from '../lib/events'
import { fetchMyOrganizationIds } from '../lib/officers'
import { fetchOrganizationsByIds, type Organization } from '../lib/organizations'
import EventFormPage from './EventFormPage'

type Tab = 'all' | EventStatus

const TABS: { value: Tab; label: string; empty: string }[] = [
  {
    value: 'all',
    label: 'All',
    empty: 'No event posts yet. Create one to send it to the admin for approval.',
  },
  {
    value: 'pending',
    label: 'Waiting for approval',
    empty: 'No requests are waiting for approval.',
  },
  {
    value: 'revision',
    label: 'For Revision',
    empty: 'Nothing to revise. Requests the admin sends back will appear here.',
  },
  {
    value: 'approved',
    label: 'Approved',
    empty: 'No approved events yet.',
  },
  {
    value: 'declined',
    label: 'Declined',
    empty: 'No declined requests.',
  },
]

// The officer's event requests: create one, follow its status, and fix and resubmit
// the ones the admin sent back. An officer in several organizations picks which one.
export default function EventPostsPage({ profileId }: { profileId: string }) {
  const [orgs, setOrgs] = useState<Organization[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // The form page, when open: creating a request, or editing the one given.
  const [form, setForm] = useState<{ event?: OrgEvent } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMyOrganizationIds(profileId)
      .then(fetchOrganizationsByIds)
      .then((loaded) => {
        if (!cancelled) setOrgs(loaded)
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [profileId])

  const org = orgs?.find((item) => item.id === selectedId) ?? orgs?.[0]

  // The form takes over the page. Closing it shows the list again, freshly loaded.
  if (org && form) {
    return (
      <EventFormPage
        organization={org}
        event={form.event}
        onCancel={() => setForm(null)}
        onSaved={() => setForm(null)}
      />
    )
  }

  return (
    <>
      <PageBanner>
        <h1 className="truncate text-2xl font-bold">Event Posts</h1>
        <p className="mt-1 text-sm text-white/90">Create event requests and follow their approval</p>
      </PageBanner>

      {error ? (
        <p role="alert" className="mt-8 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load your organization: {error}
        </p>
      ) : !orgs ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Loading…</p>
      ) : !org ? (
        <p className="mt-8 text-center text-sm text-zinc-500">You aren't assigned to an organization yet.</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {orgs.length > 1 && (
              <div role="tablist" aria-label="Your organizations" className="flex flex-wrap gap-2">
                {orgs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={item.id === org.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`rounded-full px-4 py-1.5 text-sm transition ${
                      item.id === org.id
                        ? 'bg-brand-blue text-white'
                        : 'bg-white text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setForm({})}
              className={`${primaryButton} ml-auto inline-flex items-center gap-2`}
            >
              <Plus size={14} aria-hidden="true" />
              Create Event
            </button>
          </div>

          {/* A new key reloads the requests when the officer switches organization. */}
          <EventPostsList key={org.id} organizationId={org.id} onEdit={(event) => setForm({ event })} />
        </>
      )}
    </>
  )
}

// One organization's requests, with a tab per status.
function EventPostsList({
  organizationId,
  onEdit,
}: {
  organizationId: string
  onEdit: (event: OrgEvent) => void
}) {
  const [tab, setTab] = useState<Tab>('all')
  const [events, setEvents] = useState<OrgEvent[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [sample, setSample] = useState(false)
  const [viewing, setViewing] = useState<OrgEvent | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMyEvents([organizationId])
      .then((loaded) => {
        if (cancelled) return
        setEvents(loaded)
        setSample(usingSampleEvents())
        setLoadError(null)
      })
      .catch((caught: Error) => {
        if (!cancelled) setLoadError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [organizationId, reloadKey])

  const current = TABS.find((item) => item.value === tab)!
  const inTab = (value: Tab) => events?.filter((event) => value === 'all' || event.status === value) ?? null

  return (
    <section className="mt-6 rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
      <div role="tablist" aria-label="Request status" className="flex gap-1 overflow-x-auto px-6 pt-5">
        {TABS.map(({ value, label }) => {
          const count = inTab(value)?.length
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={value === tab}
              onClick={() => setTab(value)}
              className="-mb-px flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 pb-3 text-sm whitespace-nowrap text-zinc-500 transition hover:text-brand-navy aria-selected:border-brand-blue aria-selected:font-semibold aria-selected:text-brand-navy"
            >
              {label}
              {!!count && (
                <span className="rounded-full bg-brand-blue/10 px-1.5 text-xs font-semibold text-brand-blue">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {sample && (
        <div className="border-t border-zinc-200 px-6 pt-4">
          <SampleEventsNotice />
        </div>
      )}

      <div className={sample ? 'mt-4' : ''}>
        <EventTable
          events={inTab(tab)}
          error={loadError}
          empty={current.empty}
          showOrganization={false}
          showStatus
          onOpen={setViewing}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      </div>

      {viewing && (
        <EventReviewModal
          event={viewing}
          readOnly
          onClose={() => setViewing(null)}
          onReviewed={() => {}}
          onEdit={() => onEdit(viewing)}
        />
      )}
    </section>
  )
}
