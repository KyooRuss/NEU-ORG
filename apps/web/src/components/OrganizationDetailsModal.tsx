import { Building2, MapPin, Send, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'

import { mediaUrl, type Organization } from '../lib/organizations'
import Modal, { secondaryButton } from './Modal'

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

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
        </div>
      </div>

      <div className="mt-6 grid gap-x-10 gap-y-6 lg:grid-cols-[3fr_2fr]">
        <dl className="grid content-start gap-5 text-sm">
          <Detail label="Short Description / Overview">{org.description}</Detail>
          <Detail label="Mission & Vision">{org.mission_vision}</Detail>
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
          <Detail label="Program Eligibility">{org.program_eligibility}</Detail>
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
    </Modal>
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
