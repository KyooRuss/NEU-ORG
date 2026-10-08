import { Building2, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  archiveOrganization,
  fetchOrganizations,
  mediaUrl,
  type Organization,
  usingSampleData,
} from '../lib/organizations'
import ConfirmDialog from './ConfirmDialog'
import IconButton from './IconButton'
import OrganizationDetailsModal from './OrganizationDetailsModal'
import OrganizationFormModal from './OrganizationFormModal'

type Dialog =
  | { kind: 'add' }
  | { kind: 'view' | 'edit' | 'archive'; org: Organization }
  | null

export default function OrganizationsOverview() {
  const [organizations, setOrganizations] = useState<Organization[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [sample, setSample] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchOrganizations('active')
      .then((loaded) => {
        if (cancelled) return
        setOrganizations(loaded)
        setSample(usingSampleData())
        setLoadError(null)
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = () => setReloadKey((key) => key + 1)
  const close = () => setDialog(null)

  const search = query.trim().toLowerCase()
  const shown = (organizations ?? []).filter((org) =>
    [org.org_code, org.name, ...org.categories].some((text) => text.toLowerCase().includes(search)),
  )

  return (
    <section className="mt-6 rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="font-semibold text-brand-navy">Organizations Overview</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Total Organizations:{' '}
            <span className="font-semibold text-brand-navy">{organizations?.length ?? '—'}</span>
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <label className="relative flex-1 sm:w-64 sm:flex-none">
            <span className="sr-only">Search organizations</span>
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or ID"
              className="w-full rounded-full bg-field py-2 pr-4 pl-9 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-blue/40"
            />
          </label>
          <button
            type="button"
            onClick={() => setDialog({ kind: 'add' })}
            className="flex items-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-navy"
          >
            <Plus size={16} aria-hidden="true" />
            Add Organization
          </button>
        </div>
      </div>

      {sample && (
        <div className="px-6 pb-4">
          <SampleDataNotice />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-y border-zinc-200 bg-surface text-xs tracking-wide text-zinc-500 uppercase">
            <tr>
              <th scope="col" className="px-6 py-3 font-medium whitespace-nowrap">
                Organization ID
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Organization
              </th>
              <th scope="col" className="px-6 py-3 text-center font-medium">
                No. of Members
              </th>
              <th scope="col" className="px-6 py-3 text-center font-medium">
                No. of Events
              </th>
              <th scope="col" className="px-6 py-3 text-right font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {shown.map((org) => (
              <tr key={org.id} className="transition hover:bg-surface/60">
                <td className="px-6 py-4 font-medium whitespace-nowrap text-zinc-700 tabular-nums">{org.org_code}</td>
                <td className="px-6 py-4">
                  <OrgNameCell org={org} />
                </td>
                {/* Real counts arrive once memberships and events are stored in Supabase. */}
                <td className="px-6 py-4 text-center text-zinc-700">{org.member_count ?? '—'}</td>
                <td className="px-6 py-4 text-center text-zinc-700">{org.event_count ?? '—'}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-1">
                    <IconButton icon={Eye} label={`View ${org.name}`} onClick={() => setDialog({ kind: 'view', org })} />
                    <IconButton icon={Pencil} label={`Edit ${org.name}`} onClick={() => setDialog({ kind: 'edit', org })} />
                    <IconButton
                      icon={Trash2}
                      label={`Move ${org.name} to Trash`}
                      danger
                      onClick={() => setDialog({ kind: 'archive', org })}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <StatusRow
              loading={organizations === null && !loadError}
              error={loadError}
              onRetry={reload}
              columns={5}
              empty={
                organizations !== null && shown.length === 0
                  ? search
                    ? `No organizations match “${query.trim()}”.`
                    : 'No organizations yet. Click “Add Organization” to create the first one.'
                  : null
              }
            />
          </tbody>
        </table>
      </div>

      {dialog?.kind === 'add' && <OrganizationFormModal onClose={close} onSaved={reload} />}
      {dialog?.kind === 'edit' && (
        <OrganizationFormModal organization={dialog.org} onClose={close} onSaved={reload} />
      )}
      {dialog?.kind === 'view' && <OrganizationDetailsModal organization={dialog.org} onClose={close} />}
      {dialog?.kind === 'archive' && (
        <ConfirmDialog
          title="Move to Trash?"
          message={`“${dialog.org.name}” will be hidden from the Organizations list and the mobile app. You can restore it from Trash.`}
          confirmLabel="Move to Trash"
          danger
          onClose={close}
          onConfirm={async () => {
            await archiveOrganization(dialog.org.id)
            setOrganizations((current) => current?.filter((org) => org.id !== dialog.org.id) ?? null)
          }}
        />
      )}
    </section>
  )
}

export function OrgNameCell({ org }: { org: Organization }) {
  const logo = mediaUrl(org.logo_path)
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue/10 text-brand-blue">
        {logo ? (
          <img src={logo} alt="" className="size-full object-cover" />
        ) : (
          <Building2 size={16} aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-brand-navy">{org.name}</p>
        <p className="text-xs text-zinc-500">{org.categories.join(' · ')}</p>
      </div>
    </div>
  )
}

export function SampleDataNotice({ table = 'organizations' }: { table?: string }) {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <strong className="font-semibold">Showing sample data.</strong> The {table} table
      isn’t in Supabase yet, so changes here only last until you reload the page. Apply the{' '}
      {table} migration to save real data.
    </p>
  )
}

export function StatusRow({
  loading,
  error,
  empty,
  onRetry,
  what = 'organizations',
  columns = 4,
}: {
  loading: boolean
  error: string | null
  empty: string | null
  onRetry: () => void
  // What the table lists, for the error message.
  what?: string
  columns?: number
}) {
  if (!loading && !error && !empty) return null
  return (
    <tr>
      <td colSpan={columns} className="px-6 py-10 text-center text-sm text-zinc-500">
        {loading && 'Loading…'}
        {error && (
          <span className="text-red-700">
            Could not load {what}: {error}{' '}
            <button type="button" onClick={onRetry} className="font-medium underline">
              Try again
            </button>
          </span>
        )}
        {!loading && !error && empty}
      </td>
    </tr>
  )
}
