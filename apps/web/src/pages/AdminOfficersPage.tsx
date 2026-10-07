import { CirclePause, CirclePlay, ListFilter, Search, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import AssignPresidentModal from '../components/AssignPresidentModal'
import ConfirmDialog from '../components/ConfirmDialog'
import IconButton from '../components/IconButton'
import { primaryButton } from '../components/Modal'
import { SampleDataNotice, StatusRow } from '../components/OrganizationsOverview'
import { fetchOfficers, type Officer, type OfficerStatus, setOfficerStatus, usingSampleOfficers } from '../lib/officers'

type Filters = { status: OfficerStatus | ''; organizationId: string }

const NO_FILTERS: Filters = { status: '', organizationId: '' }

const fieldClass =
  'rounded-full bg-field py-2 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-brand-blue/40'

export default function AdminOfficersPage() {
  const [officers, setOfficers] = useState<Officer[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  // The officer whose status is about to change.
  const [toggling, setToggling] = useState<Officer | null>(null)
  const [assigning, setAssigning] = useState(false)
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

  // Each organization once, A to Z, for the Organization filter.
  const organizations = [...new Map((officers ?? []).map((officer) => [officer.organization_id, officer.organization_name]))]
    .sort((a, b) => a[1].localeCompare(b[1]))

  const search = query.trim().toLowerCase()
  const shown = (officers ?? []).filter(
    (officer) =>
      (!search ||
        [officer.name, officer.admin_no, officer.organization_name].some((text) =>
          text.toLowerCase().includes(search),
        )) &&
      (!filters.status || officer.status === filters.status) &&
      (!filters.organizationId || officer.organization_id === filters.organizationId),
  )
  const filterCount = Number(!!filters.status) + Number(!!filters.organizationId)
  const narrowed = !!search || filterCount > 0

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Admin Officers</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage and track all admin officers</p>
        </div>
        {!sample && (
          <button
            type="button"
            onClick={() => setAssigning(true)}
            disabled={officers === null}
            className={`flex items-center gap-2 ${primaryButton}`}
          >
            <UserPlus size={16} aria-hidden="true" />
            Assign president
          </button>
        )}
      </header>

      {sample && (
        <div className="mt-6">
          <SampleDataNotice table="officers" />
        </div>
      )}

      <section className="mt-6 rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="text-sm text-zinc-500">
            Total Admin Officers:{' '}
            <span className="font-semibold text-brand-navy">{officers?.length ?? '—'}</span>
            {officers && narrowed && <span> · Showing {shown.length}</span>}
          </p>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <label className="relative flex-1 sm:w-72 sm:flex-none">
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
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              aria-expanded={showFilters}
              aria-controls="officer-filters"
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
          <div id="officer-filters" className="flex flex-wrap items-center gap-3 px-6 pb-4">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              Status
              <select
                value={filters.status}
                onChange={(event) => setFilters({ ...filters, status: event.target.value as Filters['status'] })}
                className={`px-4 ${fieldClass}`}
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              Organization
              <select
                value={filters.organizationId}
                onChange={(event) => setFilters({ ...filters, organizationId: event.target.value })}
                className={`max-w-64 px-4 ${fieldClass}`}
              >
                <option value="">All organizations</option>
                {organizations.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
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
                  Admin No.
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Admin Name
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Organization
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Position
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
              {shown.map((officer) => (
                <tr key={officer.id} className="transition hover:bg-surface/60">
                  <td className="px-6 py-4 font-medium text-zinc-700 tabular-nums">{officer.admin_no}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-brand-navy">{officer.name}</p>
                    {officer.email && <p className="text-xs text-zinc-500">{officer.email}</p>}
                  </td>
                  <td className="px-6 py-4 text-zinc-700">{officer.organization_name}</td>
                  <td className="px-6 py-4 text-zinc-700">{officer.position}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={officer.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      {officer.status === 'active' ? (
                        <IconButton
                          icon={CirclePause}
                          label={`Deactivate ${officer.name}`}
                          danger
                          onClick={() => setToggling(officer)}
                        />
                      ) : (
                        <IconButton
                          icon={CirclePlay}
                          label={`Reactivate ${officer.name}`}
                          onClick={() => setToggling(officer)}
                        />
                      )}
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
                      : 'No admin officers yet. Use Assign president to make a student the president of an organization.'
                    : null
                }
              />
            </tbody>
          </table>
        </div>
      </section>

      {assigning && (
        <AssignPresidentModal
          officers={officers ?? []}
          onClose={() => setAssigning(false)}
          onAssigned={() => setReloadKey((key) => key + 1)}
        />
      )}

      {toggling && (
        <ConfirmDialog
          {...(toggling.status === 'active'
            ? {
                title: 'Deactivate officer?',
                message: `${toggling.name} (${toggling.admin_no}) will be marked Inactive for ${toggling.organization_name} and lose officer access unless they lead another organization. You can reactivate them while the organization has no other active president.`,
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20">
      <span className="size-1.5 rounded-full bg-green-600" aria-hidden="true" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-500/20">
      <span className="size-1.5 rounded-full bg-zinc-400" aria-hidden="true" />
      Inactive
    </span>
  )
}
