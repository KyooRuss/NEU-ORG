import { ImageIcon } from 'lucide-react'

import { type OrgEvent, posterUrl } from '../lib/events'

// An event as a card: the top of its poster, then its title, organization, a short
// description, and one button. Used by the Feedback and Upcoming Events pages.
export default function EventCard({
  event,
  actionLabel,
  onAction,
}: {
  event: OrgEvent
  actionLabel: string
  onAction: (event: OrgEvent) => void
}) {
  const poster = posterUrl(event.poster_path)
  return (
    <li className="flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-zinc-200 sm:w-60">
      <span className="flex h-32 items-center justify-center bg-zinc-300 text-zinc-400">
        {poster ? (
          <img src={poster} alt="" className="size-full object-cover object-top" />
        ) : (
          <ImageIcon size={24} aria-hidden="true" />
        )}
      </span>
      {/* The white panel rises over the bottom of the poster. */}
      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-white p-5">
        <h3 className="truncate text-sm font-semibold text-zinc-900">{event.title}</h3>
        <p className="truncate text-xs text-zinc-500">{event.organization_name}</p>
        <p className="mt-3 line-clamp-2 text-[11px] text-zinc-700 italic">{event.description}</p>
        {/* Pinned to the bottom, so the buttons line up across cards. */}
        <div className="mt-auto pt-5 text-center">
          <button
            type="button"
            onClick={() => onAction(event)}
            aria-label={`${actionLabel}: ${event.title}`}
            className="rounded-full bg-[#c9d0f7] px-4 py-2 text-xs font-semibold text-brand-navy transition hover:bg-[#b5bef3]"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </li>
  )
}
