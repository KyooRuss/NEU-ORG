import {
  Bell,
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
  UserRound,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import MemorandumPanel from '../components/MemorandumPanel'
import OrganizationsOverview from '../components/OrganizationsOverview'
import { RecentEvents, RecentOrganizations } from '../components/RecentlyAdded'
import { fetchOrganizations } from '../lib/organizations'
import type { Profile } from '../lib/profile'
import { supabase } from '../lib/supabase'
import TrashPage from './TrashPage'

type NavItem = { label: string; icon: LucideIcon }
type StatCard = { key: string; label: string; hint: string; icon: LucideIcon }
type Stats = Record<string, number | null>

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
  { key: 'organizations', label: 'Organizations', hint: 'Verified Main Campus Orgs', icon: Users },
  { key: 'pendingEvents', label: 'Pending Event Requests', hint: 'Waiting for your approval', icon: ClipboardCheck },
  { key: 'students', label: 'Students', hint: 'Registered accounts', icon: UserRound },
  { key: 'upcomingEvents', label: 'Upcoming Events', hint: 'Approved this month', icon: CalendarDays },
]

const officerStats: StatCard[] = [
  { key: 'members', label: 'Members', hint: 'In your organization', icon: Users },
  { key: 'applications', label: 'New applications', hint: 'Waiting for review', icon: UserCheck },
  { key: 'eventPosts', label: 'Event posts', hint: 'Waiting for admin approval', icon: ClipboardCheck },
  { key: 'rating', label: 'Average rating', hint: 'From event feedback', icon: MessageSquareText },
]

// Counts for the admin stat cards. Events aren't stored in Supabase yet, so
// those two stay empty (shown as "—") until the events table exists.
async function fetchAdminStats(): Promise<Stats> {
  const [organizations, students] = await Promise.all([
    fetchOrganizations('active')
      .then((orgs) => orgs.length)
      .catch(() => null),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .then(({ count, error }) => (error ? null : count)),
  ])
  return { organizations, students, pendingEvents: null, upcomingEvents: null }
}

export default function DashboardPage({ profile }: { profile: Profile }) {
  const isAdmin = profile.role === 'admin'
  const nav = isAdmin ? adminNav : officerNav
  const stats = isAdmin ? adminStats : officerStats
  const name = profile.full_name ?? profile.email
  // The sidebar stays shrunk to icons and grows while the mouse is over it.
  // The menu button keeps it open (and is the only way to open it on phones).
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const collapsed = !pinned && !hovered
  // Which sidebar page is open. Only Dashboard and (for admins) Organizations and Trash exist so far.
  const [page, setPage] = useState('Dashboard')
  const openPage = (label: string) => {
    if (label === 'Dashboard' || (isAdmin && (label === 'Organizations' || label === 'Trash'))) {
      setPage(label)
    }
    // Shrink the menu once a page is picked; it grows again when the mouse comes back.
    setPinned(false)
    setHovered(false)
  }
  const [counts, setCounts] = useState<Stats>({})

  // Reload the counts each time the admin comes back to the Dashboard.
  useEffect(() => {
    if (!isAdmin || page !== 'Dashboard') return
    let cancelled = false
    void fetchAdminStats().then((loaded) => {
      if (!cancelled) setCounts(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [isAdmin, page])

  return (
    <div className="flex min-h-screen flex-col bg-surface md:flex-row">
      {/* The aside holds the space in the layout. When the menu grows on hover, the panel
          inside slides over the page instead of pushing it aside. */}
      <aside
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setHovered(true)
        }}
        onPointerLeave={() => setHovered(false)}
        className={`relative z-30 shrink-0 transition-[width] duration-300 ease-in-out md:sticky md:top-0 md:h-screen ${
          pinned ? 'md:w-64' : 'md:w-20'
        }`}
      >
        <div
          className={`flex h-full flex-col bg-linear-to-b from-brand-navy to-brand-blue text-white transition-[width,box-shadow] duration-300 ease-in-out md:absolute md:inset-y-0 md:left-0 ${
            collapsed ? 'md:w-20' : 'md:w-64'
          } ${hovered && !pinned ? 'md:shadow-2xl' : ''}`}
        >
          <div className={`flex items-center gap-3 px-6 py-6 ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
            <button
              type="button"
              onClick={() => setPinned((value) => !value)}
              aria-label={pinned ? 'Close menu' : 'Keep menu open'}
              title={pinned ? 'Close menu' : 'Keep menu open'}
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
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-12">
        {/* Phones have no sidebar log-out button, so it lives here. */}
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="mb-4 flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 md:hidden"
        >
          <LogOut size={16} aria-hidden="true" />
          Log out
        </button>

        {page === 'Trash' ? (
          <TrashPage />
        ) : page === 'Organizations' ? (
          <OrganizationsOverview />
        ) : (
          <>
            <section className="flex items-center justify-between gap-4 rounded-2xl bg-linear-to-r from-brand-navy to-[#2f45c8] px-6 py-8 text-white shadow-lg sm:px-12">
              <div className="min-w-0">
                <p className="text-sm text-white/90">Welcome back,</p>
                <h1 className="mt-1 truncate text-2xl font-bold">{name}!</h1>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                {/* Notifications arrive in a later step. */}
                <button
                  type="button"
                  aria-label="Notifications"
                  title="Notifications"
                  className="flex size-10 items-center justify-center rounded-full text-white transition hover:bg-white/15"
                >
                  <Bell size={24} aria-hidden="true" />
                </button>
                <span
                  title={`${name} (${profile.role})`}
                  className="flex size-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand-navy uppercase"
                >
                  {name.charAt(0)}
                </span>
              </div>
            </section>

            <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(({ key, label, hint, icon: Icon }) => (
                <div key={key} className="rounded-xl bg-white p-6 shadow-md ring-1 ring-zinc-200">
                  <div className="flex items-start justify-between gap-3">
                    <p className="pt-1 text-sm font-semibold text-zinc-900">{label}</p>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#dfe6f3] text-brand-navy shadow-sm">
                      <Icon size={17} aria-hidden="true" />
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-brand-navy">
                    {counts[key]?.toLocaleString() ?? '—'}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">{hint}</p>
                </div>
              ))}
            </section>

            {isAdmin ? (
              <div className="mt-8 grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
                <MemorandumPanel />

                <div className="grid gap-6">
                  <RecentOrganizations />
                  <RecentEvents />
                </div>
              </div>
            ) : (
              <section className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
                <h2 className="font-semibold text-brand-navy">Your recent event posts</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Event posts you submit will appear here with their status: Approved, Waiting for
                  approval or Revision.
                </p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
