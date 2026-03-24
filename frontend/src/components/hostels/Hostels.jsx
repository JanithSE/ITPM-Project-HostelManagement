import { useEffect, useMemo, useState } from 'react'
import { hostelApi } from '../../shared/api/client'

function formatPrice(n) {
  if (typeof n !== 'number') return '—'
  return `LKR ${n.toLocaleString('en-LK', { maximumFractionDigits: 0 })}`
}

export default function Hostels() {
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
          {hostels.map((hostel) => (
            <article key={hostel._id} className="hostel-card">
              <div className="hostel-card-image">
                <svg className="hostel-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>

              <div className="hostel-card-body">
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

                <p className="hostel-meta">{hostel.totalRooms} beds</p>
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
