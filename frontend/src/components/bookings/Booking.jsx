import { useEffect, useState } from 'react'
import { bookingApi } from '../../shared/api/client'

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export default function Booking() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  async function loadBookings() {
    try {
      setLoading(true)
      setError('')
      const data = await bookingApi.list()
      setBookings(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  async function handleApprove(id) {
    try {
      setBusyId(id)
      setError('')
      await bookingApi.approve(id)
      await loadBookings()
    } catch (e) {
      setError(e.message || 'Failed to approve booking')
    } finally {
      setBusyId('')
    }
  }

  async function handleReject(id) {
    try {
      setBusyId(id)
      setError('')
      await bookingApi.reject(id)
      await loadBookings()
    } catch (e) {
      setError(e.message || 'Failed to reject booking')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="content-card">
      <h1 className="page-title mb-4">Booking</h1>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {loading && <p className="page-description">Loading booking requests...</p>}
      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Student</th>
              <th>Hostel / Room</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && bookings.length === 0 && (
              <tr>
                <td colSpan={6}>No booking requests found.</td>
              </tr>
            )}
            {bookings.map((b) => (
              <tr key={b._id}>
                <td>{String(b._id || '').slice(-6).toUpperCase()}</td>
                <td>{b.student?.name || b.student?.email || '—'}</td>
                <td>
                  <div>{b.hostel?.name || '—'}</div>
                  <div className="text-xs opacity-70">Room {b.roomNumber || '—'} / Bed {b.bedNumber || '—'}</div>
                </td>
                <td>{formatDate(b.fromDate)}</td>
                <td>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : b.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                    {b.status}
                  </span>
                </td>
                <td>
                  {b.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button type="button" className="table-action-link" disabled={busyId === b._id} onClick={() => handleApprove(b._id)}>
                        {busyId === b._id ? 'Working...' : 'Approve'}
                      </button>
                      <button type="button" className="table-action-link" disabled={busyId === b._id} onClick={() => handleReject(b._id)}>
                        Reject
                      </button>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
