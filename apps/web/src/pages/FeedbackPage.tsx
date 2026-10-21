import { CalendarDays, ImageIcon, Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import FeedbackStatsModal from '../components/FeedbackStatsModal'
import PageBanner from '../components/PageBanner'
import { fetchApprovedEvents, type OrgEvent, posterUrl } from '../lib/events'
import { fetchMyOrganizationIds } from '../lib/officers'

// The officer's Feedback page: the past events of their organizations, as cards.
// A card's View Rating button opens the event's feedback ratings.
export default function FeedbackPage({ profileId }: { profileId: string }) {
  const [events, setEvents] = useState<OrgEvent[] | null>(null)
  // True when the officer holds no active position in any organization.
  const [noOrganization, setNoOrganization] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<OrgEvent | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchMyOrganizationIds(profileId)
      .then(async (organizationIds) => {
        const loaded = await fetchApprovedEvents('past', organizationIds)
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
          ? 'No past events yet. Events appear here once they have ended.'
          : null

  // Events whose title or organization matches the search.
  const query = search.trim().toLowerCase()
  const shown = (events ?? []).filter(
    (event) =>
      !query || event.title.toLowerCase().includes(query) || event.organization_name.toLowerCase().includes(query),
  )

  return (
    <>
      <PageBanner>
        <h1 className="truncate text-2xl font-bold">Feedback</h1>
        <p className="mt-1 text-sm text-white/90">
          Review attendee ratings and comments to evaluate event performance and identify opportunities for
          improvement.
        </p>
      </PageBanner>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white px-6 pt-7 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="flex items-center gap-3 font-semibold text-[#3b4a7a]">
            <CalendarDays size={18} className="text-brand-navy" aria-hidden="true" />
            Past Events
          </h2>
          <label className="relative w-full sm:w-56">
            <span className="sr-only">Search event</span>
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(change) => setSearch(change.target.value)}
              placeholder="Search event"
              className="w-full rounded-full bg-zinc-200/70 py-1.5 pr-3 pl-8 text-xs text-zinc-800 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-blue/30"
            />
          </label>
        </div>

        {status ? (
          <p className="mt-8 rounded-xl bg-[#f4f7fb] px-6 py-10 text-center text-sm text-zinc-500">{status}</p>
        ) : shown.length === 0 ? (
          <p className="mt-8 rounded-xl bg-[#f4f7fb] px-6 py-10 text-center text-sm text-zinc-500">
            No past events match “{search.trim()}”.
          </p>
        ) : (
          <ul className="mt-8 flex flex-wrap gap-6 sm:px-6">
            {shown.map((event) => {
              const poster = posterUrl(event.poster_path)
              return (
                <li
                  key={event.id}
                  className="flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-zinc-200 sm:w-60"
                >
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
                        onClick={() => setViewing(event)}
                        aria-label={`View rating for ${event.title}`}
                        className="rounded-full bg-[#c9d0f7] px-4 py-2 text-xs font-semibold text-brand-navy transition hover:bg-[#b5bef3]"
                      >
                        View Rating
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {viewing && <FeedbackStatsModal event={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}
