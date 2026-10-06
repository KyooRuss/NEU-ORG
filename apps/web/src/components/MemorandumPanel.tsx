import { FileText, FileUp, Plus } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'

import {
  createMemorandum,
  deleteMemorandum,
  fetchMemorandums,
  MEMO_ACCEPT,
  MEMO_MAX_BYTES,
  MEMO_TYPES,
  type Memorandum,
  memorandumUrl,
  updateMemorandum,
  usingSampleMemos,
} from '../lib/memorandums'
import ConfirmDialog from './ConfirmDialog'
import Modal, { primaryButton, secondaryButton } from './Modal'

const fieldClass =
  'mt-1 w-full rounded-lg bg-field px-3 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-blue/40'

type Dialog = { kind: 'add' } | { kind: 'edit' | 'delete'; memo: Memorandum } | null

export default function MemorandumPanel() {
  const [memos, setMemos] = useState<Memorandum[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [sample, setSample] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchMemorandums()
      .then((loaded) => {
        if (cancelled) return
        setMemos(loaded)
        setSample(usingSampleMemos())
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

  async function view(memo: Memorandum) {
    setActionError(null)
    // Open the tab right away so the browser doesn't treat it as a pop-up.
    const tab = window.open('', '_blank')
    try {
      const url = await memorandumUrl(memo)
      if (!url) throw new Error('This sample memorandum has no file to open.')
      if (tab) tab.location.replace(url)
      else window.location.assign(url)
    } catch (error) {
      tab?.close()
      setActionError((error as Error).message)
    }
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-md ring-1 ring-zinc-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 pb-3">
        <h2 className="text-lg font-semibold text-brand-navy">Memorandum</h2>
        <button
          type="button"
          onClick={() => setDialog({ kind: 'add' })}
          className="flex items-center gap-1.5 rounded-md bg-[#2f80ed] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-brand-blue"
        >
          <Plus size={14} aria-hidden="true" />
          Add Memo
        </button>
      </div>

      {sample && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong className="font-semibold">Showing sample data.</strong> The memorandums table isn’t
          in Supabase yet, so uploads here only last until you reload the page. Apply the
          memorandums migration to save real files.
        </p>
      )}
      {actionError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <ul className="mt-4 grid gap-3">
        {memos?.map((memo) => (
          <li key={memo.id} className="flex flex-wrap items-center gap-4 rounded-md bg-surface px-6 py-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-blue/20 text-white">
              <FileText size={22} fill="currentColor" className="text-white" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900">{memo.title}</p>
              <p className="truncate text-xs text-zinc-700">{memo.file_name}</p>
              <p className="mt-1 flex gap-6 text-[11px] text-zinc-500">
                <span>{formatDate(memo.created_at)}</span>
                <span>{formatTime(memo.created_at)}</span>
              </p>
            </div>
            <div className="flex gap-4 self-end text-sm font-medium">
              <button
                type="button"
                onClick={() => void view(memo)}
                className="border-b border-brand-blue/60 text-brand-blue transition hover:text-brand-navy"
              >
                View
              </button>
              <button
                type="button"
                onClick={() => setDialog({ kind: 'edit', memo })}
                className="border-b border-zinc-400/60 text-zinc-600 transition hover:text-zinc-900"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDialog({ kind: 'delete', memo })}
                className="border-b border-red-400/60 text-red-500 transition hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {(memos === null || memos.length === 0 || loadError) && (
        <p className="py-8 text-center text-sm text-zinc-500">
          {loadError ? (
            <span className="text-red-700">
              Could not load memorandums: {loadError}{' '}
              <button type="button" onClick={reload} className="font-medium underline">
                Try again
              </button>
            </span>
          ) : memos === null ? (
            'Loading…'
          ) : (
            'No memorandums yet. Click “Add Memo” to upload the first one.'
          )}
        </p>
      )}

      {dialog?.kind === 'add' && <MemoFormModal onClose={close} onSaved={reload} />}
      {dialog?.kind === 'edit' && <MemoFormModal memo={dialog.memo} onClose={close} onSaved={reload} />}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete memorandum?"
          message={`“${dialog.memo.title}” and its file will be deleted for good.`}
          confirmLabel="Delete"
          danger
          onClose={close}
          onConfirm={async () => {
            await deleteMemorandum(dialog.memo)
            setMemos((current) => current?.filter((memo) => memo.id !== dialog.memo.id) ?? null)
          }}
        />
      )}
    </section>
  )
}

// Adds a memo, or edits one when `memo` is given. When editing, the file is
// only replaced if a new one is picked.
function MemoFormModal({
  memo,
  onClose,
  onSaved,
}: {
  memo?: Memorandum
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(memo?.title ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFile(picked: File | undefined) {
    if (!picked) return
    if (!MEMO_TYPES.includes(picked.type)) {
      setError(`“${picked.name}” must be a PDF, Word document, PNG or JPG.`)
      return
    }
    if (picked.size > MEMO_MAX_BYTES) {
      setError(`“${picked.name}” is larger than ${MEMO_MAX_BYTES / 1024 / 1024} MB.`)
      return
    }
    setError(null)
    setFile(picked)
    // Suggest a title from the file name when none is typed yet.
    if (!title.trim()) setTitle(picked.name.replace(/\.[^.]+$/, ''))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return setError('Enter a title for the memorandum.')
    if (!memo && !file) return setError('Choose a file to upload.')

    setSaving(true)
    setError(null)
    try {
      if (memo) await updateMemorandum(memo, title, file)
      else if (file) await createMemorandum(title, file)
      onSaved()
      onClose()
    } catch (caught) {
      setError((caught as Error).message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title={memo ? 'Edit Memo' : 'Add a Memo'}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          {error && (
            <p role="alert" className="mr-auto self-center text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" form="memo-form" disabled={saving} className={primaryButton}>
            {saving ? 'Saving…' : memo ? 'Save changes' : 'Upload'}
          </button>
        </>
      }
    >
      <form id="memo-form" noValidate onSubmit={(event) => void handleSubmit(event)} className="grid gap-5">
        <label className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-surface px-4 text-center text-zinc-500 transition hover:border-brand-blue/60 focus-within:ring-2 focus-within:ring-brand-blue/40">
          <FileUp size={28} aria-hidden="true" />
          <span className="text-sm font-medium break-all">
            {file ? file.name : memo ? memo.file_name : 'Choose memorandum file'}
          </span>
          <span className="text-xs">
            {memo && !file ? 'Click to replace the file · ' : ''}PDF, Word, PNG or JPG, up to 10 MB
          </span>
          <input
            type="file"
            accept={MEMO_ACCEPT}
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </label>

        <label className="text-sm text-zinc-700">
          Title <span className="text-red-600">*</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Suspension of Class"
            className={fieldClass}
          />
        </label>
      </form>
    </Modal>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
