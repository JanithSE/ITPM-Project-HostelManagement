import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { bookingApi } from '../../shared/api/client'

const DOC_META = [
  ['nic', 'NIC'],
  ['studentId', 'Student ID'],
  ['medicalReport', 'Medical Report'],
  ['policeReport', 'Police Report'],
  ['guardianLetter', 'Guardian Letter'],
  ['recommendationLetter', 'Recommendation Letter'],
]

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function monthValue(d) {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${m}`
}

export default function Booking() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingBookingId, setEditingBookingId] = useState('')
  const [viewBooking, setViewBooking] = useState(null)
  const [docBusyKey, setDocBusyKey] = useState('')
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState('excel')
  const [exportRange, setExportRange] = useState('week')
  const [exportDateField, setExportDateField] = useState('createdAt')
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState('')
  const [editForm, setEditForm] = useState({
    status: 'pending',
    fromDate: '',
    toDate: '',
    note: '',
  })

  async function loadBookings() {
    try {
      setLoading(true)
      setError('')
      const data = await bookingApi.list()
      setBookings(Array.isArray(data) ? data : [])
    } catch (e) {
      const msg = e.message || 'Failed to load bookings'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  const counts = useMemo(() => {
    return bookings.reduce(
      (acc, b) => {
        const s = b.status
        if (s === 'pending') acc.pending += 1
        else if (s === 'confirmed') acc.confirmed += 1
        else if (s === 'rejected') acc.rejected += 1
        else if (s === 'cancelled') acc.cancelled += 1
        return acc
      },
      { pending: 0, confirmed: 0, rejected: 0, cancelled: 0 },
    )
  }, [bookings])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return bookings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false
      if (monthFilter !== 'all') {
        const fromMonth = monthValue(b.fromDate)
        const toMonth = monthValue(b.toDate)
        if (fromMonth !== monthFilter && toMonth !== monthFilter) return false
      }
      if (!q) return true

      const shortId = String(b._id || '').slice(-6).toLowerCase()
      const student = String(b.student?.name || b.student?.email || '').toLowerCase()
      const hostelRoom = `${String(b.hostel?.name || '')} ${String(b.roomNumber || '')} ${String(b.bedNumber || '')}`.toLowerCase()
      const stay = `${formatDate(b.fromDate)} ${formatDate(b.toDate)}`
        .toLowerCase()
        .replaceAll('—', '')

      return (
        shortId.includes(q) ||
        student.includes(q) ||
        hostelRoom.includes(q) ||
        stay.includes(q)
      )
    })
  }, [bookings, statusFilter, monthFilter, searchQuery])

  const monthOptions = useMemo(() => {
    const set = new Set()
    bookings.forEach((b) => {
      const fm = monthValue(b.fromDate)
      const tm = monthValue(b.toDate)
      if (fm) set.add(fm)
      if (tm) set.add(tm)
    })
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [bookings])

  async function handleApprove(id) {
    try {
      setBusyId(id)
      setError('')
      await bookingApi.approve(id)
      toast.success('Booking approved')
      await loadBookings()
    } catch (e) {
      const msg = e.message || 'Failed to approve booking'
      setError(msg)
      toast.error(msg)
    } finally {
      setBusyId('')
    }
  }

  async function handleReject(id) {
    const rejectionReason = window.prompt('Enter rejection reason (required):', '')
    if (rejectionReason == null) return
    const reason = rejectionReason.trim()
    if (!reason) {
      toast.error('Rejection reason is required')
      return
    }
    const missingRaw = window.prompt(
      'Missing documents (optional): comma-separated keys (nic, studentId, medicalReport, policeReport, guardianLetter, recommendationLetter)',
      '',
    )
    const allowed = new Set(['nic', 'studentId', 'medicalReport', 'policeReport', 'guardianLetter', 'recommendationLetter'])
    const missingDocuments = String(missingRaw || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => allowed.has(s))

    try {
      setBusyId(id)
      setError('')
      await bookingApi.reject(id, { rejectionReason: reason, missingDocuments })
      toast.success('Booking rejected')
      await loadBookings()
    } catch (e) {
      const msg = e.message || 'Failed to reject booking'
      setError(msg)
      toast.error(msg)
    } finally {
      setBusyId('')
    }
  }

  async function handleDelete(id) {
    const ok = window.confirm('Delete this booking permanently?')
    if (!ok) return
    try {
      setBusyId(id)
      setError('')
      await bookingApi.delete(id)
      toast.success('Booking deleted')
      await loadBookings()
    } catch (e) {
      const msg = e.message || 'Failed to delete booking'
      setError(msg)
      toast.error(msg)
    } finally {
      setBusyId('')
    }
  }

  function openEditModal(booking) {
    setEditingBookingId(booking._id)
    setEditForm({
      status: booking.status || 'pending',
      fromDate: booking.fromDate ? new Date(booking.fromDate).toISOString().slice(0, 10) : '',
      toDate: booking.toDate ? new Date(booking.toDate).toISOString().slice(0, 10) : '',
      note: booking.note || '',
    })
    setEditModalOpen(true)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editingBookingId) return
    try {
      setBusyId(editingBookingId)
      setError('')
      await bookingApi.update(editingBookingId, {
        status: editForm.status,
        fromDate: editForm.fromDate || undefined,
        toDate: editForm.toDate || undefined,
        note: editForm.note.trim() || undefined,
      })
      toast.success('Booking updated')
      setEditModalOpen(false)
      setEditingBookingId('')
      await loadBookings()
    } catch (e2) {
      const msg = e2.message || 'Failed to update booking'
      setError(msg)
      toast.error(msg)
    } finally {
      setBusyId('')
    }
  }

  function openExportModal() {
    setExportError('')
    setIsExportModalOpen(true)
  }

  function closeExportModal() {
    if (exportLoading) return
    setIsExportModalOpen(false)
    setExportError('')
  }

  async function handleExportSubmit(e) {
    e.preventDefault()
    setExportError('')
    if (exportRange === 'custom') {
      if (!exportFrom || !exportTo) {
        const msg = 'Please select both From and To dates'
        setExportError(msg)
        toast.error(msg)
        return
      }
      if (new Date(exportFrom) > new Date(exportTo)) {
        const msg = 'From date cannot be after To date'
        setExportError(msg)
        toast.error(msg)
        return
      }
    }
    try {
      setExportLoading(true)
      const result = await bookingApi.export({
        type: exportFormat,
        range: exportRange,
        dateField: exportDateField,
        from: exportRange === 'custom' ? exportFrom : undefined,
        to: exportRange === 'custom' ? exportTo : undefined,
      })

      const blobUrl = URL.createObjectURL(result.blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)

      toast.success('Export started')
      setIsExportModalOpen(false)
    } catch (err) {
      const msg = err.message || 'Failed to export bookings'
      setExportError(msg)
      toast.error(msg)
    } finally {
      setExportLoading(false)
    }
  }

  async function reviewDocument(documentKey, status) {
    if (!viewBooking?._id) return
    let note = ''
    if (status === 'rejected') {
      const entered = window.prompt(`Enter rejection reason for ${documentKey}:`, '')
      if (entered == null) return
      note = entered.trim()
      if (!note) {
        toast.error('Rejection reason is required')
        return
      }
    }
    const busyKey = `${viewBooking._id}-${documentKey}-${status}`
    try {
      setDocBusyKey(busyKey)
      const updated = await bookingApi.reviewDocument(viewBooking._id, documentKey, status, note)
      setViewBooking(updated)
      setBookings((prev) => prev.map((b) => (b._id === updated._id ? updated : b)))
      toast.success(`Document ${status}`)
    } catch (e) {
      toast.error(e.message || 'Failed to review document')
    } finally {
      setDocBusyKey('')
    }
  }

  return (
    <div className="content-card">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="page-title mb-0">Bookings</h1>
          <button type="button" onClick={loadBookings} className="btn-table-secondary shrink-0">
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-start gap-4 lg:justify-end">
          <div className="text-center">
            <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-blue-300/80 bg-white text-blue-600 shadow-sm dark:border-blue-700/60 dark:bg-slate-900 dark:text-blue-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
              </svg>
            </div>
            <p className="text-2xl font-bold leading-none text-slate-900 dark:text-slate-100">{bookings.length}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Total Bookings</p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-emerald-300/80 bg-white text-emerald-600 shadow-sm dark:border-emerald-700/60 dark:bg-slate-900 dark:text-emerald-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-2xl font-bold leading-none text-slate-900 dark:text-slate-100">{counts.confirmed}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Approved</p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-amber-300/80 bg-white text-amber-600 shadow-sm dark:border-amber-700/60 dark:bg-slate-900 dark:text-amber-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v5l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold leading-none text-slate-900 dark:text-slate-100">{counts.pending}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Pending</p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-red-300/80 bg-white text-red-600 shadow-sm dark:border-red-700/60 dark:bg-slate-900 dark:text-red-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-2xl font-bold leading-none text-slate-900 dark:text-slate-100">{counts.rejected}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Rejected</p>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="auth-input rounded-full"
          placeholder="Search by ID, student, hostel/room, stay..."
          aria-label="Search bookings"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="auth-input min-w-[150px] rounded-full"
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="auth-input min-w-[150px] rounded-full"
          aria-label="Filter by month"
        >
          <option value="all">All Months</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {new Date(`${m}-01`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </option>
          ))}
        </select>
        <button type="button" onClick={openExportModal} className="btn-table-secondary rounded-full px-5">
          Export
        </button>
      </div>
      <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Showing {filtered.length} booking{filtered.length === 1 ? '' : 's'}
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}
      {loading && <p className="page-description">Loading booking requests…</p>}
      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student</th>
              <th>Hostel / room</th>
              <th>Stay</th>
              <th>Note</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7}>No bookings in this view.</td>
              </tr>
            )}
            {filtered.map((b) => (
              <tr key={b._id}>
                <td className="font-mono text-xs">{String(b._id || '').slice(-6).toUpperCase()}</td>
                <td>{b.student?.name || b.student?.email || '—'}</td>
                <td>
                  <div>{b.hostel?.name || '—'}</div>
                  <div className="text-xs opacity-70">
                    Room {b.roomNumber || '—'} / Bed {b.bedNumber || '—'}
                  </div>
                </td>
                <td className="text-sm">
                  <div>{formatDate(b.fromDate)}</div>
                  {b.toDate && formatDate(b.toDate) !== formatDate(b.fromDate) ? (
                    <div className="text-xs opacity-70">to {formatDate(b.toDate)}</div>
                  ) : null}
                </td>
                <td className="max-w-[12rem] truncate text-sm" title={b.note || ''}>
                  {b.note || '—'}
                </td>
                <td>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      b.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : b.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : b.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {b.status}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="table-action-link"
                      onClick={() => setViewBooking(b)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      disabled={busyId === b._id || b.status !== 'pending'}
                      className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                      onClick={() => handleApprove(b._id)}
                    >
                      {busyId === b._id ? 'Working…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === b._id || b.status !== 'pending'}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
                      onClick={() => handleReject(b._id)}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={busyId === b._id}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      onClick={() => openEditModal(b)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busyId === b._id}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
                      onClick={() => handleDelete(b._id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">Edit Booking</h2>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="auth-label">Status</label>
                <select
                  className="auth-input"
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="pending">pending</option>
                  <option value="confirmed">confirmed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="auth-label">From date</label>
                  <input
                    type="date"
                    className="auth-input"
                    value={editForm.fromDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, fromDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="auth-label">To date</label>
                  <input
                    type="date"
                    className="auth-input"
                    min={editForm.fromDate || undefined}
                    value={editForm.toDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, toDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="auth-label">Note</label>
                <textarea
                  rows={3}
                  className="auth-input"
                  value={editForm.note}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={busyId === editingBookingId} className="btn-table-primary flex-1">
                  {busyId === editingBookingId ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className="btn-table-secondary flex-1"
                  onClick={() => {
                    setEditModalOpen(false)
                    setEditingBookingId('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Booking Details</h2>
              <button type="button" className="btn-table-secondary" onClick={() => setViewBooking(null)}>Close</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <p><span className="font-semibold">Student:</span> {viewBooking.studentName || viewBooking.student?.name || '—'}</p>
              <p><span className="font-semibold">Email:</span> {viewBooking.email || viewBooking.student?.email || '—'}</p>
              <p><span className="font-semibold">Contact:</span> {viewBooking.contactNumber || '—'}</p>
              <p><span className="font-semibold">Gender:</span> {viewBooking.gender || '—'}</p>
              <p><span className="font-semibold">DOB:</span> {formatDate(viewBooking.dateOfBirth)}</p>
              <p><span className="font-semibold">Institute:</span> {viewBooking.instituteName || '—'}</p>
              <p><span className="font-semibold">Course:</span> {viewBooking.courseProgram || '—'}</p>
              <p><span className="font-semibold">Emergency:</span> {viewBooking.emergencyContactName || '—'} ({viewBooking.emergencyContactNumber || '—'})</p>
              <p><span className="font-semibold">Hostel / Room:</span> {viewBooking.hostel?.name || '—'} / {viewBooking.roomNumber || '—'}</p>
              <p><span className="font-semibold">Stay:</span> {formatDate(viewBooking.fromDate)} to {formatDate(viewBooking.toDate)}</p>
              <p><span className="font-semibold">Occupants:</span> {viewBooking.occupantsCount || '—'}</p>
              <p><span className="font-semibold">Status:</span> {viewBooking.status}</p>
            </div>
            <div className="mt-3 text-sm">
              <p><span className="font-semibold">Address:</span> {viewBooking.address || '—'}</p>
              <p><span className="font-semibold">Special requests:</span> {viewBooking.specialRequests || viewBooking.note || '—'}</p>
              {viewBooking.rejectionReason ? (
                <p><span className="font-semibold">Rejection reason:</span> {viewBooking.rejectionReason}</p>
              ) : null}
              {Array.isArray(viewBooking.missingDocuments) && viewBooking.missingDocuments.length ? (
                <p><span className="font-semibold">Missing documents:</span> {viewBooking.missingDocuments.join(', ')}</p>
              ) : null}
            </div>
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Uploaded Documents</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {DOC_META.map(([key, label]) => {
                  const url = viewBooking.documents?.[key]
                  const review = viewBooking.documentReviews?.[key]
                  const reviewStatus = review?.status || (url ? 'pending' : 'not_uploaded')
                  return (
                  <div key={key} className="rounded border border-slate-200 px-3 py-2 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>
                    {!url ? (
                      <p className="text-xs text-slate-400">Not provided</p>
                    ) : (
                      <div className="space-y-1.5">
                        <a href={url} target="_blank" rel="noreferrer" className="inline-block text-xs text-primary-600 underline">View document</a>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              reviewStatus === 'approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : reviewStatus === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {reviewStatus}
                          </span>
                          <button
                            type="button"
                            disabled={docBusyKey === `${viewBooking._id}-${key}-approved`}
                            onClick={() => reviewDocument(key, 'approved')}
                            className="rounded-full border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-950/20"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={docBusyKey === `${viewBooking._id}-${key}-rejected`}
                            onClick={() => reviewDocument(key, 'rejected')}
                            className="rounded-full border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/20"
                          >
                            Reject
                          </button>
                        </div>
                        {review?.note ? (
                          <p className="text-[11px] text-red-600 dark:text-red-300">Reason: {review.note}</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">Export bookings</h2>
            <form onSubmit={handleExportSubmit} className="space-y-3">
              <div>
                <label className="auth-label">Format</label>
                <select
                  className="auth-input"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                >
                  <option value="excel">Export as Excel (.xlsx)</option>
                  <option value="pdf">Export as PDF (.pdf)</option>
                </select>
              </div>

              <div>
                <label className="auth-label">Filter by date field</label>
                <select
                  className="auth-input"
                  value={exportDateField}
                  onChange={(e) => setExportDateField(e.target.value)}
                >
                  <option value="createdAt">Booking created date</option>
                  <option value="fromDate">Stay start date</option>
                </select>
              </div>

              <div>
                <label className="auth-label">Date range</label>
                <select
                  className="auth-input"
                  value={exportRange}
                  onChange={(e) => setExportRange(e.target.value)}
                >
                  <option value="day">Last 1 day</option>
                  <option value="week">Last 1 week</option>
                  <option value="month">Last 1 month</option>
                  <option value="custom">Custom date range</option>
                </select>
              </div>

              {exportRange === 'custom' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="auth-label">From date</label>
                    <input
                      type="date"
                      className="auth-input"
                      value={exportFrom}
                      onChange={(e) => setExportFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="auth-label">To date</label>
                    <input
                      type="date"
                      className="auth-input"
                      min={exportFrom || undefined}
                      value={exportTo}
                      onChange={(e) => setExportTo(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {exportError && <p className="auth-error mb-0">{exportError}</p>}

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={exportLoading} className="btn-table-primary flex-1">
                  {exportLoading ? 'Exporting...' : 'Download file'}
                </button>
                <button
                  type="button"
                  className="btn-table-secondary flex-1"
                  onClick={closeExportModal}
                  disabled={exportLoading}
                >
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
