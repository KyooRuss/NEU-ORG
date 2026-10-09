import { Eye, ImageOff } from 'lucide-react'

import { formatEventDay, formatEventTime, isResubmitted, type OrgEvent, posterUrl } from '../lib/events'
import IconButton from './IconButton'

// The list used by every event page.
export default function EventTable({
  events,
  error,
  empty,
  onOpen,
  onRetry,
}: {
  events: OrgEvent[] | null
  error: string | null
  empty: string
  onOpen: (event: OrgEvent) => void
  onRetry: () => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="border-y border-zinc-200 bg-surface text-xs tracking-wide text-zinc-500 uppercase">
          <tr>
            <th scope="col" className="px-6 py-3 font-medium">
              Organization
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Department
            </th>
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
            <th scope="col" className="px-6 py-3 text-center font-medium">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {events?.map((event) => (
            <tr key={event.id} className="transition hover:bg-surface/60">
              <td className="px-6 py-4 font-medium text-brand-navy">{event.organization_name}</td>
              <td className="px-6 py-4 text-zinc-700">{event.organization_department}</td>
              <td className="px-6 py-4">
                <EventNameCell event={event} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-zinc-700">{formatEventDay(event)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-zinc-700">{formatEventTime(event)}</td>
              <td className="px-6 py-4 text-zinc-700">{event.venue}</td>
              <td className="px-6 py-4">
                <div className="flex justify-center">
                  <IconButton icon={Eye} label={`Open ${event.title}`} onClick={() => onOpen(event)} />
                </div>
              </td>
            </tr>
          ))}
          {(events === null || error || events.length === 0) && (
            <tr>
              <td colSpan={7}className="px-6 py-10 text-center text-sm text-zinc-500">
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
      <p className="flex min-w-0 flex-wrap items-center gap-2 font-medium text-brand-navy">
        {event.title}
        {isResubmitted(event) && <ResubmittedTag />}
      </p>
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
