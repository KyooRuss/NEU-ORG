import { Eye, ImageOff } from 'lucide-react'

import { formatEventDate, isResubmitted, type OrgEvent, posterUrl } from '../lib/events'
import IconButton from './IconButton'

// The list used by every event page. The second date column changes per page
// (Submitted, Last updated, Approved...), so the page passes it in.
export default function EventTable({
  events,
  error,
  empty,
  dateColumn,
  onOpen,
  onRetry,
}: {
  events: OrgEvent[] | null
  error: string | null
  empty: string
  dateColumn: { label: string; value: (event: OrgEvent) => string }
  onOpen: (event: OrgEvent) => void
  onRetry: () => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-y border-zinc-200 bg-surface text-xs tracking-wide text-zinc-500 uppercase">
          <tr>
            <th scope="col" className="px-6 py-3 font-medium">
              Event
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Event Date
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              {dateColumn.label}
            </th>
            <th scope="col" className="px-6 py-3 text-right font-medium">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {events?.map((event) => (
            <tr key={event.id} className="transition hover:bg-surface/60">
              <td className="px-6 py-4">
                <EventNameCell event={event} />
              </td>
              <td className="px-6 py-4 text-zinc-700">{formatEventDate(event)}</td>
              <td className="px-6 py-4 text-zinc-700">{dateColumn.value(event)}</td>
              <td className="px-6 py-4">
                <div className="flex justify-end">
                  <IconButton icon={Eye} label={`Open ${event.title}`} onClick={() => onOpen(event)} />
                </div>
              </td>
            </tr>
          ))}
          {(events === null || error || events.length === 0) && (
            <tr>
              <td colSpan={4} className="px-6 py-10 text-center text-sm text-zinc-500">
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

function EventNameCell({ event }: { event: OrgEvent }) {
  const poster = posterUrl(event.poster_path)
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-blue/10 text-brand-blue">
        {poster ? (
          <img src={poster} alt="" className="size-full object-cover" />
        ) : (
          <ImageOff size={16} aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium text-brand-navy">
          {event.title}
          {isResubmitted(event) && <ResubmittedTag />}
        </p>
        <p className="text-xs text-zinc-500">{event.organization_name}</p>
      </div>
    </div>
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
