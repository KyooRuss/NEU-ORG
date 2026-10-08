import type { LucideIcon } from 'lucide-react'

export default function IconButton({
  icon: Icon,
  label,
  onClick,
  danger = false,
  colored = false,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  danger?: boolean
  // Show the icon in blue (or red, with danger) all the time, not only on hover.
  colored?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-lg transition ${colored ? '' : 'text-zinc-500'} ${
        danger
          ? `hover:bg-red-50 hover:text-red-600 ${colored ? 'text-red-600' : ''}`
          : `hover:bg-brand-blue/10 hover:text-brand-blue ${colored ? 'text-brand-blue' : ''}`
      }`}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  )
}
