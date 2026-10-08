import { ArchiveRestore, Eye, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import IconButton from '../components/IconButton'
import OrganizationDetailsModal from '../components/OrganizationDetailsModal'
import { OrgNameCell, SampleDataNotice, StatusRow } from '../components/OrganizationsOverview'
import {
  deleteOrganizationForever,
  fetchOrganizations,
  type Organization,
  restoreOrganization,
  usingSampleData,
} from '../lib/organizations'

type Dialog = { kind: 'view' | 'restore' | 'delete'; org: Organization } | null

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' })

// Only organizations go to Trash for now; more tabs (events, memorandums) come later.
export default function TrashPage() {
  const [organizations, setOrganizations] = useState<Organization[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [sample, setSample] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchOrganizations('archived')
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

  const close = () => setDialog(null)
  const removeFromList = (id: string) =>
    setOrganizations((current) => current?.filter((org) => org.id !== id) ?? null)

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold text-brand-navy">Trash</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Items moved to Trash are hidden everywhere. Restore them, or delete them for good.
        </p>
      </header>

      {sample && (
        <div className="mt-6">
          <SampleDataNotice />
        </div>
      )}

      <div role="tablist" aria-label="Trash categories" className="mt-6 flex gap-2">
        <button
          type="button"
          role="tab"
          aria-selected="true"
          className="rounded-full bg-brand-blue px-4 py-1.5 text-sm font-medium text-white"
        >
          Organizations
          {organizations && (
            <span className="ml-2 rounded-full bg-white/20 px-2 text-xs">{organizations.length}</span>
          )}
        </button>
      </div>

      <section role="tabpanel" className="mt-4 rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-surface text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">
                  Organization
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Moved to Trash
                </th>
                <th scope="col" className="px-6 py-3 text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {organizations?.map((org) => (
                <tr key={org.id} className="transition hover:bg-surface/60">
                  <td className="px-6 py-4">
                    <OrgNameCell org={org} />
                  </td>
                  <td className="px-6 py-4 text-zinc-700">{org.department}</td>
                  <td className="px-6 py-4 text-zinc-700">
                    {org.archived_at ? dateFormat.format(new Date(org.archived_at)) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      <IconButton icon={Eye} label={`View ${org.name}`} onClick={() => setDialog({ kind: 'view', org })} />
                      <IconButton
                        icon={ArchiveRestore}
                        label={`Restore ${org.name}`}
                        onClick={() => setDialog({ kind: 'restore', org })}
                      />
                      <IconButton
                        icon={Trash2}
                        label={`Delete ${org.name} permanently`}
                        danger
                        onClick={() => setDialog({ kind: 'delete', org })}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              <StatusRow
                loading={organizations === null && !loadError}
                error={loadError}
                onRetry={() => setReloadKey((key) => key + 1)}
                empty={organizations?.length === 0 ? 'Trash is empty.' : null}
              />
            </tbody>
          </table>
        </div>
      </section>

      {dialog?.kind === 'view' && <OrganizationDetailsModal organization={dialog.org} onClose={close} />}
      {dialog?.kind === 'restore' && (
        <ConfirmDialog
          title="Restore organization?"
          message={`“${dialog.org.name}” will return to the Organizations list and show in the mobile app again.`}
          confirmLabel="Restore"
          onClose={close}
          onConfirm={async () => {
            await restoreOrganization(dialog.org.id)
            removeFromList(dialog.org.id)
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete permanently?"
          message={`“${dialog.org.name}” and its logo and photos will be deleted for good. This cannot be undone.`}
          confirmLabel="Delete permanently"
          danger
          onClose={close}
          onConfirm={async () => {
            await deleteOrganizationForever(dialog.org)
            removeFromList(dialog.org.id)
          }}
        />
      )}
    </>
  )
}
