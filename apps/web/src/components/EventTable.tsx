import { Eye, ImageOff } from 'lucide-react'

import {
  type EventStatus,
  formatEventDay,
  formatEventTime,
  isResubmitted,
  type OrgEvent,
  posterUrl,
} from '../lib/events'
import IconButton from './IconButton'

// The list used by every event page. The officer's page shows one organization at a
// time, so it hides the organization columns and shows each request's status instead.
export default function EventTable({
  events,
  error,
  empty,
  showOrganization = true,
  showStatus = false,
  centered = false,
  onOpen,
  onRetry,
}: {
  events: OrgEvent[] | null
  error: string | null
  empty: string
  showOrganization?: boolean
  showStatus?: boolean
  // Center every column, titles and contents, not just Action.
  centered?: boolean
  onOpen: (event: OrgEvent) => void
  onRetry: () => void
}) {
  const columnCount = 5 + (showOrganization ? 2 : 0) + (showStatus ? 1 : 0)

  return (
    <div className="overflow-x-auto">
      <table className={`w-full min-w-[1000px] text-sm ${centered ? 'text-center' : 'text-left'}`}>
        <thead className="border-y border-zinc-200 bg-surface text-xs tracking-wide text-zinc-500 uppercase">
          <tr>
            {showOrganization && (
              <>
                <th scope="col" className="px-6 py-3 font-medium">
                  Organization
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Department
                </th>
              </>
            )}
            <th scope="col" className="px-6 py-3 font-medium">
              Event Title
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Date
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Time
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Venue
            </th>
            {showStatus && (
              <th scope="col" className="px-6 py-3 font-medium">
                Status
              </th>
            )}
            <th scope="col" className="px-6 py-3 text-center font-medium">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {events?.map((event) => (
            <tr key={event.id} className="transition hover:bg-surface/60">
              {showOrganization && (
                <>
                  <td className="px-6 py-4 font-medium text-brand-navy">{event.organization_name}</td>
                  <td className="px-6 py-4 text-zinc-700">{event.organization_department}</td>
                </>
              )}
              <td className="px-6 py-4">
                <EventNameCell event={event} centered={centered} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-zinc-700">{formatEventDay(event)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-zinc-700">{formatEventTime(event)}</td>
              <td className="px-6 py-4 text-zinc-700">{event.venue}</td>
              {showStatus && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusTag status={event.status} officer />
                </td>
              )}
              <td className="px-6 py-4">
                <div className="flex justify-center">
                  <IconButton icon={Eye} label={`Open ${event.title}`} onClick={() => onOpen(event)} />
                </div>
              </td>
            </tr>
          ))}
          {(events === null || error || events.length === 0) && (
            <tr>
              <td colSpan={columnCount} className="px-6 py-10 text-center text-sm text-zinc-500">
                {error ? (
                  <span className="text-red-700">
                    Could not load events: {error}{' '}
                    <button type="button" onClick={onRetry} className="font-medium underline">
                      Try again
                    </button>
                  </span>
                ) : events === null ? (
                  'Loading…'
                ) : (
                  empty
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// The poster thumbnail and title. The organization has its own column now.
function EventNameCell({ event, centered }: { event: OrgEvent; centered: boolean }) {
  const poster = posterUrl(event.poster_path)
  return (
    <div className={`flex items-center gap-3 ${centered ? 'justify-center' : ''}`}>
      <span className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-blue/10 text-brand-blue">
        {poster ? (
          <img src={poster} alt="" className="size-full object-cover" />
        ) : (
          <ImageOff size={16} aria-hidden="true" />
        )}
      </span>
      <p className="flex min-w-0 flex-wrap items-center gap-2 font-medium text-brand-navy">
        {event.title}
        {isResubmitted(event) && <ResubmittedTag />}
      </p>
    </div>
  )
}

const STATUS_LABELS: Record<EventStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-brand-blue/10 text-brand-blue' },
  revision: { label: 'For Revision', className: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700' },
  declined: { label: 'Declined', className: 'bg-red-50 text-red-700' },
}

// Officers see a pending request as waiting on the admin.
export function StatusTag({ status, officer = false }: { status: EventStatus; officer?: boolean }) {
  const { label, className } = STATUS_LABELS[status]
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {officer && status === 'pending' ? 'Waiting for approval' : label}
    </span>
  )
}

export function ResubmittedTag() {
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
      Resubmitted
    </span>
  )
}

export function SampleEventsNotice() {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <strong className="font-semibold">Showing sample events.</strong> The events table isn’t in
      Supabase yet, so changes here only last until you reload the page. Apply the events migration
      to save real data.
    </p>
  )
}
