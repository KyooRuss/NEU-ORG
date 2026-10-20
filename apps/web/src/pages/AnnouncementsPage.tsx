import { Megaphone, Plus } from 'lucide-react'

const COLUMNS = ['Announcement Title', 'Audience', 'Date Posted', 'Action']

// The officer's announcements for students and organization members.
// Saving announcements arrives in a later step, so the list stays empty for now.
export default function AnnouncementsPage() {
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
            <tbody>
              <tr>
                <td colSpan={COLUMNS.length} className="px-6 py-24 text-center text-zinc-500">
                  <Megaphone size={28} className="mx-auto mb-3 text-zinc-300" aria-hidden="true" />
                  No announcements yet. Create one to share it with students and members.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
