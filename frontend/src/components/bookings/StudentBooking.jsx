import { useEffect, useMemo, useState } from 'react'
import { bookingApi, roomApi } from '../../shared/api/client'

function formatRoomLabel(room) {
  const rn = String(room.roomNumber || '').trim()
  if (/^[A-Za-z]/.test(rn)) return rn.toUpperCase()
  const block = String(room.block || 'A').toUpperCase()
  return `${block}${rn}`
}

function getBlock(room) {
  const rn = String(room.roomNumber || '').trim()
  const letter = rn.match(/^[A-Za-z]/)?.[0]
  if (letter) return letter.toUpperCase()
  const hostelName = String(room.hostel?.name || '')
  return hostelName.match(/[A-Za-z]/)?.[0]?.toUpperCase() || 'A'
}

function toUiRooms(details) {
  return (Array.isArray(details) ? details : []).map((r) => {
    const capacity = Array.isArray(r.beds) ? r.beds.length : 0
    const occupied = Array.isArray(r.beds)
      ? r.beds.filter((b) => String(b.status).toLowerCase() === 'occupied').length
      : 0
    return {
      ...r,
      block: getBlock(r),
      capacity,
      occupied,
      available: occupied < capacity,
      status: occupied < capacity ? 'Available' : 'Full',
    }
  })
}

export default function StudentBooking() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedRoom, setSelectedRoom] = useState(null)

  const [blockFilter, setBlockFilter] = useState('all')
  const [capacityFilter, setCapacityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('Available')

  const [date, setDate] = useState('')
  const [note, setNote] = useState('')

  const studentName = localStorage.getItem('studentName') || 'Current Student'

  async function loadRooms() {
    try {
      setLoading(true)
      setError('')
      const details = await roomApi.listDetails({ statusesToCount: 'pending,confirmed' })
      setRooms(toUiRooms(details))
    } catch (e) {
      setError(e.message || 'Failed to load rooms')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRooms()
  }, [])

  const blocks = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.block))).sort(),
    [rooms],
  )

  const capacities = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.capacity))).sort((a, b) => a - b),
    [rooms],
  )

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (blockFilter !== 'all' && r.block !== blockFilter) return false
      if (capacityFilter !== 'all' && String(r.capacity) !== capacityFilter) return false
      if (statusFilter === 'Available' && !r.available) return false
      if (statusFilter === 'Full' && r.available) return false
      return true
    })
  }, [rooms, blockFilter, capacityFilter, statusFilter])

  async function handleConfirmBooking(e) {
    e.preventDefault()
    if (!selectedRoom) return
    try {
      setSubmitting(true)
      setError('')
      setSuccess('')
      await bookingApi.create({
        hostel: selectedRoom.hostel?._id,
        roomNumber: selectedRoom.roomNumber,
        fromDate: date || undefined,
        toDate: date || undefined,
        note: note || undefined,
      })
      setSuccess('Booking Request Sent')
      setSelectedRoom(null)
      setDate('')
      setNote('')
      await loadRooms()
    } catch (e2) {
      setError(e2.message || 'Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="content-card">
      <h1 className="page-title">Room Booking</h1>
      <p className="page-description">Choose an available room and send your booking request.</p>

      {error && <p className="auth-error" role="alert">{error}</p>}
      {success && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <select value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)} className="auth-input">
          <option value="all">All Blocks</option>
          {blocks.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={capacityFilter} onChange={(e) => setCapacityFilter(e.target.value)} className="auth-input">
          <option value="all">All Capacities</option>
          {capacities.map((c) => <option key={c} value={String(c)}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="auth-input">
          <option value="Available">Available</option>
          <option value="Full">Full</option>
          <option value="All">All</option>
        </select>
      </div>

      {loading ? (
        <p className="page-description">Loading rooms...</p>
      ) : filteredRooms.length === 0 ? (
        <p className="page-description">No rooms available for selected filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => (
            <article key={`${room.hostel?._id}-${room.roomNumber}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Room {formatRoomLabel(room)}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${room.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {room.status}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Block: {room.block} Block</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Capacity: {room.capacity}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Occupancy: {room.occupied}/{room.capacity}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Price: Rs.{Number(room.hostel?.pricePerBed || 0).toLocaleString()}
              </p>
              <button
                type="button"
                disabled={!room.available}
                onClick={() => setSelectedRoom(room)}
                className={`mt-3 w-full rounded-full px-4 py-2 text-sm font-semibold ${room.available ? 'bg-primary-600 text-white hover:bg-primary-700' : 'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
              >
                {room.available ? 'Book Now' : 'Full'}
              </button>
            </article>
          ))}
        </div>
      )}

      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">Confirm Booking</h2>
            <form onSubmit={handleConfirmBooking} className="space-y-3">
              <div>
                <label className="auth-label">Selected Room</label>
                <input className="auth-input" readOnly value={`Room ${formatRoomLabel(selectedRoom)}`} />
              </div>
              <div>
                <label className="auth-label">Student Name</label>
                <input className="auth-input" readOnly value={studentName} />
              </div>
              <div>
                <label className="auth-label">Date</label>
                <input className="auth-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div>
                <label className="auth-label">Optional Note</label>
                <textarea className="auth-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="mt-4 flex gap-2">
                <button type="submit" disabled={submitting} className="btn-table-primary flex-1">
                  {submitting ? 'Submitting...' : 'Confirm Booking'}
                </button>
                <button type="button" onClick={() => setSelectedRoom(null)} className="btn-table-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
