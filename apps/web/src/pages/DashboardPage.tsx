import {
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
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
import { countPendingEvents, countUpcomingEvents } from '../lib/events'
import { fetchOrganizations } from '../lib/organizations'
import type { Profile } from '../lib/profile'
import { supabase } from '../lib/supabase'
import AddOrganizationPage from './AddOrganizationPage'
import AdminOfficersPage from './AdminOfficersPage'
import ApprovedEventsPage from './ApprovedEventsPage'
import EventRequestsPage from './EventRequestsPage'
import ProfessorsPage from './ProfessorsPage'
import StudentsPage from './StudentsPage'
import TrashPage from './TrashPage'

// An item with children opens a submenu; each child is its own page.
type NavItem = { label: string; icon: LucideIcon; children?: string[] }
type StatCard = { key: string; label: string; hint: string; icon: LucideIcon }
type Stats = Record<string, number | null>

const EVENT_PAGES = ['Event Requests', 'Upcoming Events', 'Past Events']
const USER_PAGES = ['Admin Officers', 'Students', 'Professors']

// Sample menus for now; each item becomes a real page in later steps.
const adminNav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Organizations', icon: Building2 },
  { label: 'Events', icon: CalendarDays, children: EVENT_PAGES },
  { label: 'Users', icon: Users, children: USER_PAGES },
  { label: 'Trash', icon: Trash2 },
]

// Opened from a button on the Organizations page, not from the sidebar.
const ADD_ORGANIZATION = 'Add Organization'

// The admin pages that exist so far (besides Dashboard).
const adminPages = ['Organizations', ADD_ORGANIZATION, 'Trash', ...USER_PAGES, ...EVENT_PAGES]

// Below Tailwind's "md" breakpoint the sidebar becomes a row, so submenus don't fit.
const isPhone = () => window.matchMedia('(max-width: 767px)').matches

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
  { key: 'pendingEvents', label: 'Pending Event Requests', hint: 'Waiting for your review', icon: ClipboardCheck },
  { key: 'students', label: 'Students', hint: 'Registered accounts', icon: UserRound },
  { key: 'upcomingEvents', label: 'Upcoming Events', hint: 'Approved and not yet ended', icon: CalendarDays },
]

const officerStats: StatCard[] = [
  { key: 'members', label: 'Members', hint: 'In your organization', icon: Users },
  { key: 'applications', label: 'New applications', hint: 'Waiting for review', icon: UserCheck },
  { key: 'eventPosts', label: 'Event posts', hint: 'Waiting for admin approval', icon: ClipboardCheck },
  { key: 'rating', label: 'Average rating', hint: 'From event feedback', icon: MessageSquareText },
]

