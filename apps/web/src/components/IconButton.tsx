import type { LucideIcon } from 'lucide-react'

export default function IconButton({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-lg text-zinc-500 transition ${
        danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-brand-blue/10 hover:text-brand-blue'
      }`}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  )
}
