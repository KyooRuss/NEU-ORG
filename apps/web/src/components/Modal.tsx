import { X } from 'lucide-react'
import { type ReactNode, useEffect, useId } from 'react'

type ModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'lg' | 'xl'
  // Center the title in the header instead of starting it on the left.
  centerTitle?: boolean
}

const sizes = { sm: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-6xl' }

export default function Modal({ title, onClose, children, footer, size = 'lg', centerTitle = false }: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    // Stop the page behind the modal from scrolling.
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[90vh] w-full flex-col rounded-xl bg-white shadow-2xl ${sizes[size]}`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
          {/* A blank space as wide as the close button keeps a centered title truly centered. */}
          {centerTitle && <span className="size-8 shrink-0" aria-hidden="true" />}
          <h2 id={titleId} className={`font-semibold text-brand-navy ${centerTitle ? 'flex-1 text-center' : ''}`}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  )
}

export const secondaryButton =
  'rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50'
export const primaryButton =
  'rounded-full bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-navy disabled:opacity-50'
export const dangerButton =
  'rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50'
