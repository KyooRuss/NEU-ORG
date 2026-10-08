import { Search, TriangleAlert, X } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'

import {
  assignOfficer,
  type Officer,
  type OfficerCandidate,
  OFFICER_POSITIONS,
  type OfficerPosition,
  searchOfficerCandidates,
} from '../lib/officers'
import { fetchOrganizations, type Organization } from '../lib/organizations'
import Modal, { primaryButton, secondaryButton } from './Modal'

type Props = {
  // The officers already listed on the page, used to name who currently holds the position.
  officers: Officer[]
  onClose: () => void
  onAdded: () => void
}

const fieldClass =
  'mt-1 w-full rounded-lg bg-field px-3 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-blue/40'

// Adds a President or Adviser to an organization, replacing whoever holds that position there.
export default function AddAdminModal({ officers, onClose, onAdded }: Props) {
  const [organizations, setOrganizations] = useState<Organization[] | null>(null)
  const [organizationId, setOrganizationId] = useState('')
  const [position, setPosition] = useState<OfficerPosition | ''>('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OfficerCandidate[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [person, setPerson] = useState<OfficerCandidate | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrganizations('active')
      .then((loaded) => setOrganizations([...loaded].sort((a, b) => a.name.localeCompare(b.name))))
      .catch((caught: Error) => setError(caught.message))
  }, [])

  // Search once typing pauses, and ignore answers that arrive after a newer search.
  useEffect(() => {
    const text = query.trim()
    if (!text) {
      setResults(null)
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      searchOfficerCandidates(text)
        .then((found) => {
          if (!cancelled) setResults(found)
        })
        .catch((caught: Error) => {
          if (!cancelled) setError(caught.message)
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const current = officers.find(
    (officer) =>
      officer.organization_id === organizationId && officer.position === position && officer.status === 'active',
  )
  const alreadyHolds = !!person && current?.profile_id === person.id
  const ready = !!organizationId && !!position && !!person && !alreadyHolds

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!ready) return
    setSaving(true)
    setError(null)
    try {
      await assignOfficer(person!.id, organizationId, position as OfficerPosition)
      onAdded()
      onClose()
    } catch (caught) {
      setError((caught as Error).message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Assign a new admin"
      size="sm"
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" form="add-admin-form" disabled={saving || !ready} className={primaryButton}>
            {saving ? 'Saving…' : 'Add admin'}
          </button>
        </>
      }
    >
      <form id="add-admin-form" onSubmit={(event) => void handleSubmit(event)} className="grid gap-5">
        <label className="text-sm text-zinc-700">
          Organization <span className="text-red-600">*</span>
          <select
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            disabled={organizations === null}
            className={fieldClass}
          >
            <option value="">{organizations === null ? 'Loading organizations…' : 'Choose an organization'}</option>
            {organizations?.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-zinc-700">
          Position <span className="text-red-600">*</span>
          <select
            value={position}
            onChange={(event) => setPosition(event.target.value as OfficerPosition | '')}
            className={fieldClass}
          >
            <option value="">Choose a position</option>
            {OFFICER_POSITIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="text-sm text-zinc-700">
          <p id="add-admin-name-label">
            Name <span className="text-red-600">*</span>
          </p>
          {person ? (
            <div className="mt-1 flex items-center justify-between gap-3 rounded-lg bg-field px-3 py-2">
              <CandidateText candidate={person} />
              <button
                type="button"
                onClick={() => setPerson(null)}
                aria-label={`Choose someone other than ${person.name}`}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 mt-0.5 -translate-y-1/2 text-zinc-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name or email"
                  aria-labelledby="add-admin-name-label"
                  className={`${fieldClass} pl-9`}
                />
              </div>
              {query.trim() && (
                <ul className="mt-2 max-h-56 divide-y divide-zinc-100 overflow-y-auto rounded-lg ring-1 ring-zinc-200">
                  {results?.map((candidate) => (
                    <li key={candidate.id}>
                      <button
                        type="button"
                        onClick={() => setPerson(candidate)}
                        className="w-full px-3 py-2 text-left transition hover:bg-surface"
                      >
                        <CandidateText candidate={candidate} />
                      </button>
                    </li>
                  ))}
                  {(searching || results?.length === 0) && (
                    <li className="px-3 py-2 text-zinc-500">
                      {searching ? 'Searching…' : 'No active accounts match. They must log in once before they show here.'}
                    </li>
                  )}
                </ul>
              )}
            </>
          )}
        </div>

        {current && (
          <p
            className={`flex gap-2 rounded-lg px-3 py-2 text-sm ${
              alreadyHolds ? 'bg-zinc-100 text-zinc-600' : 'bg-amber-50 text-amber-800'
            }`}
          >
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {alreadyHolds
              ? `${current.name} is already the ${position.toLowerCase()} of this organization.`
              : `${current.name} is the current ${position.toLowerCase()}. Saving will set them to Inactive, and they lose officer access unless they hold another active position.`}
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}

function CandidateText({ candidate }: { candidate: OfficerCandidate }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate font-medium text-brand-navy">{candidate.name}</span>
      <span className="block truncate text-xs text-zinc-500">
        {[candidate.student_no, candidate.email].filter(Boolean).join(' · ')}
      </span>
    </span>
  )
}
