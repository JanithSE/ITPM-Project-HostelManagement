import { useEffect, useState } from 'react'
import { apiFetch } from '../../shared/api/client'

function statusPillStyle(statusRaw) {
  const s = String(statusRaw || '').toLowerCase()
  if (s === 'confirmed') {
    return {
      background: 'rgba(52, 211, 153, 0.14)',
      border: '1px solid rgba(52, 211, 153, 0.35)',
      color: '#34d399',
    }
  }
  if (s === 'cancelled') {
    return {
      background: 'rgba(248, 113, 113, 0.14)',
      border: '1px solid rgba(248, 113, 113, 0.35)',
      color: '#f87171',
    }
  }
  return {
    background: 'rgba(251, 191, 36, 0.14)',
    border: '1px solid rgba(251, 191, 36, 0.35)',
    color: '#fbbf24',
  }
}

function sanitizeBookingSearchInput(value) {
  const s = String(value ?? '')
  try {
    return s.replace(/[^\p{L}\p{N}\s]/gu, '')
  } catch {
    return s.replace(/[^a-zA-Z0-9\s]/g, '')
  }
}

export default function Booking() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusDrafts, setStatusDrafts] = useState({})
  const [savingId, setSavingId] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadAllBookings() {
      try {
        setLoading(true)
        setError('')
        const list = await apiFetch('/bookings')
        if (!cancelled) {
          const arr = Array.isArray(list) ? list : []
          setRows(arr)
          const nextDrafts = {}
          for (const b of arr) {
            const id = String(b?._id || '')
            if (!id) continue
            nextDrafts[id] = String(b?.status || 'pending').toLowerCase()
          }
          setStatusDrafts(nextDrafts)
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load bookings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadAllBookings()
    return () => { cancelled = true }
  }, [])

  const q = search.trim().toLowerCase()
  const filteredRows = q
    ? rows.filter((b) => {
        const fields = [
          b?._id,
          b?.student?.name,
          b?.student?.email,
          b?.hostel?.name,
          b?.roomNumber,
          b?.bedNumber,
          b?.status,
        ]
        return fields
          .filter(Boolean)
          .map((x) => String(x).toLowerCase())
          .some((v) => v.includes(q))
      })
    : rows

  const handleUpdateStatus = async (booking) => {
    const id = String(booking?._id || '')
    if (!id) return
    const nextStatus = String(statusDrafts[id] || booking?.status || '').toLowerCase()
    if (!['pending', 'confirmed', 'cancelled'].includes(nextStatus)) return
    if (nextStatus === String(booking?.status || '').toLowerCase()) return
    setSavingId(id)
    try {
      const updated = await apiFetch(`/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      setRows((prev) =>
        prev.map((row) => (String(row?._id || '') === id ? { ...row, ...updated } : row)),
      )
    } catch (err) {
      setError(err?.message || 'Failed to update booking status')
    } finally {
      setSavingId('')
    }
  }

  return (
    <div className="content-card">
      <h1 className="page-title mb-2">Booking</h1>
      <p className="page-description mb-4">
        {loading ? 'Loading bookings...' : `${filteredRows.length} bookings found`}
      </p>
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          value={search}
          onChange={(e) => setSearch(sanitizeBookingSearchInput(e.target.value))}
          placeholder="Search by ID, student, hostel, room, bed, status..."
          className="auth-input max-w-xl"
          style={{ minWidth: 320, color: 'inherit' }}
        />
        {search ? (
          <button
            type="button"
            className="btn-table-secondary"
            onClick={() => setSearch('')}
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Student</th>
              <th>Hostel</th>
              <th>Room</th>
              <th>Bed</th>
              <th>Status</th>
              <th>Booked On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8}>Loading...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} style={{ color: '#dc2626' }}>{error}</td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8}>No matching bookings found.</td>
              </tr>
            ) : (
              filteredRows.map((b) => (
                <tr key={b?._id || `${b?.student?._id || b?.student}-${b?.roomNumber}-${b?.bedNumber}`}>
                  <td>{b?._id || '—'}</td>
                  <td>
                    {b?.student?.name || '—'}
                    {b?.student?.email ? <div style={{ fontSize: 12, opacity: 0.75 }}>{b.student.email}</div> : null}
                  </td>
                  <td>{b?.hostel?.name || '—'}</td>
                  <td>{b?.roomNumber || '—'}</td>
                  <td>{b?.bedNumber || '—'}</td>
                  <td>
                    <span
                      style={{
                        ...statusPillStyle(b?.status),
                        display: 'inline-block',
                        borderRadius: 999,
                        padding: '3px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.4,
                        textTransform: 'capitalize',
                      }}
                    >
                      {b?.status || '—'}
                    </span>
                  </td>
                  <td>{b?.createdAt ? new Date(b.createdAt).toLocaleString() : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        className="auth-input"
                        style={{ minWidth: 120, padding: '6px 10px', fontSize: 12 }}
                        value={statusDrafts[String(b?._id || '')] ?? String(b?.status || 'pending').toLowerCase()}
                        onChange={(e) => {
                          const id = String(b?._id || '')
                          const v = String(e.target.value || 'pending').toLowerCase()
                          setStatusDrafts((prev) => ({ ...prev, [id]: v }))
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button
                        type="button"
                        className="btn-table-primary"
                        style={{ padding: '6px 10px', fontSize: 12 }}
                        disabled={savingId === String(b?._id || '')}
                        onClick={() => handleUpdateStatus(b)}
                      >
                        {savingId === String(b?._id || '') ? 'Saving...' : 'Update'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
