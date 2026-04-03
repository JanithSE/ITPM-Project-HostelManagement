import { useCallback, useEffect, useState } from 'react'
import { maintenanceApi } from '../../shared/api/client'
import hostelImage from '../../assets/hostel.jpg'

function statusOptions(current) {
  // Enforce forward-only status transitions in the admin UI.
  if (current === 'open') return ['open', 'in_progress']
  if (current === 'in_progress') return ['in_progress', 'resolved']
  return ['resolved']
}

function statusBadgeClass(status) {
  const s = (status || '').toLowerCase()
  if (s === 'open') return 'bg-primary-100 text-primary-800 ring-1 ring-primary-200'
  if (s === 'in_progress') return 'bg-primary-50 text-primary-800 ring-1 ring-primary-100'
  if (s === 'resolved') return 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
  return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
}

function priorityBadgeClass(priority) {
  const p = (priority || '').toLowerCase()
  if (p === 'high') return 'bg-primary-100 text-primary-900 ring-1 ring-primary-200 font-semibold'
  if (p === 'medium') return 'bg-primary-50 text-primary-800 ring-1 ring-primary-100'
  if (p === 'low') return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
  return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
}

function formatStatusLabel(value) {
  if (value === 'in_progress') return 'In progress'
  return (value || '').replace(/_/g, ' ')
}

function statusPillClass(status) {
  const s = (status || '').toLowerCase()
  if (s === 'open') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  if (s === 'in_progress') return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
  if (s === 'resolved') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
  return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
}

