import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { hostelApi } from '../../shared/api/client'
import HostelCardMedia from '../../shared/components/HostelCardMedia'

function formatPrice(n) {
  if (typeof n !== 'number') return '—'
  return `LKR ${n.toLocaleString('en-LK', { maximumFractionDigits: 0 })}`
}

export default function Hostels() {
  const fallbackImages = ['/images/hostel-real-1.jpg', '/images/hostel-real-2.jpg', '/images/hostel-real-3.jpg']
  const [hostels, setHostels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError('')
        const data = await hostelApi.listHostels()
        if (!cancelled) setHostels(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load hostels')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const amenitiesFor = useMemo(() => {
    return hostels.reduce((acc, h) => {
      acc[h._id] = Array.isArray(h.amenities) ? h.amenities : []
      return acc
    }, {})
  }, [hostels])

  return (
    <div className="content-card">
      <h1 className="page-title">Our Hostels</h1>
      <p className="page-description">Browse available hostels and room options.</p>

      {loading && <p className="page-description">Loading...</p>}
      {error && (
        <p className="page-description" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="hostel-grid">
          {hostels.map((hostel, index) => (
            <article key={hostel._id} className="hostel-card group">
              <HostelCardMedia
                imageUrl={hostel.imageUrl}
                fallbackImage={fallbackImages[index % fallbackImages.length]}
                title={hostel.name}
              />

              <div className="hostel-card-body">
                <div className="hostel-card-grow">
                  <div className="hostel-card-header">
                    <h3 className="hostel-card-title">{hostel.name}</h3>
                    <span className="hostel-price">
                      {formatPrice(hostel.pricePerBed)}
                      {' / bed / month'}
                    </span>
                  </div>

                  <p className="hostel-location">
                    <svg className="hostel-location-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {hostel.location || '—'}
                  </p>

                  {hostel.description && <p className="hostel-description">{hostel.description}</p>}

                  {amenitiesFor[hostel._id]?.length > 0 && (
                    <div className="hostel-amenities">
                      {amenitiesFor[hostel._id].map((a) => (
                        <span key={a} className="hostel-amenity-tag">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="hostel-meta mt-1 shrink-0">{hostel.totalRooms} beds</p>
                <Link
                  to="/student/booking"
                  state={{ hostelId: hostel._id, hostelName: hostel.name }}
                  className="hostel-card-cta shrink-0"
                >
                  Book now
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && hostels.length === 0 && (
        <p className="page-description">No hostels found. Ask an admin to add them.</p>
      )}
    </div>
  )
}
