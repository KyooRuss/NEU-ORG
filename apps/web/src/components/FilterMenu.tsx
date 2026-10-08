import { Check, Filter } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'

// A round filter button that opens a menu of choices. It turns blue while a filter is on.
export default function FilterMenu({
  label,
  active,
  closeOnSelect = false,
  children,
}: {
  // Read out for the button and shown as its tooltip.
  label: string
  active: boolean
  // Close as soon as an option is picked. Leave off when the menu has several choices to make.
  closeOnSelect?: boolean
  // FilterSection and FilterOption items.
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  // Close the menu on a click outside it or on Escape.
  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex size-9 items-center justify-center rounded-full transition ${
          active ? 'bg-brand-blue text-white hover:bg-brand-navy' : 'bg-field text-zinc-600 hover:bg-zinc-200'
        }`}
      >
        <Filter size={16} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          onClick={(event) => {
            if (closeOnSelect && (event.target as Element).closest('[role="menuitemradio"]')) setOpen(false)
          }}
          className="absolute right-0 z-20 mt-2 max-h-96 w-72 overflow-y-auto rounded-xl bg-white p-2 shadow-lg ring-1 ring-zinc-200"
        >
          {children}
        </div>
      )}
    </div>
  )
}

// A titled group of options. Every group after the first gets a divider above it.
export function FilterSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="border-zinc-100 not-first:mt-2 not-first:border-t not-first:pt-2">
      {title && (
        <p className="px-3 pt-1 pb-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">{title}</p>
      )}
      {children}
    </div>
  )
}

export function FilterOption({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface ${
        selected ? 'font-semibold text-brand-navy' : 'text-zinc-700'
      }`}
    >
      <span className="flex-1">{label}</span>
      {selected && <Check size={16} className="shrink-0 text-brand-blue" aria-hidden="true" />}
    </button>
  )
}