function initials(name, email) {
  const n = (name || email || '?').trim()
  const parts = n.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

export default function AdminMaintenance() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [pending, setPending] = useState({})
  const [activityLog, setActivityLog] = useState([])

  // Load all maintenance requests for admin monitoring.
  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')
    try {
      const data = await maintenanceApi.listAll()
      setList(Array.isArray(data) ? data : [])
    } catch (e) {
      setMsg(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Apply status update and refresh list to reflect backend truth.
  async function applyStatus(id, prevStatus, status, meta = {}) {
    // Frontend guard rails (backend currently stores only `status`).
    if (prevStatus === 'resolved') {
      setMsg('This request is already completed.')
      return
    }
    if (status === prevStatus) {
      return
    }
    // Enforce forward-only workflow in the UI/guard rails.
    const allowed =
      (prevStatus === 'open' && status === 'in_progress') ||
      (prevStatus === 'in_progress' && status === 'resolved')
    if (!allowed) {
      setMsg('Invalid status transition.')
      return
    }
    if (status === 'in_progress' && !String(meta.staff || '').trim()) {
      setMsg('Assign a staff member before setting to In Progress.')
      return
    }
    if (status === 'resolved' && !String(meta.note || '').trim()) {
      setMsg('Add a completion note before setting to Completed.')
      return
    }

    setMsg('')
    setPending((p) => ({ ...p, [id]: true }))
    try {
      await maintenanceApi.updateStatus(id, status)
      setActivityLog((log) => [
        {
          id,
          from: prevStatus,
          to: status,
          staff: String(meta.staff || '').trim(),
          note: String(meta.note || '').trim(),
          at: new Date().toLocaleString(),
        },
        ...log,
      ].slice(0, 8))
      await load()
    } catch (e) {
      setMsg(e.message || 'Update failed')
    } finally {
      setPending((p) => ({ ...p, [id]: false }))
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: `url(${hostelImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        padding: '24px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.58)',
        }}
      />
      <div className="content-card !p-0 overflow-hidden shadow-md border-gray-200/80" style={{ position: 'relative', zIndex: 1 }}>
      <div className="px-6 pt-6 pb-5 border-b border-primary-300/30 bg-gradient-to-r from-slate-900 via-blue-900 to-blue-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title mb-1 !mb-1 !text-white">All Maintenance Requests</h1>
            <p className="text-primary-100 text-sm">Track, validate, and update student maintenance issues.</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 shrink-0 shadow-sm rounded-lg px-4 py-2 text-sm font-semibold text-primary-700 bg-white hover:bg-primary-50 disabled:opacity-60"
            onClick={load}
            disabled={loading}
          >
            <span className="text-lg leading-none" aria-hidden>
              ↻
            </span>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {list.length > 0 && (
          <p className="mt-3 text-xs font-medium text-primary-700 bg-white/90 inline-block px-2.5 py-1 rounded-md">
            {list.length} {list.length === 1 ? 'request' : 'requests'}
          </p>
        )}
      </div>

      <div className="p-6 bg-gray-50/50">
        {activityLog.length > 0 && (
          <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Activity Log</p>
              <span className="text-xs font-medium text-gray-500">{activityLog.length} recent updates</span>
            </div>
            <ul className="p-4 space-y-3">
              {activityLog.map((a) => (
                <li
                  key={`${a.id}-${a.at}`}
                  className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(a.from)}`}>
                      {formatStatusLabel(a.from)}
                    </span>
                    <span className="text-xs text-gray-400">→</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(a.to)}`}>
                      {formatStatusLabel(a.to)}
                    </span>
                    <span className="ml-auto text-xs text-gray-500">{a.at}</span>
                  </div>
                  {(a.staff || a.note) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                      {a.staff && <span className="rounded-md bg-white px-2 py-1 ring-1 ring-gray-200">Staff: {a.staff}</span>}
                      {a.note && <span className="rounded-md bg-white px-2 py-1 ring-1 ring-gray-200">Note: {a.note}</span>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {msg && (
          <div
            className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-3 rounded-lg"
            role="alert"
          >
            {msg}
          </div>
        )}

        {loading && list.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-sm">Loading requests…</div>
        )}

        {!loading && list.length === 0 && (
          <div className="text-center py-16 px-4 rounded-xl border border-dashed border-gray-200 bg-white">
            <p className="text-gray-500 text-sm mb-1">No maintenance requests</p>
            <p className="text-gray-400 text-xs">Student submissions will show up here.</p>
          </div>
        )}

        <ul className="space-y-5 list-none m-0 p-0">
          {list.map((row) => (
            <li
              key={row._id}
              className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-primary-100/60 transition-shadow duration-200 overflow-hidden"
            >
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Issue</p>
                    <h2 className="text-lg font-semibold text-gray-900 leading-snug">{row.title}</h2>
                    {row.description && (
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">{row.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${priorityBadgeClass(row.priority)}`}
                    >
                      {row.priority}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadgeClass(row.status)}`}
                    >
                      {formatStatusLabel(row.status)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-0.5">Location</p>
                    <p className="font-medium text-gray-800">{row.location?.trim() || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-0.5">Reported</p>
                    <p className="text-gray-500 text-xs">
                      {/* createdAt is auto-generated when request is inserted - shown here in local date/time */}
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 py-3 px-4 rounded-lg bg-slate-50 border border-gray-100 mb-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-800 text-xs font-bold ring-2 ring-white shadow-sm"
                    aria-hidden
                  >
                    {initials(row.reportedBy?.name, row.reportedBy?.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-400">Reported by</p>
                    <p className="font-semibold text-gray-900 truncate">
                      {row.reportedBy?.name || 'Student'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{row.reportedBy?.email || '—'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Update status</p>
                  <StatusRow
                    row={row}
                    busy={pending[row._id]}
                    onApply={(nextStatus, meta) => applyStatus(row._id, row.status, nextStatus, meta)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
    </div>
  )
}

function StatusRow({ row, busy, onApply }) {
  // Options depend on current status to prevent invalid jumps.
  const opts = statusOptions(row.status)
  const [sel, setSel] = useState(row.status)
  const [staff, setStaff] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    setSel(row.status)
  }, [row.status])

  const resolved = row.status === 'resolved'
  const needsStaff = sel === 'in_progress'
  const needsNote = sel === 'resolved'
  const staffTrim = String(staff || '').trim()
  const noteTrim = String(note || '').trim()

  const staffValid = !needsStaff || staffTrim.length > 0
  const noteValid = !needsNote || noteTrim.length > 0

  // Button enabled only when there is a real change and request is not locked.
  const canApply = !busy && !resolved && sel !== row.status && staffValid && noteValid

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="md:col-span-2">
          <label htmlFor={`status-${row._id}`} className="block text-xs font-medium text-gray-500 mb-1">
            Status
          </label>
          <select
            id={`status-${row._id}`}
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            disabled={busy || resolved}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
          >
            {opts.map((o) => (
              <option key={o} value={o}>
                {formatStatusLabel(o)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn-table-primary px-5 py-2.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full"
          disabled={!canApply}
          onClick={() => {
            if (!canApply) return
            if (sel === 'resolved') {
              const ok = window.confirm('Are you sure you want to mark this request as Completed?')
              if (!ok) return
            }
            onApply(sel, { staff: staffTrim, note: noteTrim })
          }}
        >
          {busy ? 'Applying…' : 'Apply Changes'}
        </button>
      </div>

      {resolved && (
        <p className="text-xs text-gray-500 mt-3">This request is resolved.</p>
      )}

      {/* Extra admin validations (UI-level; backend currently stores only `status`) */}
      {row.status !== 'resolved' && (
        <div className="w-full mt-4 space-y-3">
          {needsStaff && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Assign staff</label>
              <input
                type="text"
                value={staff}
                onChange={(e) => setStaff(e.target.value)}
                placeholder="Type staff name"
                className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{ borderColor: staffValid ? '#22c55e' : '#dc2626' }}
                disabled={busy}
              />
              {!staffValid && <p className="text-xs text-red-600 mt-1">Staff is required before setting In Progress.</p>}
            </div>
          )}

          {needsNote && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Completion note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write a short completion note..."
                className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-800 min-h-[90px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{ borderColor: noteValid ? '#22c55e' : '#dc2626' }}
                disabled={busy}
                maxLength={600}
              />
              {!noteValid && <p className="text-xs text-red-600 mt-1">Completion note is required before marking as Completed.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
