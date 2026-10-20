import { Eye, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import Modal, { primaryButton, secondaryButton } from '../components/Modal'
import PageBanner from '../components/PageBanner'
import {
  ANNOUNCEMENT_AUDIENCES,
  type Announcement,
  deleteAnnouncement,
  fetchAnnouncements,
  usingSampleAnnouncements,
} from '../lib/announcements'
import { fetchMyOrganizationIds } from '../lib/officers'
import { fetchOrganizationsByIds, type Organization } from '../lib/organizations'
import AnnouncementFormPage from './AnnouncementFormPage'

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

const audienceLabel = (announcement: Announcement) =>
  ANNOUNCEMENT_AUDIENCES.find((item) => item.value === announcement.audience)?.label

// The officer's announcements for students and organization members.
// An officer in several organizations manages the first one's.
export default function AnnouncementsPage({ profileId }: { profileId: string }) {
  const [org, setOrg] = useState<Organization | null | undefined>(undefined)
  const [orgError, setOrgError] = useState<string | null>(null)
  // The form page, when open: creating an announcement, or editing the one given.
  const [form, setForm] = useState<{ announcement?: Announcement } | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [sample, setSample] = useState(false)
  const [viewing, setViewing] = useState<Announcement | null>(null)
  const [deleting, setDeleting] = useState<Announcement | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMyOrganizationIds(profileId)
      .then(fetchOrganizationsByIds)
      .then((loaded) => {
        if (!cancelled) setOrg(loaded[0] ?? null)
      })
      .catch((caught: Error) => {
        if (!cancelled) setOrgError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [profileId])

  const orgId = org?.id
  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    fetchAnnouncements(orgId)
      .then((loaded) => {
        if (cancelled) return
        setAnnouncements(loaded)
        setSample(usingSampleAnnouncements())
        setLoadError(null)
      })
      .catch((caught: Error) => {
        if (!cancelled) setLoadError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [orgId, reloadKey, form])

  function openForm(announcement?: Announcement) {
    setForm({ announcement })
    window.scrollTo(0, 0)
  }

  // The form takes over the page. Closing it shows the list again, freshly loaded.
  if (org && form) {
    return (
      <AnnouncementFormPage
        organization={org}
        announcement={form.announcement}
        onCancel={() => setForm(null)}
        onSaved={() => {
          setForm(null)
          window.scrollTo(0, 0)
        }}
      />
    )
  }

  return (
    <>
      <PageBanner>
        <h1 className="truncate text-2xl font-bold">Announcement</h1>
        <p className="mt-1 text-sm text-white/90">
          Create and manage announcements for students and organization members.
        </p>
      </PageBanner>

      {orgError ? (
        <p role="alert" className="mt-8 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load your organization: {orgError}
        </p>
      ) : org === undefined ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Loading…</p>
      ) : !org ? (
        <p className="mt-8 text-center text-sm text-zinc-500">You aren't assigned to an organization yet.</p>
      ) : (
        <>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => openForm()}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-navy"
            >
              <Plus size={14} aria-hidden="true" />
              Create Announcement
            </button>
          </div>

          {sample && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
              The announcements table isn't in the database yet, so announcements are only kept until you
              reload the page.
            </p>
          )}

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
                  {loadError ? (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-6 py-16 text-center">
                        <p role="alert" className="text-sm text-red-700">
                          Could not load announcements: {loadError}
                        </p>
                        <button
                          type="button"
                          onClick={() => setReloadKey((key) => key + 1)}
                          className={`${secondaryButton} mt-3`}
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : !announcements ? (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-6 py-24 text-center text-zinc-500">
                        Loading…
                      </td>
                    </tr>
                  ) : announcements.length === 0 ? (
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
                        <td className="px-6 py-4">{audienceLabel(announcement)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{formatDate(announcement.announcement_date)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewing(announcement)}
                              aria-label={`View ${announcement.title}`}
                              title="View"
                              className="flex size-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
                            >
                              <Eye size={18} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openForm(announcement)}
                              aria-label={`Edit ${announcement.title}`}
                              title="Edit"
                              className="flex size-8 items-center justify-center rounded-full text-brand-blue transition hover:bg-brand-blue/10"
                            >
                              <Pencil size={17} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(announcement)}
                              aria-label={`Delete ${announcement.title}`}
                              title="Delete"
                              className="flex size-8 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 size={17} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {viewing && (
        <Modal
          title={viewing.title}
          onClose={() => setViewing(null)}
          footer={
            <>
              <button type="button" onClick={() => setViewing(null)} className={secondaryButton}>
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewing(null)
                  openForm(viewing)
                }}
                className={primaryButton}
              >
                Edit
              </button>
            </>
          }
        >
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-zinc-500">Date</dt>
              <dd className="text-zinc-800">{formatDate(viewing.announcement_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Audience</dt>
              <dd className="text-zinc-800">{audienceLabel(viewing)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm whitespace-pre-line text-zinc-700">{viewing.description}</p>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete announcement?"
          message={`“${deleting.title}” will be removed from your announcements.`}
          confirmLabel="Delete"
          danger
          onConfirm={async () => {
            await deleteAnnouncement(deleting.id)
            setReloadKey((key) => key + 1)
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  )
}
