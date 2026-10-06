import { Pencil, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'

import {
  createResponsibility,
  deleteResponsibility,
  fetchResponsibilities,
  type Responsibility,
  updateResponsibility,
  usingSampleResponsibilities,
} from '../lib/responsibilities'
import ConfirmDialog from './ConfirmDialog'
import IconButton from './IconButton'

// "new" while adding, an item id while editing that item, null otherwise.
type Editing = 'new' | string | null

export default function ResponsibilitiesPanel() {
  const [items, setItems] = useState<Responsibility[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<Responsibility | null>(null)
  const [sample, setSample] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchResponsibilities()
      .then((loaded) => {
        if (cancelled) return
        setItems(loaded)
        setSample(usingSampleResponsibilities())
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

  return (
    <section className="rounded-xl bg-zinc-50 p-6 ring-1 ring-zinc-300">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-400 pb-3">
        <h2 className="text-lg font-semibold text-zinc-700">Admin’s Responsibilities</h2>
        <button
          type="button"
          onClick={() => setEditing('new')}
          disabled={items === null || editing !== null}
          className="flex items-center gap-1.5 rounded-md bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-300 disabled:opacity-50"
        >
          <Plus size={14} aria-hidden="true" />
          Add
        </button>
      </div>

      {sample && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong className="font-semibold">Showing sample data.</strong> Changes only last until you
          reload the page. Apply the admin responsibilities migration to save them.
        </p>
      )}

      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-zinc-800">
        {items?.map((item) =>
          editing === item.id ? (
            <li key={item.id}>
              <ResponsibilityForm
                initial={item.body}
                saveLabel="Save"
                onCancel={() => setEditing(null)}
                onSave={async (body) => {
                  await updateResponsibility(item.id, body)
                  setEditing(null)
                  reload()
                }}
              />
            </li>
          ) : (
            <li key={item.id} className="group">
              <div className="flex items-start gap-2">
                <p className="flex-1 pt-1">{item.body}</p>
                {/* Always visible on touch screens; on hover elsewhere. */}
                <div className="flex shrink-0 gap-0.5 transition md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                  <IconButton icon={Pencil} label="Edit responsibility" onClick={() => setEditing(item.id)} />
                  <IconButton icon={Trash2} label="Delete responsibility" danger onClick={() => setDeleting(item)} />
                </div>
              </div>
            </li>
          ),
        )}
        {editing === 'new' && items && (
          <li>
            <ResponsibilityForm
              initial=""
              saveLabel="Add"
              onCancel={() => setEditing(null)}
              onSave={async (body) => {
                await createResponsibility(body, items)
                setEditing(null)
                reload()
              }}
            />
          </li>
        )}
      </ol>

      {(items === null || loadError || (items.length === 0 && editing !== 'new')) && (
        <p className="py-6 text-center text-sm text-zinc-500">
          {loadError ? (
            <span className="text-red-700">
              Could not load responsibilities: {loadError}{' '}
              <button type="button" onClick={reload} className="font-medium underline">
                Try again
              </button>
            </span>
          ) : items === null ? (
            'Loading…'
          ) : (
            'No responsibilities yet. Click “Add” to write the first one.'
          )}
        </p>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete responsibility?"
          message={`“${deleting.body}” will be removed from the list.`}
          confirmLabel="Delete"
          danger
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteResponsibility(deleting.id)
            setItems((current) => current?.filter((item) => item.id !== deleting.id) ?? null)
          }}
        />
      )}
    </section>
  )
}

function ResponsibilityForm({
  initial,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial: string
  saveLabel: string
  onSave: (body: string) => Promise<void>
  onCancel: () => void
}) {
  const [body, setBody] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!body.trim()) return setError('Write the responsibility first.')
    setSaving(true)
    setError(null)
    try {
      await onSave(body)
    } catch (caught) {
      setError((caught as Error).message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-2">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !saving) onCancel()
        }}
        rows={3}
        autoFocus
        aria-label="Responsibility"
        placeholder="e.g. Review and approve event requests."
        className="w-full resize-y rounded-lg bg-white px-3 py-2 text-sm text-zinc-800 ring-1 ring-zinc-300 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-blue/40"
      />
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-blue px-3 py-1 text-xs font-medium text-white transition hover:bg-brand-navy disabled:opacity-50"
        >
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>
    </form>
  )
}
