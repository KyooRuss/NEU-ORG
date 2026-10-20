import { Megaphone, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { fetchMyOrganizationIds } from '../lib/officers'
import { fetchOrganizationsByIds, type Organization } from '../lib/organizations'
import AnnouncementFormPage, { ANNOUNCEMENT_AUDIENCES, type Announcement } from './AnnouncementFormPage'

const COLUMNS = ['Announcement Title', 'Audience', 'Date Posted', 'Action']

// "2026-10-24" as "Oct 24, 2026". Parsed as a local date so it doesn't shift a day.
function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// The officer's announcements for students and organization members.
// Saving announcements arrives in a later step, so posted ones only last until the page is left.
export default function AnnouncementsPage({ profileId }: { profileId: string }) {
  const [org, setOrg] = useState<Organization | null>(null)
  const [creating, setCreating] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  // The form shows the organization's name. An officer in several organizations sees the first.
  useEffect(() => {
    let cancelled = false
    fetchMyOrganizationIds(profileId)
      .then(fetchOrganizationsByIds)
      .then((loaded) => {
        if (!cancelled) setOrg(loaded[0] ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [profileId])

  // The form takes over the page. Posting adds the announcement to the top of the list.
  if (creating) {
    return (
      <AnnouncementFormPage
        organizationName={org?.name ?? ''}
        onCancel={() => setCreating(false)}
        onPosted={(announcement) => {
          setAnnouncements((current) => [announcement, ...current])
          setCreating(false)
          window.scrollTo(0, 0)
        }}
      />
    )
  }

  return (
    <>
      <section className="rounded-2xl bg-linear-to-r from-brand-navy to-[#2f45c8] px-6 py-8 text-white shadow-lg sm:px-12">
        <h1 className="truncate text-2xl font-bold">Announcement</h1>
        <p className="mt-1 text-sm text-white/90">
          Create and manage announcements for students and organization members.
        </p>
      </section>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setCreating(true)
            window.scrollTo(0, 0)
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-navy"
        >
          <Plus size={14} aria-hidden="true" />
          Create Announcement
        </button>
      </div>

      <section className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-zinc-200 bg-surface text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column} scope="col" className="px-6 py-3 text-center font-medium whitespace-nowrap">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {announcements.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-6 py-24 text-center text-zinc-500">
                    <Megaphone size={28} className="mx-auto mb-3 text-zinc-300" aria-hidden="true" />
                    No announcements yet. Create one to share it with students and members.
                  </td>
                </tr>
              ) : (
                announcements.map((announcement) => (
                  <tr key={announcement.id} className="text-center text-zinc-800">
                    <td className="px-6 py-4 font-semibold text-brand-navy">{announcement.title}</td>
                    <td className="px-6 py-4">
                      {ANNOUNCEMENT_AUDIENCES.find((item) => item.value === announcement.audience)?.label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(announcement.date)}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          setAnnouncements((current) => current.filter((item) => item.id !== announcement.id))
                        }
                        aria-label={`Delete ${announcement.title}`}
                        title="Delete"
                        className="inline-flex size-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