// Counts for the admin stat cards. A count that fails to load shows as "—".
async function fetchAdminStats(): Promise<Stats> {
  const [organizations, students, pendingEvents, upcomingEvents] = await Promise.all([
    fetchOrganizations('active')
      .then((orgs) => orgs.length)
      .catch(() => null),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .then(({ count, error }) => (error ? null : count)),
    countPendingEvents().catch(() => null),
    countUpcomingEvents().catch(() => null),
  ])
  return { organizations, students, pendingEvents, upcomingEvents }
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
  // Which sidebar page is open. Only Dashboard and (for admins) the pages in adminPages exist so far.
  const [page, setPage] = useState('Dashboard')
  // The sidebar item to highlight. Pages outside the sidebar highlight the item they belong to.
  const navPage = page === ADD_ORGANIZATION ? 'Organizations' : page
  // Which submenu is open, by its parent's label.
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const openPage = (label: string) => {
    if (label === 'Dashboard' || (isAdmin && adminPages.includes(label))) {
      setPage(label)
      window.scrollTo(0, 0)
      // Keep the submenu of the page's group open, so the admin sees where they are.
      setOpenGroup(nav.find((item) => item.children?.includes(label))?.label ?? null)
    }
    // Shrink the menu once a page is picked; it grows again when the mouse comes back.
    setPinned(false)
    setHovered(false)
  }
  // A parent opens or closes its submenu. When the menu is only icons, or on phones,
  // there's no room for one, so it goes straight to the first page instead.
  const openGroupItem = (item: NavItem) => {
    if (collapsed || isPhone()) openPage(item.children![0])
    else setOpenGroup((current) => (current === item.label ? null : item.label))
  }
  const [counts, setCounts] = useState<Stats>({})
  // Pending event requests, for the badge on the Events menu.
  const [pendingEvents, setPendingEvents] = useState<number | null>(null)
  // Bumped after the admin reviews a request, so the badge reloads right away.
  const [badgeKey, setBadgeKey] = useState(0)

  // Reload the badge whenever the admin moves to another page or reviews a request.
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    countPendingEvents()
      .then((count) => {
        if (!cancelled) setPendingEvents(count)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isAdmin, page])

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
  }, [isAdmin, page, badgeKey])

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
              // Hidden while the menu is only open because the mouse is over it; it comes back on leave.
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/10 hover:text-white ${
                hovered && !pinned ? 'md:hidden' : ''
              }`}
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
            {nav.map((item) => {
              const { label, icon: Icon, children } = item
              const badge = label === 'Events' ? pendingEvents : null

              if (!children) {
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => openPage(label)}
                    title={collapsed ? label : undefined}
                    aria-current={label === navPage ? 'page' : undefined}
                    className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white aria-[current=page]:bg-white/15 aria-[current=page]:font-semibold aria-[current=page]:text-white ${
                      collapsed ? 'md:justify-center' : ''
                    }`}
                  >
                    <Icon size={18} className="shrink-0" aria-hidden="true" />
                    <span className={`whitespace-nowrap ${collapsed ? 'md:sr-only' : ''}`}>{label}</span>
                  </button>
                )
              }

              const open = !collapsed && openGroup === label
              const holdsPage = children.includes(navPage)
              return (
                <div key={label} className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => openGroupItem(item)}
                    title={collapsed ? label : undefined}
                    aria-expanded={open}
                    aria-controls={`submenu-${label}`}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/10 hover:text-white ${
                      collapsed ? 'md:justify-center' : ''
                    } ${holdsPage ? 'font-semibold text-white' : 'text-white/80'} ${
                      // While its submenu is open, the highlighted child shows the page instead.
                      holdsPage && !open ? 'bg-white/15' : ''
                    }`}
                  >
                    <Icon size={18} className="shrink-0" aria-hidden="true" />
                    <span className={`whitespace-nowrap ${collapsed ? 'md:sr-only' : ''}`}>{label}</span>
                    <CountBadge
                      count={badge}
                      className={collapsed ? 'md:absolute md:top-1 md:right-2 md:ml-0' : ''}
                    />
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className={`shrink-0 transition-transform max-md:hidden ${badge ? '' : 'ml-auto'} ${
                        open ? 'rotate-180' : ''
                      } ${collapsed ? 'md:hidden' : ''}`}
                    />
                  </button>

                  {open && (
                    <div id={`submenu-${label}`} className="hidden flex-col gap-1 md:flex">
                      {children.map((child) => (
                        <button
                          key={child}
                          type="button"
                          onClick={() => openPage(child)}
                          aria-current={child === navPage ? 'page' : undefined}
                          className="flex items-center gap-3 rounded-lg py-2 pr-3 pl-10.5 text-left text-sm whitespace-nowrap text-white/75 transition hover:bg-white/10 hover:text-white aria-[current=page]:bg-white/15 aria-[current=page]:font-semibold aria-[current=page]:text-white"
                        >
                          {child}
                          {child === 'Event Requests' && <CountBadge count={badge} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
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
        {/* Shown above every page except Add Organization, which only keeps the phone log-out button. */}
        <header
          className={`mb-6 flex items-center justify-end gap-3 ${page === ADD_ORGANIZATION ? 'md:hidden' : ''}`}
        >
          {/* Phones have no sidebar log-out button, so it lives here. */}
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="mr-auto flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 md:hidden"
          >
            <LogOut size={16} aria-hidden="true" />
            Log out
          </button>
          {page !== ADD_ORGANIZATION && (
            <>
              {/* Notifications arrive in a later step. */}
              <button
                type="button"
                aria-label="Notifications"
                title="Notifications"
                className="flex size-10 items-center justify-center rounded-full text-brand-navy transition hover:bg-zinc-200/70"
              >
                <Bell size={22} aria-hidden="true" />
              </button>
              <span
                title={`${name} (${profile.role})`}
                className="flex size-10 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white uppercase"
              >
                {name.charAt(0)}
              </span>
            </>
          )}
        </header>

        {EVENT_PAGES.includes(page) ? (
          <>
            <EventPageTabs page={page} pendingCount={pendingEvents} onOpen={openPage} />
            {page === 'Event Requests' ? (
              <EventRequestsPage
                pendingCount={pendingEvents}
                onReviewed={() => setBadgeKey((key) => key + 1)}
              />
            ) : (
              <ApprovedEventsPage key={page} timing={page === 'Past Events' ? 'past' : 'upcoming'} />
            )}
          </>
        ) : page === 'Admin Officers' ? (
          <AdminOfficersPage />
        ) : page === 'Professors' ? (
          <ProfessorsPage />
        ) : page === 'Students' ? (
          <StudentsPage />
        ) : page === 'Trash' ? (
          <TrashPage />
        ) : page === 'Organizations' ? (
          <OrganizationsOverview onAdd={() => openPage(ADD_ORGANIZATION)} />
        ) : page === ADD_ORGANIZATION ? (
          <AddOrganizationPage
            onCancel={() => openPage('Organizations')}
            onSaved={() => openPage('Organizations')}
          />
        ) : (
          <>
            <section className="rounded-2xl bg-linear-to-r from-brand-navy to-[#2f45c8] px-6 py-8 text-white shadow-lg sm:px-12">
              <p className="text-sm text-white/90">Welcome back,</p>
              <h1 className="mt-1 truncate text-2xl font-bold">{name}!</h1>
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

// A small count bubble. Hidden while there's nothing to count.
function CountBadge({ count, className = '' }: { count: number | null; className?: string }) {
  if (!count) return null
  return (
    <span
      className={`ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-brand-navy ${className}`}
    >
      {count > 99 ? '99+' : count}
      <span className="sr-only"> pending</span>
    </span>
  )
}

// On phones the sidebar has no submenu, so the event pages switch with these tabs.
function EventPageTabs({
  page,
  pendingCount,
  onOpen,
}: {
  page: string
  pendingCount: number | null
  onOpen: (label: string) => void
}) {
  return (
    <nav aria-label="Event pages" className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm ring-1 ring-zinc-200 md:hidden">
      {EVENT_PAGES.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onOpen(label)}
          aria-current={label === page ? 'page' : undefined}
          className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap text-zinc-600 transition hover:bg-zinc-100 aria-[current=page]:bg-brand-navy aria-[current=page]:font-semibold aria-[current=page]:text-white"
        >
          {label}
          {label === 'Event Requests' && !!pendingCount && (
            <span className="rounded-full bg-brand-blue/15 px-1.5 text-xs font-semibold">{pendingCount}</span>
          )}
        </button>
      ))}
    </nav>
  )
}
