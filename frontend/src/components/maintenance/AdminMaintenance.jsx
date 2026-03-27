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
  async function applyStatus(id, status) {
    setMsg('')
    setPending((p) => ({ ...p, [id]: true }))
    try {
      await maintenanceApi.updateStatus(id, status)
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
      <div className="px-6 pt-6 pb-5 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title mb-1 !mb-1">All maintenance requests</h1>
           
          </div>
          <button
            type="button"
            className="btn-table-primary inline-flex items-center justify-center gap-2 shrink-0 shadow-sm"
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
          <p className="mt-3 text-xs font-medium text-primary-700 bg-primary-50/80 inline-block px-2.5 py-1 rounded-md">
            {list.length} {list.length === 1 ? 'request' : 'requests'}
          </p>
        )}
      </div>

      <div className="p-6 bg-gray-50/50">
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
                    onApply={(s) => applyStatus(row._id, s)}
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

  useEffect(() => {
    setSel(row.status)
  }, [row.status])

  const resolved = row.status === 'resolved'
  // Button enabled only when there is a real change and request is not locked.
  const canApply = !busy && !resolved && sel !== row.status

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <label htmlFor={`status-${row._id}`} className="sr-only">
          Select new status
        </label>
        <select
          id={`status-${row._id}`}
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          disabled={busy || resolved}
          className="w-full sm:max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
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
        className="btn-table-primary px-5 py-2.5 shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        disabled={!canApply}
        onClick={() => onApply(sel)}
      >
        {busy ? 'Applying…' : 'Apply'}
      </button>
      {resolved && (
        <p className="text-xs text-gray-500 sm:ml-1">This request is resolved.</p>
      )}
    </div>
  )
}
