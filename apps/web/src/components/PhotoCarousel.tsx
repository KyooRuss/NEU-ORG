import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const arrowClass =
  'absolute top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-navy shadow ring-1 ring-zinc-200 transition hover:bg-white'

// How long each photo stays in front before the next one takes its place.
const SLIDE_MS = 3000

// The spot and size of a photo in each place, as parts of the carousel's square.
const places = {
  alone: { left: '0%', top: '0%', width: '100%', height: '100%', opacity: 1 },
  front: { left: '15%', top: '0%', width: '70%', height: '100%', opacity: 1 },
  left: { left: '0%', top: '25%', width: '50%', height: '50%', opacity: 0.4 },
  right: { left: '50%', top: '25%', width: '50%', height: '50%', opacity: 0.4 },
  hidden: { left: '25%', top: '25%', width: '50%', height: '50%', opacity: 0 },
}

// One photo in front, with the ones before and after it peeking out at the sides.
// It moves on by itself; clicking the front photo opens it larger.
export default function PhotoCarousel({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0)
  const [viewing, setViewing] = useState<string | null>(null)
  const several = photos.length > 1

  // Starts over whenever the photo changes, so a click on an arrow gets its full time too.
  // It waits while a photo is open.
  useEffect(() => {
    if (!several || viewing) return
    const timer = setTimeout(() => setIndex((value) => value + 1), SLIDE_MS)
    return () => clearTimeout(timer)
  }, [several, viewing, index])

  if (photos.length === 0) return <p className="text-sm text-zinc-400 italic">No photos yet</p>

  // The list can get shorter after an edit, so keep the position inside it.
  const current = index % photos.length
  const step = (by: number) => setIndex((current + by + photos.length) % photos.length)

  // Where a photo sits: in front, peeking out on one side, or tucked away behind the front one.
  const placeOf = (position: number): keyof typeof places => {
    if (position === current) return several ? 'front' : 'alone'
    if (position === (current + 1) % photos.length) return 'right'
    if (position === (current - 1 + photos.length) % photos.length) return 'left'
    return 'hidden'
  }

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-xs">
        {/* Every photo stays on the page and only changes place, so it glides there instead of jumping. */}
        {photos.map((photo, position) => {
          const place = placeOf(position)
          const inFront = place === 'front' || place === 'alone'
          return (
            <button
              key={photo}
              type="button"
              onClick={() => (inFront ? setViewing(photo) : setIndex(position))}
              title={inFront ? 'View the photo' : undefined}
              tabIndex={inFront ? 0 : -1}
              aria-hidden={!inFront}
              style={places[place]}
              className={`absolute overflow-hidden rounded-xl bg-field transition-all duration-700 ease-in-out motion-reduce:transition-none ${
                inFront ? 'z-10 cursor-zoom-in shadow-lg ring-1 ring-zinc-200' : 'z-0'
              } ${place === 'hidden' ? 'pointer-events-none' : ''}`}
            >
              <img
                src={photo}
                alt={inFront ? `Event photo ${position + 1} of ${photos.length}` : ''}
                className="size-full object-cover"
              />
            </button>
          )
        })}
        {several && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className={`${arrowClass} left-0`}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next photo" className={`${arrowClass} right-0`}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {several && (
        <div className="mt-4 flex justify-center gap-1.5">
          {photos.map((photo, position) => (
            <button
              key={photo}
              type="button"
              onClick={() => setIndex(position)}
              aria-label={`Show photo ${position + 1}`}
              aria-current={position === current}
              className={`size-2 rounded-full transition ${
                position === current ? 'bg-brand-blue' : 'bg-zinc-300 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>
      )}

      {viewing && <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

// The photo on its own over the page. The X, the Escape key or a click outside closes it.
function PhotoViewer({ photo, onClose }: { photo: string; onClose: () => void }) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    // Stop the page behind the photo from scrolling.
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Event photo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow transition hover:bg-white"
      >
        <X size={20} aria-hidden="true" />
      </button>
      <img src={photo} alt="Event photo" className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
    </div>
  )
}
