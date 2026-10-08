import { Check, Search, Trash2, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import AddAdminModal from '../components/AddAdminModal'
import ConfirmDialog from '../components/ConfirmDialog'
import FilterMenu, { FilterOption, FilterSection } from '../components/FilterMenu'
import IconButton from '../components/IconButton'
import { primaryButton } from '../components/Modal'
import { SampleDataNotice, StatusRow } from '../components/OrganizationsOverview'
import {
  fetchOfficers,
  type Officer,
  type OfficerStatus,
  removeOfficer,
  setOfficerStatus,
  usingSampleOfficers,
} from '../lib/officers'

// Several organizations can be ticked at once; an empty list means all of them.
type Filters = { organizationIds: string[]; position: string; status: OfficerStatus | '' }

const NO_FILTERS: Filters = { organizationIds: [], position: '', status: '' }

// Shown in the Position filter even when no officer holds them yet. Others come from the officers listed.
const ALWAYS_LISTED_POSITIONS = ['Adviser']

const fieldClass =
  'rounded-full bg-field py-2 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-brand-blue/40'

export default function AdminOfficersPage() {
  const [officers, setOfficers] = useState<Officer[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  // The officer whose status is about to change.
  const [toggling, setToggling] = useState<Officer | null>(null)
  // The officer about to be removed for good.
  const [removing, setRemoving] = useState<Officer | null>(null)
  const [adding, setAdding] = useState(false)
  const [sample, setSample] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchOfficers()
      .then((loaded) => {
        if (cancelled) return
        setOfficers(loaded)
        setSample(usingSampleOfficers())
        setLoadError(null)
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // Each organization and position once, A to Z, for the filter menu.
  const organizations = [...new Map((officers ?? []).map((officer) => [officer.organization_id, officer.organization_name]))]
    .sort((a, b) => a[1].localeCompare(b[1]))
  // Adviser is always offered, even before any officer holds it.
  const positions = [...new Set([...ALWAYS_LISTED_POSITIONS, ...(officers ?? []).map((officer) => officer.position)])].sort(
    (a, b) => a.localeCompare(b),
  )

  const search = query.trim().toLowerCase()
  const shown = (officers ?? []).filter(
    (officer) =>
      (!search ||
        [officer.name, officer.admin_no, officer.organization_name].some((text) =>
          text.toLowerCase().includes(search),
        )) &&
      (filters.organizationIds.length === 0 || filters.organizationIds.includes(officer.organization_id)) &&
      (!filters.position || officer.position === filters.position) &&
      (!filters.status || officer.status === filters.status),
  )
  const filtering = filters.organizationIds.length > 0 || !!filters.position || !!filters.status
  const narrowed = !!search || filtering

  function toggleOrganization(id: string) {
    const ids = filters.organizationIds
    setFilters({ ...filters, organizationIds: ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id] })
  }

  return (
    <>
      <section className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h1 className="font-semibold text-brand-navy">Admin Officers</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Total Admin Officers:{' '}
              <span className="font-semibold text-brand-navy">{officers?.length ?? '—'}</span>
              {officers && narrowed && <span> · Showing {shown.length}</span>}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <label className="relative min-w-64 flex-1 sm:w-96 sm:flex-none">
              <span className="sr-only">Search admin officers</span>
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, admin no. or organization"
                className={`w-full pr-4 pl-9 placeholder:text-zinc-500 ${fieldClass}`}
              />
            </label>
            {/* Organization allows several ticks; Position and Status one each. */}
            <FilterMenu label="Filter by organization, position or status" active={filtering}>
              <FilterSection title="Organization">
                <FilterOption
                  label="All Organizations"
                  selected={filters.organizationIds.length === 0}
                  onSelect={() => setFilters({ ...filters, organizationIds: [] })}
                />
                {organizations.map(([id, name]) => (
                  <FilterOption
                    key={id}
                    label={name}
                    multiple
                    selected={filters.organizationIds.includes(id)}
                    onSelect={() => toggleOrganization(id)}
                  />
                ))}
              </FilterSection>
              <FilterSection title="Position">
                <FilterOption
                  label="All Positions"
                  selected={!filters.position}
                  onSelect={() => setFilters({ ...filters, position: '' })}
                />
                {positions.map((position) => (
                  <FilterOption
                    key={position}
                    label={position}
                    selected={filters.position === position}
                    onSelect={() => setFilters({ ...filters, position })}
                  />
                ))}
              </FilterSection>
              <FilterSection title="Status">
                {(
                  [
                    ['', 'All Statuses'],
                    ['active', 'Active'],
                    ['inactive', 'Inactive'],
                  ] as const
                ).map(([status, label]) => (
                  <FilterOption
                    key={label}
                    label={label}
                    selected={filters.status === status}
                    onSelect={() => setFilters({ ...filters, status })}
                  />
                ))}
              </FilterSection>
            </FilterMenu>
            {!sample && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                disabled={officers === null}
                className={`flex items-center gap-2 ${primaryButton}`}
              >
                <UserPlus size={16} aria-hidden="true" />
                Add admin
              </button>
            )}
          </div>
        </div>

        {sample && (
          <div className="px-6 pb-4">
            <SampleDataNotice table="officers" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-y border-zinc-200 bg-surface text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th scope="col" className="px-6 py-3 text-center font-medium">
                  Admin No.
                </th>
                <th scope="col" className="px-6 py-3 text-center font-medium">
                  Admin Name
                </th>
                <th scope="col" className="px-6 py-3 text-center font-medium">
                  Organization
                </th>
                <th scope="col" className="px-6 py-3 text-center font-medium">
                  Position
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
              {shown.map((officer) => (
                <tr key={officer.id} className="transition hover:bg-surface/60">
                  <td className="px-6 py-4 text-center font-medium text-zinc-700 tabular-nums">{officer.admin_no}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-brand-navy">{officer.name}</p>
                    {officer.email && <p className="text-xs text-zinc-500">{officer.email}</p>}
                  </td>
                  <td className="px-6 py-4 text-center text-zinc-700">{officer.organization_name}</td>
                  <td className="px-6 py-4 text-center text-zinc-700">{officer.position}</td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={officer.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <StatusSwitch officer={officer} onToggle={() => setToggling(officer)} />
                      <IconButton
                        icon={Trash2}
                        label={`Remove ${officer.name}`}
                        danger
                        colored
                        onClick={() => setRemoving(officer)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              <StatusRow
                what="admin officers"
                columns={6}
                loading={officers === null && !loadError}
                error={loadError}
                onRetry={() => setReloadKey((key) => key + 1)}
                empty={
                  officers !== null && shown.length === 0
                    ? narrowed
                      ? 'No admin officers match your search or filters.'
                      : 'No admin officers yet. Use Add admin to add an organization’s president or adviser.'
                    : null
                }
              />
            </tbody>
          </table>
        </div>
      </section>

      {adding && (
        <AddAdminModal
          officers={officers ?? []}
          onClose={() => setAdding(false)}
          onAdded={() => setReloadKey((key) => key + 1)}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Remove officer?"
          message={`${removing.name} (${removing.admin_no}) will be removed as ${removing.position} of ${removing.organization_name} for good, and lose officer access unless they hold another active position. This cannot be undone.`}
          confirmLabel="Remove"
          danger
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await removeOfficer(removing.id)
            setOfficers((current) => current?.filter((officer) => officer.id !== removing.id) ?? null)
          }}
        />
      )}

      {toggling && (
        <ConfirmDialog
          {...(toggling.status === 'active'
            ? {
                title: 'Deactivate officer?',
                message: `${toggling.name} (${toggling.admin_no}) will be marked Inactive as ${toggling.position} of ${toggling.organization_name} and lose officer access unless they hold another active position. You can reactivate them while no one else is the organization’s active ${toggling.position.toLowerCase()}.`,
                confirmLabel: 'Deactivate',
                danger: true,
              }
            : {
                title: 'Reactivate officer?',
                message: `${toggling.name} (${toggling.admin_no}) will be marked Active again for ${toggling.organization_name}.`,
                confirmLabel: 'Reactivate',
              })}
          onClose={() => setToggling(null)}
          onConfirm={async () => {
            const status: OfficerStatus = toggling.status === 'active' ? 'inactive' : 'active'
            await setOfficerStatus(toggling.id, status)
            setOfficers(
              (current) =>
                current?.map((officer) => (officer.id === toggling.id ? { ...officer, status } : officer)) ?? null,
            )
          }}
        />
      )}
    </>
  )
}

function StatusBadge({ status }: { status: OfficerStatus }) {
  return status === 'active' ? (
    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-500/20">
      Inactive
    </span>
  )
}

// Green with a check while active, red with a cross while inactive. Clicking asks
// to confirm before the status changes.
function StatusSwitch({ officer, onToggle }: { officer: Officer; onToggle: () => void }) {
  const active = officer.status === 'active'
  const label = `${active ? 'Deactivate' : 'Reactivate'} ${officer.name}`
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={onToggle}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue/40 focus-visible:outline-none ${
        active ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 flex size-4 items-center justify-center rounded-full bg-white shadow transition-transform ${
          active ? 'translate-x-4 text-emerald-500' : 'translate-x-0 text-rose-500'
        }`}
      >
        {active ? <Check size={10} strokeWidth={3.5} aria-hidden="true" /> : <X size={10} strokeWidth={3.5} aria-hidden="true" />}
      </span>
    </button>
  )
}
