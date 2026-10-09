import { Check, X } from 'lucide-react'

// Green with a check while on, red with a cross while off. The page decides what
// a click does (usually it asks to confirm first).
export default function StatusSwitch({
  on,
  label,
  onToggle,
}: {
  on: boolean
  // What a click will do, e.g. "Suspend Maria Santos". Read out and shown as the tooltip.
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
      onClick={onToggle}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue/40 focus-visible:outline-none ${
        on ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 flex size-4 items-center justify-center rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-4 text-emerald-500' : 'translate-x-0 text-rose-500'
        }`}
      >
        {on ? <Check size={10} strokeWidth={3.5} aria-hidden="true" /> : <X size={10} strokeWidth={3.5} aria-hidden="true" />}
      </span>
    </button>
  )
}
