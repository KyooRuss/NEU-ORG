import { Building2, type LucideIcon, MapPin, Quote, Send, UserRound } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import { fetchMyOrganizationIds } from '../lib/officers'
import { fetchOrganizationsByIds, mediaUrl, type Organization } from '../lib/organizations'

const cardClass = 'rounded-xl bg-white p-6 shadow-md ring-1 ring-zinc-200'

// The officer's own organization, as students will see it. An officer in several
// organizations picks which one to look at.
export default function MyOrganizationPage({ profileId }: { profileId: string }) {
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
      <section className="rounded-2xl bg-linear-to-r from-brand-navy to-[#2f45c8] px-6 py-8 text-white shadow-lg sm:px-12">
        <h1 className="truncate text-2xl font-bold">My Organization</h1>
        <p className="mt-1 text-sm text-white/90">View and update your organization's profile</p>
      </section>

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

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[3fr_1fr]">
            <div className="grid gap-6">
              <ProfileCard org={org} />

              <Card title="Reasons to Join">
                {org.reasons_to_join.length > 0 && (
                  <ul className="list-disc space-y-3 pl-5 text-sm text-zinc-700">
                    {org.reasons_to_join.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Member/Alumni Testimonials">
                {org.testimonials.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {org.testimonials.map((item, index) => (
                      <figure key={index} className="rounded-lg bg-brand-blue/5 p-4">
                        <Quote size={18} className="fill-zinc-900 text-zinc-900" aria-hidden="true" />
                        <blockquote className="mt-2 text-sm whitespace-pre-line text-zinc-600">
                          “{item.text}”
                        </blockquote>
                        {item.author && (
                          <figcaption className="mt-2 text-sm font-semibold text-brand-blue">
                            {item.author}
                          </figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="grid gap-6">
              <Card title="VISION" accent>
                {org.vision && <p className="text-sm whitespace-pre-line text-zinc-700">{org.vision}</p>}
              </Card>
              <Card title="MISSION" accent>
                {org.mission && <p className="text-sm whitespace-pre-line text-zinc-700">{org.mission}</p>}
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function ProfileCard({ org }: { org: Organization }) {
  const logo = mediaUrl(org.logo_path)

  return (
    <section className={`${cardClass} flex flex-col gap-5 sm:flex-row sm:items-start`}>
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue/10 text-brand-blue">
        {logo ? (
          <img src={logo} alt={`${org.name} logo`} className="size-full object-cover" />
        ) : (
          <Building2 size={28} aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-brand-blue">{org.name}</h2>
        <p className="mt-2 text-sm whitespace-pre-line text-zinc-700">{org.description || <NotSet />}</p>
        <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-zinc-700">
          <Contact icon={MapPin} label="Room" value={org.room_number} />
          <Contact icon={UserRound} label="Facebook" value={org.facebook_contact} />
          <Contact icon={Send} label="Telegram" value={org.telegram_contact} />
        </ul>
      </div>
    </section>
  )
}

// A titled card. With nothing inside, it says so instead of showing an empty box.
function Card({ title, accent, children }: { title: string; accent?: boolean; children: ReactNode }) {
  return (
    <section className={cardClass}>
      <h2 className={`font-semibold ${accent ? 'text-brand-blue' : 'text-brand-navy'}`}>{title}</h2>
      <div className="mt-3">{children || <NotSet />}</div>
    </section>
  )
}

function Contact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | null }) {
  if (!value) return null
  return (
    <li className="flex items-center gap-2" title={label}>
      <Icon size={16} className="shrink-0 text-zinc-500" aria-hidden="true" />
      <span className="sr-only">{label}:</span>
      {value}
    </li>
  )
}

function NotSet() {
  return <span className="text-sm text-zinc-400 italic">Not set</span>
}
