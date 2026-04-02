import { useEffect, useMemo, useState } from 'react'

/** Public path from API (e.g. /uploads/hostels/...) or absolute URL. */
export function hostelPhotoSrc(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null
  const t = imageUrl.trim()
  if (!t) return null
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  return t.startsWith('/') ? t : `/${t}`
}

export default function HostelCardMedia({ imageUrl, title, fallbackImage }) {
  const primarySrc = hostelPhotoSrc(imageUrl)
  const fallbackSrc = hostelPhotoSrc(fallbackImage)
  const candidates = useMemo(
    () => [primarySrc, fallbackSrc].filter(Boolean),
    [primarySrc, fallbackSrc]
  )
  const [srcIndex, setSrcIndex] = useState(0)

  useEffect(() => {
    setSrcIndex(0)
  }, [primarySrc, fallbackSrc])

  const src = candidates[srcIndex] || null
  const alt = title ? `${title} photo` : 'Hostel photo'

  function handleError() {
    setSrcIndex((prev) => prev + 1)
  }

  return (
    <div className="hostel-card-image">
      {src ? (
        <img src={src} alt={alt} className="hostel-card-image-photo" loading="lazy" onError={handleError} />
      ) : (
        <svg className="hostel-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      )}
    </div>
  )
}
