import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const arrowClass =
  'absolute top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-navy shadow ring-1 ring-zinc-200 transition hover:bg-white'

// One photo in front, with the ones before and after it peeking out at the sides.
export default function PhotoCarousel({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0)

  if (photos.length === 0) return <p className="text-sm text-zinc-400 italic">No photos yet</p>

  // The list can get shorter after an edit, so keep the position inside it.
  const current = index % photos.length
  const step = (by: number) => setIndex((current + by + photos.length) % photos.length)
  const previous = photos[(current - 1 + photos.length) % photos.length]
  const next = photos[(current + 1) % photos.length]
  const several = photos.length > 1

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-xs">
        {several && (
          <>
            <img
              src={previous}
              alt=""
              className="absolute top-1/2 left-0 z-0 size-1/2 -translate-y-1/2 rounded-xl object-cover opacity-40"
            />
            <img
              src={next}
              alt=""
              className="absolute top-1/2 right-0 z-0 size-1/2 -translate-y-1/2 rounded-xl object-cover opacity-40"
            />
          </>
        )}
        <a
          href={photos[current]}
          target="_blank"
          rel="noreferrer"
          title="Open the full photo"
          className={`absolute inset-y-0 z-10 overflow-hidden rounded-xl bg-field shadow-lg ring-1 ring-zinc-200 ${
            several ? 'inset-x-[15%]' : 'inset-x-0'
          }`}
        >
          <img
            src={photos[current]}
            alt={`Event photo ${current + 1} of ${photos.length}`}
            className="size-full object-cover"
          />
        </a>
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
    </div>
  )
}
