import { Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import FilterMenu, { FilterOption, FilterSection } from '../components/FilterMenu'
import IconButton from '../components/IconButton'
import { StatusRow } from '../components/OrganizationsOverview'
import ProfessorFormModal from '../components/ProfessorFormModal'
import StatusSwitch from '../components/StatusSwitch'
import { COLLEGES } from '../lib/organizations'
import {
  archiveProfessor,
  cancelProfessorInvite,
  fetchProfessorInvites,
  fetchProfessors,
  type Professor,
  type ProfessorInvite,
  setProfessorStatus,
  usingSampleProfessors,
} from '../lib/professors'
import type { AccountStatus } from '../lib/students'
import { StatusBadge } from './StudentsPage'

// Professors are only Active or Inactive. An older Suspended account counts as Inactive.
type Filters = { status: 'active' | 'inactive' | ''; department: string }

const NO_FILTERS: Filters = { status: '', department: '' }

const STATUS_OPTIONS = [
  ['active', 'Active'],
  ['inactive', 'Inactive'],
] as const

const fieldClass =
  'rounded-full bg-field py-2 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-brand-blue/40'

// The Students page with Professor No. and Department in place of Student No. and Year Level.
export default function ProfessorsPage() {
  const [professors, setProfessors] = useState<Professor[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  // The professor whose account is about to be deactivated or reactivated.
  const [toggling, setToggling] = useState<Professor | null>(null)
  // The professor about to be moved to Trash.
  const [deleting, setDeleting] = useState<Professor | null>(null)
  const [sample, setSample] = useState(false)
  // Emails added as professors that haven't signed in yet.
  const [invites, setInvites] = useState<ProfessorInvite[]>([])
  const [adding, setAdding] = useState(false)
  // The invite about to be cancelled.
  const [cancelling, setCancelling] = useState<ProfessorInvite | null>(null)
  // What happened after adding a professor, shown above the table.
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchProfessors()
      .then((loaded) => {
        if (cancelled) return
        setProfessors(loaded)
        setSample(usingSampleProfessors())
        setLoadError(null)
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message)
      })
    fetchProfessorInvites()
      .then((loaded) => !cancelled && setInvites(loaded))
      .catch(() => {
        // The list of professors matters more; invites show again on the next reload.
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const search = query.trim().toLowerCase()
  const shown = (professors ?? []).filter(
    (professor) =>
      (!search ||
        [professor.professor_no, professor.name, professor.email].some((text) =>
          text.toLowerCase().includes(search),
        )) &&
      (!filters.status || (professor.status === 'active') === (filters.status === 'active')) &&
      (!filters.department || professor.department === filters.department),
  )
  const filtering = !!filters.status || !!filters.department
  const narrowed = !!search || filtering

  return (
    <>
      <section className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h1 className="font-semibold text-brand-navy">Professors</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Total Professors:{' '}
              <span className="font-semibold text-brand-navy">{professors?.length ?? '—'}</span>
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <label className="relative min-w-64 flex-1 sm:w-96 sm:flex-none">
              <span className="sr-only">Search professors</span>
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, professor no. or email address"
                className={`w-full pr-4 pl-9 placeholder:text-zinc-500 ${fieldClass}`}
              />
            </label>
            {/* One pick per section; the menu stays open so both can be set. */}
            <FilterMenu label="Filter by department or status" active={filtering}>
              <FilterSection title="Department">
                <FilterOption
                  label="All Departments"
                  selected={!filters.department}
                  onSelect={() => setFilters({ ...filters, department: '' })}
                />
                {COLLEGES.map((college) => (
                  <FilterOption
                    key={college}
                    label={college}
                    selected={filters.department === college}
                    onSelect={() => setFilters({ ...filters, department: college })}
                  />
                ))}
              </FilterSection>
              <FilterSection title="Status">
                <FilterOption
                  label="All Statuses"
                  selected={!filters.status}
                  onSelect={() => setFilters({ ...filters, status: '' })}
                />
                {STATUS_OPTIONS.map(([status, label]) => (
                  <FilterOption
                    key={status}
                    label={label}
                    selected={filters.status === status}
                    onSelect={() => setFilters({ ...filters, status })}
                  />
                ))}
              </FilterSection>
            </FilterMenu>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#2f80ed] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-blue"
            >
              <Plus size={16} aria-hidden="true" />
              Add Professor
            </button>
          </div>
        </div>

        {message && (
          <p
            role="status"
            className="mx-6 mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            <span className="flex-1">{message}</span>
            <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss" className="text-green-700">
              <X size={16} aria-hidden="true" />
            </button>
          </p>
        )}

        {sample && (
          <p className="mx-6 mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong className="font-semibold">Showing sample data.</strong> The professor columns aren’t
            in Supabase yet, so changes here only last until you reload the page. Apply the professors
            migration to save real data.
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-y border-zinc-200 bg-surface text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th scope="col" className="px-6 py-3 text-center font-medium">
                  Professor No.
                </th>
                <th scope="col" className="px-6 py-3 text-center font-medium">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-center font-medium">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 text-center font-medium">
                  Email Address
                </th>
                <th scope="col" className="px-6 py-3 text-center font-medium">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-center font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((professor) => (
                <tr key={professor.id} className="transition hover:bg-surface/60">
                  <td className="px-6 py-4 text-center font-medium text-zinc-700 tabular-nums">
                    {professor.professor_no}
                  </td>
                  <td className="px-6 py-4 font-medium text-brand-navy">{professor.name}</td>
                  <td className="px-6 py-4 text-center text-zinc-700">{professor.department ?? '—'}</td>
                  <td className="px-6 py-4 text-center text-zinc-700">{professor.email}</td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={professor.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {/* On = Active, off = Inactive. */}
                      <StatusSwitch
                        on={professor.status === 'active'}
                        label={`${professor.status === 'active' ? 'Deactivate' : 'Reactivate'} ${professor.name}`}
                        onToggle={() => setToggling(professor)}
                      />
                      <IconButton
                        icon={Trash2}
                        label={`Move ${professor.name} to Trash`}
                        danger
                        colored
                        onClick={() => setDeleting(professor)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              <StatusRow
                what="professors"
                columns={6}
                loading={professors === null && !loadError}
                error={loadError}
                onRetry={() => setReloadKey((key) => key + 1)}
                empty={
                  professors !== null && shown.length === 0
                    ? narrowed
                      ? 'No professors match your search or filters.'
                      : 'No professors yet. Click “Add Professor”, or mark someone on the Students page.'
                    : null
                }
              />
            </tbody>
          </table>
        </div>
      </section>

      {invites.length > 0 && (
        <section className="mt-6 rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="p-6 pb-4">
            <h2 className="font-semibold text-brand-navy">Invited — hasn’t signed in yet</h2>
            <p className="mt-1 text-sm text-zinc-500">
              These emails become professors automatically the first time they sign in.
            </p>
          </div>
          <ul className="divide-y divide-zinc-100 border-t border-zinc-200">
            {invites.map((invite) => (
              <li key={invite.email} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-6 py-3 text-sm">
                <span className="font-medium text-zinc-700 tabular-nums">{invite.professor_no}</span>
                <span className="min-w-0 flex-1 truncate text-brand-navy">{invite.email}</span>
                <span className="text-zinc-600">{invite.department}</span>
                <button
                  type="button"
                  onClick={() => setCancelling(invite)}
                  className="border-b border-red-400/60 font-medium text-red-500 transition hover:text-red-700"
                >
                  Cancel invite
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {adding && (
        <ProfessorFormModal
          onClose={() => setAdding(false)}
          onSaved={(result, email) => {
            setMessage(
              result === 'linked'
                ? `${email} is now a professor.`
                : `${email} is invited. They’ll become a professor the first time they sign in.`,
            )
            setReloadKey((key) => key + 1)
          }}
        />
      )}

      {cancelling && (
        <ConfirmDialog
          title="Cancel invite?"
          message={`${cancelling.email} won’t become a professor when they sign in. You can add them again anytime.`}
          confirmLabel="Cancel invite"
          danger
          onClose={() => setCancelling(null)}
          onConfirm={async () => {
            await cancelProfessorInvite(cancelling.email)
            setInvites((current) => current.filter((invite) => invite.email !== cancelling.email))
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Move to Trash?"
          message={`${deleting.name} (${deleting.email}) will be hidden from the Professors list. You can restore them, or delete their account for good, from Trash.`}
          confirmLabel="Move to Trash"
          danger
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await archiveProfessor(deleting.id)
            setProfessors((current) => current?.filter((professor) => professor.id !== deleting.id) ?? null)
          }}
        />
      )}

      {toggling && (
        <ConfirmDialog
          {...(toggling.status === 'active'
            ? {
                title: 'Deactivate professor?',
                message: `${toggling.name}’s account will be marked Inactive. You can reactivate it anytime.`,
                confirmLabel: 'Deactivate',
                danger: true,
              }
            : {
                title: 'Reactivate professor?',
                message: `${toggling.name}’s account will be marked Active again.`,
                confirmLabel: 'Reactivate',
              })}
          onClose={() => setToggling(null)}
          onConfirm={async () => {
            const status: AccountStatus = toggling.status === 'active' ? 'inactive' : 'active'
            await setProfessorStatus(toggling.id, status)
            setProfessors(
              (current) =>
                current?.map((professor) => (professor.id === toggling.id ? { ...professor, status } : professor)) ??
                null,
            )
          }}
        />
      )}
    </>
  )
}
