import { Check, CircleMinus, CirclePlus, ExternalLink, Users, X } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import { primaryButton, secondaryButton } from '../components/Modal'
import PageBanner from '../components/PageBanner'
import { fetchMyOrganizationIds } from '../lib/officers'
import { fetchOrganizationsByIds, mediaUrl, type Organization } from '../lib/organizations'
import {
  acceptApplication,
  type Application,
  declineApplication,
  fetchPendingApplications,
  isRecruitmentOpen,
  setRecruitmentOpen,
  usingSampleApplications,
} from '../lib/recruitment'

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th']

// The officer's recruitment: open or close it, and accept or decline the students
// who applied. An officer in several organizations picks which one.
export default function RecruitmentPage({ profileId }: { profileId: string }) {
  const [orgs, setOrgs] = useState<Organization[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMyOrganizationIds(profileId)
      .then(fetchOrganizationsByIds)
      .then((loaded) => {
        if (!cancelled) setOrgs(loaded)
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [profileId])

  const org = orgs?.find((item) => item.id === selectedId) ?? orgs?.[0]

  return (
    <>
      <PageBanner>
        <h1 className="truncate text-2xl font-bold">Recruitment</h1>
        <p className="mt-1 text-sm text-white/90">Manage membership applications</p>
      </PageBanner>

      {error ? (
        <p role="alert" className="mt-8 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load your organization: {error}
        </p>
      ) : !orgs ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Loading…</p>
      ) : !org ? (
        <p className="mt-8 text-center text-sm text-zinc-500">You aren't assigned to an organization yet.</p>
      ) : (
        <>
          {orgs.length > 1 && (
            <div role="tablist" aria-label="Your organizations" className="mt-6 flex flex-wrap gap-2">
              {orgs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={item.id === org.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`rounded-full px-4 py-1.5 text-sm transition ${
                    item.id === org.id
                      ? 'bg-brand-blue text-white'
                      : 'bg-white text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}

          {/* A new key reloads the applications when the officer switches organization. */}
          <Recruitment key={org.id} org={org} />
        </>
      )}
    </>
  )
}

// One organization's recruitment status and pending applications.
function Recruitment({ org }: { org: Organization }) {
  const [open, setOpen] = useState(() => isRecruitmentOpen(org))
  const [applications, setApplications] = useState<Application[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sample, setSample] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState(false)
  const [declining, setDeclining] = useState<Application | null>(null)
  // The application being accepted, so its buttons can show it's working.
  const [accepting, setAccepting] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPendingApplications(org.id)
      .then((loaded) => {
        if (cancelled) return
        setApplications(loaded)
        setSample(usingSampleApplications())
      })
      .catch((caught: Error) => {
        if (!cancelled) setLoadError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [org.id])

  const remove = (id: string) => setApplications((current) => current?.filter((item) => item.id !== id) ?? null)

  async function accept(application: Application) {
    setAccepting(application.id)
    setActionError(null)
    try {
      await acceptApplication(application.id)
      remove(application.id)
    } catch (caught) {
      setActionError(`Could not accept ${application.name}: ${(caught as Error).message}`)
    } finally {
      setAccepting(null)
    }
  }

  const logo = mediaUrl(org.logo_path)
  const pending = applications?.length ?? 0

  return (
    <>
      <section className="mt-6 flex flex-wrap items-center gap-4 rounded-xl bg-white px-6 py-5 shadow-sm ring-2 ring-brand-blue/40">
        {logo ? (
          <img src={logo} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Users size={24} aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-brand-navy">{org.name}</h2>
          <p className="mt-0.5 text-sm text-zinc-600">
            Recruitment is currently{' '}
            <strong className={open ? 'text-emerald-600' : 'text-red-600'}>{open ? 'OPEN' : 'CLOSED'}</strong>
            {applications && (
              <>
                {' · '}
                {pending} pending application{pending === 1 ? '' : 's'}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmToggle(true)}
          className={`${primaryButton} inline-flex items-center gap-2`}
        >
          {open ? <CircleMinus size={16} aria-hidden="true" /> : <CirclePlus size={16} aria-hidden="true" />}
          {open ? 'Close Recruitment' : 'Open Recruitment'}
        </button>
      </section>

      {sample && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong className="font-semibold">Showing sample applications.</strong> The recruitment tables
          aren’t in Supabase yet, so changes here only last until you reload the page. Apply the
          recruitment migrations to save real data.
        </p>
      )}

      {actionError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {loadError ? (
        <p role="alert" className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load the applications: {loadError}
        </p>
      ) : !applications ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="mt-6 rounded-xl bg-white px-6 py-10 text-center text-sm text-zinc-500 shadow-sm ring-1 ring-zinc-200">
          {open
            ? 'No pending applications.'
            : 'Recruitment is closed. Open it to start receiving applications.'}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              busy={accepting === application.id}
              onAccept={() => void accept(application)}
              onDecline={() => setDeclining(application)}
            />
          ))}
        </ul>
      )}

      {confirmToggle && (
        <ConfirmDialog
          title={open ? 'Close recruitment?' : 'Open recruitment?'}
          message={
            open
              ? `Students won't be able to apply to ${org.name} until you open it again. Pending applications stay here.`
              : `Students will be able to apply to join ${org.name}.`
          }
          confirmLabel={open ? 'Close Recruitment' : 'Open Recruitment'}
          danger={open}
          onConfirm={async () => {
            await setRecruitmentOpen(org.id, !open)
            setOpen(!open)
          }}
          onClose={() => setConfirmToggle(false)}
        />
      )}

      {declining && (
        <ConfirmDialog
          title="Decline application?"
          message={`${declining.name} won't be added to ${org.name}. This can't be undone.`}
          confirmLabel="Decline"
          danger
          onConfirm={async () => {
            await declineApplication(declining.id)
            remove(declining.id)
          }}
          onClose={() => setDeclining(null)}
        />
      )}
    </>
  )
}

function ApplicationCard({
  application,
  busy,
  onAccept,
  onDecline,
}: {
  application: Application
  busy: boolean
  onAccept: () => void
  onDecline: () => void
}) {
  const initials = application.name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const year = application.year_level ? ` – ${ORDINALS[application.year_level - 1]} Year` : ''

  return (
    <li className="rounded-xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-200">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/80 text-sm font-semibold text-white"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-brand-navy">{application.name}</p>
            <p className="truncate text-sm text-zinc-500">{application.email}</p>
          </div>
        </div>
        <Field label="Program">
          {application.program}
          {year}
        </Field>
        <Field label="Student No.">{application.student_no ?? '—'}</Field>
        <Field label="Social Media">
          <a
            href={application.social_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-brand-blue hover:underline"
          >
            View Profile
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </Field>
        <Field label="Applied">
          {new Date(application.applied_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Field>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className={`${primaryButton} inline-flex items-center gap-1.5`}
        >
          <Check size={14} aria-hidden="true" />
          {busy ? 'Accepting…' : 'Accept'}
        </button>
        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          className={`${secondaryButton} inline-flex items-center gap-1.5`}
        >
          <X size={14} aria-hidden="true" />
          Decline
        </button>
      </div>
    </li>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-700">{children}</p>
    </div>
  )
}
