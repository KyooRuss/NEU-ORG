import { type ReactNode, useEffect, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import { OrgNameCell, SampleDataNotice, StatusRow } from '../components/OrganizationsOverview'
import { withCounts } from '../lib/members'
import {
  fetchOfficers,
  type Officer,
  removeOfficer,
  restoreOfficer,
  usingSampleOfficers,
} from '../lib/officers'
import {
  deleteOrganizationForever,
  fetchOrganizations,
  type Organization,
  restoreOrganization,
  usingSampleData,
} from '../lib/organizations'
import {
  deleteProfessor,
  fetchProfessors,
  type Professor,
  restoreProfessor,
  usingSampleProfessors,
} from '../lib/professors'
import { deleteStudent, fetchStudents, restoreStudent, type Student, usingSampleStudents } from '../lib/students'

export type TrashKind = 'Organizations' | 'Admin Officers' | 'Students' | 'Professors'

// Each kind is its own page under Trash in the sidebar.
export default function TrashPage({ kind }: { kind: TrashKind }) {
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold text-brand-navy">Trash</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Items moved to Trash are hidden everywhere. Restore them, or delete them for good.
        </p>
      </header>

      <div className="mt-6">
        {kind === 'Organizations' ? (
          <TrashTable {...ORGANIZATIONS} />
        ) : kind === 'Admin Officers' ? (
          <TrashTable {...OFFICERS} />
        ) : kind === 'Students' ? (
          <TrashTable {...STUDENTS} />
        ) : (
          <TrashTable {...PROFESSORS} />
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// The kinds. Each table matches its page's table, without the Status column.
// ---------------------------------------------------------------------------

const ORGANIZATIONS: TrashTableProps<Organization> = {
  heading: 'Total Archived Organizations',
  what: 'organizations',
  load: () => fetchOrganizations('archived').then(withCounts),
  isSample: usingSampleData,
  sampleNotice: <SampleDataNotice />,
  minWidth: 'min-w-[880px]',
  name: (org) => org.name,
  columns: [
    {
      header: 'Organization ID',
      className: 'text-center font-medium whitespace-nowrap text-zinc-700 tabular-nums',
      cell: (org) => org.org_code,
    },
    { header: 'Organization', cell: (org) => <OrgNameCell org={org} /> },
    { header: 'Department', className: 'text-center text-zinc-700', cell: (org) => org.department },
    // Real counts arrive once memberships and events are stored in Supabase.
    { header: 'No. of Members', className: 'text-center text-zinc-700', cell: (org) => org.member_count ?? '—' },
    { header: 'No. of Events', className: 'text-center text-zinc-700', cell: (org) => org.event_count ?? '—' },
  ],
  restore: {
    title: 'Restore organization?',
    message: (org) => `“${org.name}” will return to the Organizations list and show in the mobile app again.`,
    run: (org) => restoreOrganization(org.id),
  },
  remove: {
    title: 'Delete permanently?',
    message: (org) => `“${org.name}” and its logo and photos will be deleted for good. This cannot be undone.`,
    run: deleteOrganizationForever,
  },
}

const OFFICERS: TrashTableProps<Officer> = {
  heading: 'Total Archived Admin Officers',
  what: 'admin officers',
  load: () => fetchOfficers(true),
  isSample: usingSampleOfficers,
  sampleNotice: <SampleDataNotice table="officers" />,
  minWidth: 'min-w-[680px]',
  name: (officer) => officer.name,
  columns: [
    {
      header: 'Admin No.',
      className: 'text-center font-medium text-zinc-700 tabular-nums',
      cell: (officer) => officer.admin_no,
    },
    {
      header: 'Admin Name',
      cell: (officer) => (
        <>
          <p className="font-medium text-brand-navy">{officer.name}</p>
          {officer.email && <p className="text-xs text-zinc-500">{officer.email}</p>}
        </>
      ),
    },
    { header: 'Organization', className: 'text-center text-zinc-700', cell: (officer) => officer.organization_name },
    { header: 'Position', className: 'text-center text-zinc-700', cell: (officer) => officer.position },
  ],
  restore: {
    title: 'Restore officer?',
    message: (officer) =>
      `${officer.name} (${officer.admin_no}) will return to Admin Officers as Inactive. Reactivate them there to give back officer access.`,
    run: (officer) => restoreOfficer(officer.id),
  },
  remove: {
    title: 'Delete permanently?',
    message: (officer) =>
      `${officer.name} (${officer.admin_no}) will be removed as ${officer.position} of ${officer.organization_name} for good. This cannot be undone.`,
    run: (officer) => removeOfficer(officer.id),
  },
}

const STUDENTS: TrashTableProps<Student> = {
  heading: 'Total Archived Students',
  what: 'students',
  load: () => fetchStudents(true),
  isSample: usingSampleStudents,
  sampleNotice: <ColumnsSampleNotice who="student" migration="student fields" />,
  minWidth: 'min-w-[680px]',
  name: (student) => student.name,
  columns: [
    {
      header: 'Student No.',
      className: 'text-center font-medium text-zinc-700 tabular-nums',
      cell: (student) => student.student_no ?? '—',
    },
    { header: 'Name', className: 'font-medium text-brand-navy', cell: (student) => student.name },
    { header: 'Year Level', className: 'text-center text-zinc-700', cell: (student) => student.year_level ?? '—' },
    { header: 'Email Address', className: 'text-center text-zinc-700', cell: (student) => student.email },
  ],
  restore: {
    title: 'Restore student?',
    message: (student) => `${student.name} (${student.email}) will return to the Students list.`,
    run: (student) => restoreStudent(student.id),
  },
  remove: {
    title: 'Delete student account?',
    message: (student) =>
      `${student.name}’s account (${student.email}) will be deleted for good, and they won’t be able to log in. Events and comments they wrote stay, without their name. This cannot be undone.`,
    run: (student) => deleteStudent(student.id),
  },
}

const PROFESSORS: TrashTableProps<Professor> = {
  heading: 'Total Archived Professors',
  what: 'professors',
  load: () => fetchProfessors(true),
  isSample: usingSampleProfessors,
  sampleNotice: <ColumnsSampleNotice who="professor" migration="professors" />,
  minWidth: 'min-w-[760px]',
  name: (professor) => professor.name,
  columns: [
    { header: 'Name', className: 'font-medium text-brand-navy', cell: (professor) => professor.name },
    { header: 'Department', className: 'text-center text-zinc-700', cell: (professor) => professor.department ?? '—' },
    { header: 'Email Address', className: 'text-center text-zinc-700', cell: (professor) => professor.email },
  ],
  restore: {
    title: 'Restore professor?',
    message: (professor) => `${professor.name} (${professor.email}) will return to the Professors list.`,
    run: (professor) => restoreProfessor(professor.id),
  },
  remove: {
    title: 'Delete professor account?',
    message: (professor) =>
      `${professor.name}’s account (${professor.email}) will be deleted for good, and they won’t be able to log in. This cannot be undone.`,
    run: (professor) => deleteProfessor(professor.id),
  },
}

// ---------------------------------------------------------------------------
// The table every Trash page shares: a total, the columns, and Restore and Delete.
// ---------------------------------------------------------------------------

type Column<T> = {
  header: string
  cell: (item: T) => ReactNode
  // Classes for the body cell. Headers are always centered, like the pages' tables.
  className?: string
}

type ConfirmAction<T> = {
  title: string
  message: (item: T) => string
  run: (item: T) => Promise<void>
}

type TrashTableProps<T> = {
  heading: string
  // What the table lists, for the error message.
  what: string
  // Kept outside the component, so the list loads once per page.
  load: () => Promise<T[]>
  isSample: () => boolean
  sampleNotice: ReactNode
  minWidth: string
  name: (item: T) => string
  columns: Column<T>[]
  restore: ConfirmAction<T>
  remove: ConfirmAction<T>
}

function TrashTable<T extends { id: string }>({
  heading,
  what,
  load,
  isSample,
  sampleNotice,
  minWidth,
  name,
  columns,
  restore,
  remove,
}: TrashTableProps<T>) {
  const [items, setItems] = useState<T[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [dialog, setDialog] = useState<{ kind: 'restore' | 'remove'; item: T } | null>(null)
  const [sample, setSample] = useState(false)

  useEffect(() => {
    let cancelled = false
    load()
      .then((loaded) => {
        if (cancelled) return
        setItems(loaded)
        setSample(isSample())
        setLoadError(null)
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message)
      })
    return () => {
      cancelled = true
    }
  }, [load, isSample, reloadKey])

  const action = dialog && (dialog.kind === 'restore' ? restore : remove)

  return (
    <section className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
      <div className="p-6">
        <h2 className="font-semibold text-brand-navy">
          {heading}: <span className="tabular-nums">{items?.length ?? '—'}</span>
        </h2>
      </div>

      {sample && <div className="px-6 pb-4">{sampleNotice}</div>}

      <div className="overflow-x-auto">
        <table className={`w-full ${minWidth} text-left text-sm`}>
          <thead className="border-y border-zinc-200 bg-surface text-xs tracking-wide text-zinc-500 uppercase">
            <tr>
              {columns.map((column) => (
                <th key={column.header} scope="col" className="px-6 py-3 text-center font-medium whitespace-nowrap">
                  {column.header}
                </th>
              ))}
              <th scope="col" className="px-6 py-3 text-center font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items?.map((item) => (
              <tr key={item.id} className="transition hover:bg-surface/60">
                {columns.map((column) => (
                  <td key={column.header} className={`px-6 py-4 ${column.className ?? ''}`}>
                    {column.cell(item)}
                  </td>
                ))}
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      aria-label={`Restore ${name(item)}`}
                      onClick={() => setDialog({ kind: 'restore', item })}
                      className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-green-700"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${name(item)} permanently`}
                      onClick={() => setDialog({ kind: 'remove', item })}
                      className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            <StatusRow
              what={what}
              columns={columns.length + 1}
              loading={items === null && !loadError}
              error={loadError}
              onRetry={() => setReloadKey((key) => key + 1)}
              empty={items?.length === 0 ? `No archived ${what}.` : null}
            />
          </tbody>
        </table>
      </div>

      {dialog && action && (
        <ConfirmDialog
          title={action.title}
          message={action.message(dialog.item)}
          confirmLabel={dialog.kind === 'restore' ? 'Restore' : 'Delete permanently'}
          danger={dialog.kind === 'remove'}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await action.run(dialog.item)
            setItems((current) => current?.filter((item) => item.id !== dialog.item.id) ?? null)
          }}
        />
      )}
    </section>
  )
}

// Students and professors live on profiles, so it's their columns that may be missing, not a table.
function ColumnsSampleNotice({ who, migration }: { who: string; migration: string }) {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <strong className="font-semibold">Showing sample data.</strong> The {who} columns aren’t in Supabase yet, so
      changes here only last until you reload the page. Apply the {migration} migration to save real data.
    </p>
  )
}
