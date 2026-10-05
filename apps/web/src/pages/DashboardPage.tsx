import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Megaphone,
  Menu,
  MessageSquareText,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import { useState } from 'react'

import OrganizationsOverview from '../components/OrganizationsOverview'
import type { Profile } from '../lib/profile'
import { supabase } from '../lib/supabase'
import TrashPage from './TrashPage'

type NavItem = { label: string; icon: LucideIcon }
type StatCard = { label: string; hint: string; icon: LucideIcon }

// Sample menus for now; each item becomes a real page in later steps.
const adminNav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Organizations', icon: Building2 },
  { label: 'Event Requests', icon: ClipboardCheck },
  { label: 'Users', icon: Users },
  { label: 'Memorandums', icon: Megaphone },
  { label: 'Trash', icon: Trash2 },
]

const officerNav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'My Organization', icon: Building2 },
  { label: 'Event Posts', icon: CalendarDays },
  { label: 'Applications', icon: UserCheck },
  { label: 'Announcements', icon: Megaphone },
  { label: 'Feedback', icon: MessageSquareText },
]

const adminStats: StatCard[] = [
  { label: 'Organizations', hint: 'Verified Main Campus orgs', icon: Building2 },
  { label: 'Pending event requests', hint: 'Waiting for your approval', icon: ClipboardCheck },
  { label: 'Students', hint: 'Registered accounts', icon: Users },
  { label: 'Upcoming events', hint: 'Published this month', icon: CalendarDays },
]

const officerStats: StatCard[] = [
  { label: 'Members', hint: 'In your organization', icon: Users },
  { label: 'New applications', hint: 'Waiting for review', icon: UserCheck },
  { label: 'Event posts', hint: 'Waiting for admin approval', icon: ClipboardCheck },
  { label: 'Average rating', hint: 'From event feedback', icon: MessageSquareText },
]

export default function DashboardPage({ profile }: { profile: Profile }) {
  const isAdmin = profile.role === 'admin'
  const nav = isAdmin ? adminNav : officerNav
  const stats = isAdmin ? adminStats : officerStats
  const name = profile.full_name ?? profile.email
  const [collapsed, setCollapsed] = useState(false)
  // Which sidebar page is open. Only Dashboard and (for admins) Trash exist so far.
  const [page, setPage] = useState('Dashboard')
  const openPage = (label: string) => {
    if (label === 'Dashboard' || (isAdmin && label === 'Trash')) setPage(label)
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface md:flex-row">
      <aside
        className={`flex shrink-0 flex-col bg-linear-to-b from-brand-navy to-brand-blue text-white transition-[width] duration-300 ease-in-out md:sticky md:top-0 md:h-screen ${
          collapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        <div className={`flex items-center gap-3 px-6 py-6 ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            aria-expanded={!collapsed}
            aria-controls="dashboard-nav"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'md:hidden' : ''}`}>
            <img src="/images/neu-org-logo.png" alt="" width={40} height={40} className="size-10" />
            <div className="whitespace-nowrap">
              <p className="text-lg leading-tight font-bold">NEU ORG</p>
              <p className="text-xs text-white/70">{isAdmin ? 'Admin Portal' : 'Officer Portal'}</p>
            </div>
          </div>
        </div>

        {/* On phones the menu hides completely; on larger screens it shrinks to icons. */}
        <nav
          id="dashboard-nav"
          className={`gap-1 overflow-x-auto px-3 pb-3 md:flex md:flex-1 md:flex-col md:overflow-visible ${
            collapsed ? 'hidden' : 'flex'
          }`}
        >
          {nav.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => openPage(label)}
              title={collapsed ? label : undefined}
              aria-current={label === page ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white aria-[current=page]:bg-white/15 aria-[current=page]:font-semibold aria-[current=page]:text-white ${
                collapsed ? 'md:justify-center' : ''
              }`}
            >
              <Icon size={18} className="shrink-0" aria-hidden="true" />
              <span className={`whitespace-nowrap ${collapsed ? 'md:sr-only' : ''}`}>{label}</span>
            </button>
          ))}
        </nav>

        <button
          type="button"
          title={collapsed ? 'Log out' : undefined}
          onClick={() => void supabase.auth.signOut()}
          className={`m-3 hidden items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white md:flex ${
            collapsed ? 'md:justify-center' : ''
          }`}
        >
          <LogOut size={18} className="shrink-0" aria-hidden="true" />
          <span className={`whitespace-nowrap ${collapsed ? 'md:sr-only' : ''}`}>Log out</span>
        </button>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12">
        {page === 'Trash' ? (
          <TrashPage />
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500">Welcome back,</p>
                <h1 className="text-2xl font-semibold text-brand-navy">{name}</h1>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue capitalize">
                  {profile.role}
                </span>
                <button
                  type="button"
                  onClick={() => void supabase.auth.signOut()}
                  className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 md:hidden"
                >
                  <LogOut size={16} aria-hidden="true" />
                  Log out
                </button>
              </div>
            </header>

            <p className="mt-6 rounded-lg border border-dashed border-brand-blue/40 bg-white px-4 py-3 text-sm text-zinc-600">
              This is a sample dashboard. The numbers and pages will be connected to real data in the
              next steps.
            </p>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(({ label, hint, icon: Icon }) => (
                <div key={label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-600">{label}</p>
                    <Icon size={18} className="text-brand-blue" aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-brand-navy">—</p>
                  <p className="mt-1 text-xs text-zinc-500">{hint}</p>
                </div>
              ))}
            </section>

            <section className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
              <h2 className="font-semibold text-brand-navy">
                {isAdmin ? 'Event requests to review' : 'Your recent event posts'}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                {isAdmin
                  ? 'Event posts submitted by officers will appear here for approval.'
                  : 'Event posts you submit will appear here with their status: Approved, Waiting for approval or Revision.'}
              </p>
            </section>

            {isAdmin && <OrganizationsOverview />}
          </>
        )}
      </main>
    </div>
  )
}
