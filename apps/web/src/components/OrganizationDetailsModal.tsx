import { Building2, CalendarDays, MapPin, Send, UserRound, Users } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import { fetchMembers, type Member } from '../lib/members'
import { mediaUrl, type Organization, usingSampleData } from '../lib/organizations'
import Modal, { secondaryButton } from './Modal'

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
const dayFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' })

export default function OrganizationDetailsModal({
  organization: org,
  onClose,
}: {
  organization: Organization
  onClose: () => void
}) {
  const logo = mediaUrl(org.logo_path)

  return (
    <Modal
      title="Organization details"
      size="xl"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={secondaryButton}>
          Close
        </button>
      }
    >
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue/10 text-brand-blue">
          {logo ? (
            <img src={logo} alt={`${org.name} logo`} className="size-full object-cover" />
          ) : (
            <Building2 size={28} aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-brand-navy">{org.name}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {org.categories.map((category) => (
              <span key={category} className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 font-medium text-brand-blue">
                {category}
              </span>
            ))}
            <span
              className={`rounded-full px-2.5 py-0.5 font-medium capitalize ${
                org.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {org.status}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-600">
            <span className="inline-flex items-center gap-1.5">
              <Users size={15} className="text-brand-blue" aria-hidden="true" />
              <strong className="font-semibold text-brand-navy">{org.member_count ?? '—'}</strong>
              {org.member_count === 1 ? 'Member' : 'Members'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={15} className="text-brand-blue" aria-hidden="true" />
              <strong className="font-semibold text-brand-navy">{org.event_count ?? '—'}</strong>
              {org.event_count === 1 ? 'Event' : 'Events'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-x-10 gap-y-6 lg:grid-cols-[3fr_2fr]">
        <dl className="grid content-start gap-5 text-sm">
          <Detail label="Short Description / Overview">{org.description}</Detail>
          <Detail label="Vision">{org.vision}</Detail>
          <Detail label="Mission">{org.mission}</Detail>
          <Detail label="Contact Details">
            {(org.room_number || org.telegram_contact || org.facebook_contact) && (
              <ul className="grid gap-1.5">
                <Contact icon={MapPin} value={org.room_number} />
                <Contact icon={Send} value={org.telegram_contact} />
                <Contact icon={UserRound} value={org.facebook_contact} />
              </ul>
            )}
          </Detail>
          <Detail label="Photos from Previous Events / Activities">
            {org.photo_paths.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {org.photo_paths.map((path) => (
                  <a
                    key={path}
                    href={mediaUrl(path) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="aspect-square overflow-hidden rounded-lg bg-field"
                  >
                    <img src={mediaUrl(path) ?? undefined} alt="Event photo" className="size-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </Detail>
        </dl>

        <dl className="grid content-start gap-5 text-sm lg:border-l lg:border-zinc-200 lg:pl-10">
          <Detail label="Reasons to Join">
            {org.reasons_to_join.length > 0 && (
              <ol className="list-decimal space-y-1 pl-5">
                {org.reasons_to_join.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ol>
            )}
          </Detail>
          <Detail label="Department">{org.department}</Detail>
          <Detail label="Member / Alumni Testimonials">
            {org.testimonials.length > 0 && (
              <div className="grid gap-3">
                {org.testimonials.map((item, index) => (
                  <figure key={index} className="rounded-lg bg-surface p-3 ring-1 ring-zinc-200">
                    <blockquote className="whitespace-pre-line">“{item.text}”</blockquote>
                    {item.author && (
                      <figcaption className="mt-1.5 text-xs text-zinc-500">— {item.author}</figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </Detail>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Detail label="Added">{dateFormat.format(new Date(org.created_at))}</Detail>
            <Detail label="Last updated">{dateFormat.format(new Date(org.updated_at))}</Detail>
          </div>
          {org.archived_at && (
            <Detail label="Moved to Trash">{dateFormat.format(new Date(org.archived_at))}</Detail>
          )}
        </dl>
      </div>

      <MemberList org={org} />
    </Modal>
  )
}

// Who's in the organization. View only; officers manage members on their Members page.
function MemberList({ org }: { org: Organization }) {
  const sample = usingSampleData()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sample) return
    let cancelled = false
    fetchMembers(org.id)
      .then((loaded) => {
        if (!cancelled) setMembers(loaded)
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message)
      })
    return () => {
      cancelled = true
    }
  }, [org.id, sample])

  return (
    <section className="mt-8 border-t border-zinc-200 pt-6">
      <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Members{members ? ` (${members.length})` : ''}
      </h3>
      {sample ? (
        <p className="mt-2 text-sm text-zinc-400 italic">Sample organizations don’t have a member list.</p>
      ) : error ? (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load the members: {error}
        </p>
      ) : !members ? (
        <p className="mt-2 text-sm text-zinc-500">Loading…</p>
      ) : members.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400 italic">No members yet.</p>
      ) : (
        <div className="mt-3 max-h-72 overflow-auto rounded-lg ring-1 ring-zinc-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="sticky top-0 bg-surface text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Student No.</th>
                <th className="px-4 py-2.5 font-medium">Program</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-brand-navy">{member.name}</p>
                    <p className="text-xs text-zinc-500">{member.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-700">{member.student_no ?? '—'}</td>
                  <td className="px-4 py-2.5 text-zinc-700">{member.program ?? '—'}</td>
                  <td className="px-4 py-2.5 text-zinc-700">{dayFormat.format(new Date(member.joined_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-zinc-800">
        {children || <span className="text-zinc-400 italic">Not set</span>}
      </dd>
    </div>
  )
}

function Contact({ icon: Icon, value }: { icon: typeof MapPin; value: string | null }) {
  if (!value) return null
  return (
    <li className="flex items-center gap-2">
      <Icon size={14} className="shrink-0 text-brand-blue" aria-hidden="true" />
      {value}
    </li>
  )
}
