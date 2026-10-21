import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

// A section of the officer dashboard, with a light blue title bar.
export default function DashboardPanel({
  title,
  icon: Icon,
  className = '',
  children,
}: {
  title: string
  icon: LucideIcon
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`overflow-hidden rounded-xl ${className}`}>
      <h2 className="flex items-center gap-3 rounded-t-xl bg-[#e6edfb] px-6 py-2 font-semibold text-brand-navy shadow-sm">
        <Icon size={18} aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  )
}
