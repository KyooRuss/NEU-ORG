import { Bell } from 'lucide-react'
import { createContext, type ReactNode, useContext, useEffect } from 'react'

type BannerUser = {
  name: string
  role: string
  // Tells the dashboard a banner is showing, so it hides its own bell and profile.
  setBannerShown: (shown: boolean) => void
}

export const BannerUserContext = createContext<BannerUser | null>(null)

// The blue banner at the top of a page, with the bell and profile on its right.
export default function PageBanner({ children }: { children: ReactNode }) {
  const user = useContext(BannerUserContext)
  const setBannerShown = user?.setBannerShown

  useEffect(() => {
    if (!setBannerShown) return
    setBannerShown(true)
    return () => setBannerShown(false)
  }, [setBannerShown])

  return (
    <section className="flex items-start gap-4 rounded-2xl bg-linear-to-r from-brand-navy to-[#2f45c8] px-6 py-8 text-white shadow-lg sm:px-12">
      <div className="min-w-0 flex-1">{children}</div>
      {user && <BannerActions name={user.name} role={user.role} />}
    </section>
  )
}

function BannerActions({ name, role }: { name: string; role: string }) {
  return (
    <div className="-my-1 flex shrink-0 items-center gap-3">
      {/* Notifications arrive in a later step. */}
      <button
        type="button"
        aria-label="Notifications"
        title="Notifications"
        className="flex size-10 items-center justify-center rounded-full text-white transition hover:bg-white/15"
      >
        <Bell size={22} aria-hidden="true" />
      </button>
      <span
        title={`${name} (${role})`}
        className="flex size-10 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white uppercase ring-1 ring-white/40"
      >
        {name.charAt(0)}
      </span>
    </div>
  )
}
