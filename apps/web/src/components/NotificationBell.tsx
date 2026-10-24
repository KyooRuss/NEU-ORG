import {
  Bell,
  CircleCheck,
  CircleX,
  ClipboardList,
  FileText,
  type LucideIcon,
  MessageSquareWarning,
  RefreshCw,
  Star,
  UserPlus,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  fetchAdminNotifications,
  fetchOfficerNotifications,
  fetchReadKeys,
  markRead,
  type NotificationKind,
  onReadChanged,
  timeAgo,
  type WebNotification,
} from '../lib/notifications'

// How often the badge checks for new notifications while the dashboard is open.
const REFRESH_MS = 60_000

const ICONS: Record<NotificationKind, { icon: LucideIcon; className: string }> = {
  application: { icon: UserPlus, className: 'bg-brand-blue/10 text-brand-blue' },
  approved: { icon: CircleCheck, className: 'bg-emerald-50 text-emerald-600' },
  declined: { icon: CircleX, className: 'bg-red-50 text-red-600' },
  revision: { icon: MessageSquareWarning, className: 'bg-amber-50 text-amber-600' },
  memo: { icon: FileText, className: 'bg-purple-50 text-purple-600' },
  feedback: { icon: Star, className: 'bg-amber-50 text-amber-600' },
  request: { icon: ClipboardList, className: 'bg-brand-blue/10 text-brand-blue' },
  resubmitted: { icon: RefreshCw, className: 'bg-amber-50 text-amber-600' },
  students: { icon: Users, className: 'bg-emerald-50 text-emerald-600' },
}

type Props = {
  profileId: string
  isAdmin: boolean
  // Opens a dashboard page by its menu label.
  onOpen: (page: string) => void
  // "dark" for the navy bell in the header, "light" for the white one in banners.
  tone: 'dark' | 'light'
}

// The bell with its unread count. Clicking it opens a panel of notifications;
// clicking one marks it read and opens the page it's about.
export default function NotificationBell({ profileId, isAdmin, onOpen, tone }: Props) {
  const [items, setItems] = useState<WebNotification[] | null>(null)
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    const notifications = isAdmin ? fetchAdminNotifications() : fetchOfficerNotifications(profileId)
    return Promise.all([notifications, fetchReadKeys(profileId)])
  }, [isAdmin, profileId])

  // Loads now, every minute, and whenever something is marked read.
  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      load()
        .then(([loadedItems, loadedReads]) => {
          if (cancelled) return
          setItems(loadedItems)
          setReadKeys(loadedReads)
          setError(null)
        })
        .catch((caught: Error) => {
          if (!cancelled) setError(caught.message)
        })
    }
    refresh()
    const timer = window.setInterval(refresh, REFRESH_MS)
    const stop = onReadChanged(refresh)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      stop()
    }
  }, [load])

  // Closes on a click outside the panel, or Escape.
  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const unread = (items ?? []).filter((item) => !readKeys.has(item.key))

  // Shows them as read right away; saving happens in the background.
  function setRead(keys: string[]) {
    if (keys.length === 0) return
    setReadKeys((current) => new Set([...current, ...keys]))
    markRead(keys).catch(() => {
      // Stays read on screen; it'll show as unread again after the next refresh.
    })
  }

  function choose(item: WebNotification) {
    setRead([item.key])
    setOpen(false)
    onOpen(item.page)
  }

  return (
    <div ref={wrapper} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'}
        aria-expanded={open}
        title="Notifications"
        className={`relative flex size-10 items-center justify-center rounded-full transition ${
          tone === 'light' ? '-my-1 text-white hover:bg-white/15' : 'text-brand-navy hover:bg-zinc-200/70'
        }`}
      >
        <Bell size={22} aria-hidden="true" />
        {unread.length > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute top-12 right-0 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white text-left shadow-xl ring-1 ring-zinc-200"
        >
          <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
            <div>
              <p className="font-semibold text-brand-navy">Notifications</p>
              <p className="text-xs text-zinc-500">
                {unread.length ? `${unread.length} unread` : 'All caught up'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRead(unread.map((item) => item.key))}
              disabled={unread.length === 0}
              className="text-xs font-semibold text-brand-blue hover:underline disabled:text-zinc-300 disabled:no-underline"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {error && !items ? (
              <p role="alert" className="px-4 py-6 text-center text-sm text-red-700">
                Could not load notifications: {error}
              </p>
            ) : !items ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">You’re all caught up.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {items.map((item) => {
                  const isUnread = !readKeys.has(item.key)
                  const { icon: Icon, className } = ICONS[item.kind]
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => choose(item)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 ${
                          isUnread ? 'bg-brand-blue/[0.04]' : ''
                        }`}
                      >
                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${className}`}>
                          <Icon size={17} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-brand-navy">{item.title}</span>
                          <span className="mt-0.5 line-clamp-2 block text-xs text-zinc-600">{item.body}</span>
                          <span className="mt-1 block text-[11px] text-zinc-400">{timeAgo(item.at)}</span>
                        </span>
                        {isUnread && (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-blue" aria-label="Unread" />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
