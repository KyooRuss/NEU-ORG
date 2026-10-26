import { type FormEvent, useState } from 'react'

import { COLLEGES } from '../lib/organizations'
import { addProfessor } from '../lib/professors'
import Modal, { primaryButton, secondaryButton } from './Modal'

const fieldClass =
  'mt-1 w-full rounded-lg bg-field px-3 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-blue/40'

// Adds a professor by email (Users > Professors > Add Professor), or marks an
// existing account as one when `account` is given (Users > Students). Calls
// onSaved with 'linked' when the account is a professor now, or 'invited' when
// the email has no account yet and becomes a professor on its first sign-in.
export default function ProfessorFormModal({
  account,
  onClose,
  onSaved,
}: {
  account?: { name: string; email: string }
  onClose: () => void
  onSaved: (result: 'linked' | 'invited', email: string) => void
}) {
  const [email, setEmail] = useState(account?.email ?? '')
  const [professorNo, setProfessorNo] = useState('')
  const [department, setDepartment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) return setError('Enter the professor’s email address.')
    if (!professorNo.trim()) return setError('Enter the professor number.')
    if (!department) return setError('Choose a department.')

    setSaving(true)
    setError(null)
    try {
      const result = await addProfessor(email, professorNo, department)
      onSaved(result, email.trim())
      onClose()
    } catch (caught) {
      setError((caught as Error).message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title={account ? 'Mark as Professor' : 'Add Professor'}
      size="sm"
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
          <button type="submit" form="professor-form" disabled={saving} className={primaryButton}>
            {saving ? 'Saving…' : account ? 'Mark as Professor' : 'Add Professor'}
          </button>
        </>
      }
    >
      <form id="professor-form" noValidate onSubmit={(event) => void handleSubmit(event)} className="grid gap-5">
        {account ? (
          <p className="text-sm text-zinc-700">
            <span className="font-semibold text-brand-navy">{account.name}</span> ({account.email}) will move from
            Students to Professors.
          </p>
        ) : (
          <label className="text-sm text-zinc-700">
            Email address <span className="text-red-600">*</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="e.g. rcastillo@neu.edu.ph"
              autoComplete="off"
              className={fieldClass}
            />
            <span className="mt-1 block text-xs text-zinc-500">
              The email they sign in with. If they haven’t signed in yet, they become a professor on their first
              sign-in.
            </span>
          </label>
        )}

        <label className="text-sm text-zinc-700">
          Professor No. <span className="text-red-600">*</span>
          <input
            value={professorNo}
            onChange={(event) => setProfessorNo(event.target.value)}
            placeholder="e.g. P0006"
            className={fieldClass}
          />
        </label>

        <label className="text-sm text-zinc-700">
          Department <span className="text-red-600">*</span>
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className={fieldClass}>
            <option value="">Choose a department</option>
            {COLLEGES.map((college) => (
              <option key={college} value={college}>
                {college}
              </option>
            ))}
          </select>
        </label>
      </form>
    </Modal>
  )
}
