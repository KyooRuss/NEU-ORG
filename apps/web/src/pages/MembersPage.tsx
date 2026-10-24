import { Search, UserMinus, Users } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import { secondaryButton } from '../components/Modal'
import PageBanner from '../components/PageBanner'
import { fetchMembers, type Member, removeMember, usingSampleMembers } from '../lib/members'
import { fetchMyOrganizationIds } from '../lib/officers'
import { fetchOrganizationsByIds, mediaUrl, type Organization } from '../lib/organizations'

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th']

// The officer's members: everyone accepted on the Recruitment page. Officers can
// search them and remove someone who left. An officer in several organizations
// picks which one.
export default function MembersPage({ profileId }: { profileId: string }) {
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
        <h1 className="truncate text-2xl font-bold">Members</h1>
        <p className="mt-1 text-sm text-white/90">The students in your organization</p>
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

          {/* A new key reloads the members when the officer switches organization. */}
          <Members key={org.id} org={org} />
        </>
      )}
    </>
  )
}

// One organization's members.
function Members({ org }: { org: Organization }) {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sample, setSample] = useState(false)
  const [query, setQuery] = useState('')
  const [removing, setRemoving] = useState<Member | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMembers(org.id)
      .then((loaded) => {
        if (cancelled) return
        setMembers(loaded)
        setSample(usingSampleMembers())
      })
      .catch((caught: Error) => {
        if (!cancelled) setLoadError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [org.id])

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return members ?? []
    return (members ?? []).filter((member) =>
      [member.name, member.email, member.student_no ?? ''].some((text) => text.toLowerCase().includes(search)),
    )
  }, [members, query])

  const logo = mediaUrl(org.logo_path)
  const total = members?.length ?? 0

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
            {members ? `${total} member${total === 1 ? '' : 's'}` : 'Loading members…'}
          </p>
        </div>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Search members</span>
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email or student no."
            className="w-full rounded-full bg-field py-2 pr-4 pl-9 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-blue/40"
          />
        </label>
      </section>

      {sample && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong className="font-semibold">No member data yet.</strong> The membership tables aren’t in
          Supabase yet. Apply the recruitment migrations to see your members here.
        </p>
      )}

      {loadError ? (
        <p role="alert" className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load the members: {loadError}
        </p>
      ) : !members ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 rounded-xl bg-white px-6 py-10 text-center text-sm text-zinc-500 shadow-sm ring-1 ring-zinc-200">
          {members.length === 0
            ? 'No members yet. Students you accept on the Recruitment page will appear here.'
            : 'No members match your search.'}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {visible.map((member) => (
            <MemberCard key={member.id} member={member} onRemove={() => setRemoving(member)} />
          ))}
        </ul>
      )}

      {removing && (
        <ConfirmDialog
          title="Remove member?"
          message={`${removing.name} will no longer be a member of ${org.name}. They can apply again the next time recruitment is open.`}
          confirmLabel="Remove"
          danger
          onConfirm={async () => {
            await removeMember(removing.id)
            setMembers((current) => current?.filter((item) => item.id !== removing.id) ?? null)
          }}
          onClose={() => setRemoving(null)}
        />
      )}
    </>
  )
}

function MemberCard({ member, onRemove }: { member: Member; onRemove: () => void }) {
  const initials = member.name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <li className="rounded-xl bg-white px-6 py-5 shadow-sm ring-1 ring-zinc-200">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/80 text-sm font-semibold text-white"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-brand-navy">{member.name}</p>
            <p className="truncate text-sm text-zinc-500">{member.email}</p>
          </div>
        </div>
        <Field label="Program">{member.program ?? '—'}</Field>
        <Field label="Student No.">{member.student_no ?? '—'}</Field>
        <Field label="Year">{member.year_level ? `${ORDINALS[member.year_level - 1]} Year` : '—'}</Field>
        <Field label="Joined">
          {new Date(member.joined_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Field>
        <div>
          <button type="button" onClick={onRemove} className={`${secondaryButton} inline-flex items-center gap-1.5`}>
            <UserMinus size={14} aria-hidden="true" />
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-sm text-zinc-700">{children}</p>
    </div>
  )
}
