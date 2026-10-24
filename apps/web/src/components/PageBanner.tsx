import { createContext, type ReactNode, useContext, useEffect } from 'react'

type BannerUser = {
  // Tells the dashboard a banner is showing, so it hides its own bell.
  setBannerShown: (shown: boolean) => void
  // The notification bell to show on the banner's right.
  bell: ReactNode
}

export const BannerUserContext = createContext<BannerUser | null>(null)

// The blue banner at the top of a page, with the bell on its right.
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
      {user?.bell}
    </section>
  )
}
