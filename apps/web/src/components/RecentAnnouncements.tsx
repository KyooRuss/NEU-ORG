import { ChevronRight, Megaphone } from 'lucide-react'
import { useEffect, useState } from 'react'

import { type Announcement, fetchRecentAnnouncements } from '../lib/announcements'
import { fetchMyOrganizationIds } from '../lib/officers'

// The officer dashboard's latest announcements. Clicking one opens it on the Announcements page.
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
    <section className="h-full rounded-2xl border border-zinc-200 bg-white p-5 shadow-md">
      <h2 className="flex items-center gap-2.5 text-base font-semibold text-[#3b4a7a]">
        <Megaphone size={16} className="text-brand-navy" fill="currentColor" aria-hidden="true" />
        Recent Announcements
      </h2>
      {status ? (
        <p className="mt-5 rounded-xl bg-[#f4f7fb] px-6 py-8 text-center text-sm text-zinc-500">{status}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {announcements!.map((announcement) => (
            <li key={announcement.id}>
              <button
                type="button"
                onClick={() => onOpen(announcement)}
                aria-label={`Open ${announcement.title}`}
                title="Open announcement"
                className="flex w-full items-center gap-4 rounded-xl bg-[#f4f7fb] py-2.5 pr-5 pl-4 text-left transition hover:bg-[#e6edfb]"
              >
                <NoteIcon />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-800">{announcement.title}</p>
                  <p className="text-[11px] text-zinc-500 italic">{previewWords(announcement.description)}</p>
                </div>
                <ChevronRight size={14} strokeWidth={2.5} className="shrink-0 text-zinc-900" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// The first 10 words of a description, with an ellipsis when there's more.
function previewWords(text: string) {
  const words = text.trim().split(/\s+/)
  return words.length > 10 ? `${words.slice(0, 10).join(' ')}...` : text
}

// A light blue note with a folded corner, marking each announcement.
function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <path d="M5 3h14a2 2 0 0 1 2 2v9l-7 7H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="#7fb2e5" />
      <path d="M14 21v-5a2 2 0 0 1 2-2h5z" fill="#b9d6f2" />
      <path d="M7 8h10M7 12h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
