import { CirclePause, CirclePlay, ListFilter, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import IconButton from '../components/IconButton'
import { StatusRow } from '../components/OrganizationsOverview'
import {
  type AccountStatus,
  fetchStudents,
  setStudentStatus,
  type Student,
  usingSampleStudents,
  YEAR_LEVELS,
} from '../lib/students'

type Filters = { status: AccountStatus | ''; yearLevel: string }

const NO_FILTERS: Filters = { status: '', yearLevel: '' }

const STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  inactive: 'Inactive',
}

const fieldClass =
  'rounded-full bg-field py-2 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-brand-blue/40'

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  // The student whose account is about to be suspended or reactivated.
  const [toggling, setToggling] = useState<Student | null>(null)
  const [sample, setSample] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchStudents()
      .then((loaded) => {
        if (cancelled) return
        setStudents(loaded)
        setSample(usingSampleStudents())
        setLoadError(null)
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const search = query.trim().toLowerCase()
  const shown = (students ?? []).filter(
    (student) =>
      (!search ||
        [student.student_no ?? '', student.name, student.email].some((text) =>
          text.toLowerCase().includes(search),
        )) &&
      (!filters.status || student.status === filters.status) &&
      (!filters.yearLevel || student.year_level === Number(filters.yearLevel)),
  )
  const filterCount = Number(!!filters.status) + Number(!!filters.yearLevel)
  const narrowed = !!search || filterCount > 0

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold text-brand-navy">Students</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage and track all students</p>
      </header>

      {sample && (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong className="font-semibold">Showing sample data.</strong> The student columns aren’t
          in Supabase yet, so changes here only last until you reload the page. Apply the student
          fields migration to save real data.
        </p>
      )}

      <section className="mt-6 rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="text-sm text-zinc-500">
            Total Students:{' '}
            <span className="font-semibold text-brand-navy">{students?.length ?? '—'}</span>
            {students && narrowed && <span> · Showing {shown.length}</span>}
          </p>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <label className="relative flex-1 sm:w-72 sm:flex-none">
              <span className="sr-only">Search students</span>
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search students..."
                className={`w-full pr-4 pl-9 placeholder:text-zinc-500 ${fieldClass}`}
              />
            </label>
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              aria-expanded={showFilters}
              aria-controls="student-filters"
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                showFilters || filterCount > 0
                  ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                  : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <ListFilter size={16} aria-hidden="true" />
              Filter
              {filterCount > 0 && (
                <span className="rounded-full bg-brand-blue px-1.5 text-xs text-white">{filterCount}</span>
              )}
            </button>
          </div>
        </div>

        {showFilters && (
          <div id="student-filters" className="flex flex-wrap items-center gap-3 px-6 pb-4">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              Year level
              <select
                value={filters.yearLevel}
                onChange={(event) => setFilters({ ...filters, yearLevel: event.target.value })}
                className={`px-4 ${fieldClass}`}
              >
                <option value="">All year levels</option>
                {YEAR_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    Year {level}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              Status
              <select
                value={filters.status}
                onChange={(event) => setFilters({ ...filters, status: event.target.value as Filters['status'] })}
                className={`px-4 ${fieldClass}`}
              >
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {filterCount > 0 && (
              <button
                type="button"
                onClick={() => setFilters(NO_FILTERS)}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                <X size={14} aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-y border-zinc-200 bg-surface text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">
                  Student No.
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-center font-medium">
                  Year Level
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Email Address
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((student) => (
                <tr key={student.id} className="transition hover:bg-surface/60">
                  <td className="px-6 py-4 font-medium text-zinc-700 tabular-nums">{student.student_no ?? '—'}</td>
                  <td className="px-6 py-4 font-medium text-brand-navy">{student.name}</td>
                  <td className="px-6 py-4 text-center text-zinc-700">{student.year_level ?? '—'}</td>
                  <td className="px-6 py-4 text-zinc-700">{student.email}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={student.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      {student.status === 'active' ? (
                        <IconButton
                          icon={CirclePause}
                          label={`Suspend ${student.name}`}
                          danger
                          onClick={() => setToggling(student)}
                        />
                      ) : (
                        <IconButton
                          icon={CirclePlay}
                          label={`Reactivate ${student.name}`}
                          onClick={() => setToggling(student)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              <StatusRow
                what="students"
                columns={6}
                loading={students === null && !loadError}
                error={loadError}
                onRetry={() => setReloadKey((key) => key + 1)}
                empty={
                  students !== null && shown.length === 0
                    ? narrowed
                      ? 'No students match your search or filters.'
                      : 'No students yet. Students show here once they sign up in the mobile app.'
                    : null
                }
              />
            </tbody>
          </table>
        </div>
      </section>

      {toggling && (
        <ConfirmDialog
          {...(toggling.status === 'active'
            ? {
                title: 'Suspend student?',
                message: `${toggling.name}’s account will be marked Suspended. You can reactivate it anytime.`,
                confirmLabel: 'Suspend',
                danger: true,
              }
            : {
                title: 'Reactivate student?',
                message: `${toggling.name}’s account will be marked Active again.`,
                confirmLabel: 'Reactivate',
              })}
          onClose={() => setToggling(null)}
          onConfirm={async () => {
            const status: AccountStatus = toggling.status === 'active' ? 'suspended' : 'active'
            await setStudentStatus(toggling.id, status)
            setStudents(
              (current) =>
                current?.map((student) => (student.id === toggling.id ? { ...student, status } : student)) ?? null,
            )
          }}
        />
      )}
    </>
  )
}

const BADGE_STYLES: Record<AccountStatus, { badge: string; dot: string }> = {
  active: { badge: 'bg-green-50 text-green-700 ring-green-600/20', dot: 'bg-green-600' },
  suspended: { badge: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-600' },
  inactive: { badge: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20', dot: 'bg-zinc-400' },
}

function StatusBadge({ status }: { status: AccountStatus }) {
  const style = BADGE_STYLES[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${style.badge}`}
    >
      <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  )
}
