import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

function latepassSelectStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'approved' || s === 'completed') return 'completed'
  if (s === 'rejected') return 'rejected'
  if (s === 'processing') return 'processing'
  return 'pending'
}

function arrivingLabel(row) {
  return row.arrivingTime || row.returnTime || '—'
}

function formatDateShort(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatSubmitted(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** One clear block per student so names/IDs don’t break across lines mid-record. */
function AdminStudentsList({ students }) {
  if (!students?.length) {
    return <span className="text-slate-400 dark:text-slate-500">—</span>
  }
  return (
    <ul className="m-0 max-w-full list-none space-y-2 p-0">
      {students.map((s, i) => (
        <li
          key={`${String(s.studentId ?? '')}-${i}`}
          className="rounded-md border border-slate-200/90 bg-white/50 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800/60"
        >
          <span className="block text-xs font-semibold leading-snug text-slate-900 dark:text-slate-50">
            {String(s.studentName || '').trim() || '—'}
          </span>
          <span className="mt-0.5 block break-all font-mono text-[11px] leading-snug text-slate-600 dark:text-slate-400">
            {s.studentId || '—'}
          </span>
          {s.roomNo != null && String(s.roomNo).trim() !== '' && (
            <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-500">
              Room {s.roomNo}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Long strings (e.g. no spaces) must wrap instead of overflowing into the next column. */
function WrappableCell({ children, empty = '—' }) {
  const text = children == null || children === '' ? null : String(children)
  if (!text) {
    return <span className="text-slate-400 dark:text-slate-500">{empty}</span>
  }
  return (
    <span
      className="block min-w-0 max-w-full break-words [overflow-wrap:anywhere] text-left text-xs leading-relaxed text-slate-700 dark:text-slate-200"
      title={text.length > 100 ? text : undefined}
    >
      {text}
    </span>
  )
}

export default function AdminLatepass() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [rowState, setRowState] = useState({})

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await axiosClient.get('/latepass/admin')
      const rows = Array.isArray(data) ? data : []
      setList(rows)
      const next = {}
      rows.forEach((row) => {
        next[row._id] = {
          status: latepassSelectStatus(row.status),
          remarks: row.adminRemarks || '',
        }
      })
      setRowState(next)
    } catch (err) {
      setError(getAxiosErrorMessage(err))
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function saveStatus(id) {
    const st = rowState[id]
    if (!st) return
    const status = st.status
    const adminRemarks = status === 'rejected' ? (st.remarks || '').trim() : undefined

    if (status === 'rejected' && !adminRemarks) {
      toast.error('Add admin remarks when rejecting.')
      return
    }

    setUpdatingId(id)
    try {
      const body = { status }
      if (status === 'rejected') body.adminRemarks = adminRemarks

      await axiosClient.patch(`/latepass/${id}/status`, body)
      toast.success('Late pass updated')
      await load()
    } catch (err) {
      toast.error(getAxiosErrorMessage(err))
    } finally {
      setUpdatingId(null)
    }
  }

  function setRow(id, patch) {
    setRowState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    }))
  }

  const pendingCount = list.filter((r) => latepassSelectStatus(r?.status) === 'pending').length
  const processingCount = list.filter((r) => latepassSelectStatus(r?.status) === 'processing').length
  const completedCount = list.filter((r) => latepassSelectStatus(r?.status) === 'completed').length
  const rejectedCount = list.filter((r) => latepassSelectStatus(r?.status) === 'rejected').length

  return (
    <div className="admin-latepass space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-blue-50 px-5 py-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-900/30">
        <div className="admin-latepass__header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Late pass</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">All student requests with admin review controls.</p>
          </div>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="rounded-full bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/25 hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-900/70 dark:bg-amber-950/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Pending</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{pendingCount}</p>
          </div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 dark:border-sky-900/70 dark:bg-sky-950/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">Processing</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{processingCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 dark:border-emerald-900/70 dark:bg-emerald-950/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Approved</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{completedCount}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 dark:border-rose-900/70 dark:bg-rose-950/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">Rejected</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{rejectedCount}</p>
        </div>
      </div>

      <div className="admin-latepass__panel panel-surface overflow-hidden rounded-2xl shadow-card">
        {error && (
          <div
            className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}
        <div className="overflow-x-auto p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">No late pass requests.</p>
          ) : (
            <table className="admin-latepass__table table-admin-compact w-full min-w-[68rem] table-fixed">
              <thead>
                <tr>
                  <th className="w-[10%] whitespace-nowrap">Date</th>
                  <th className="w-[8%] whitespace-nowrap">Arriving</th>
                  <th className="w-[10%] whitespace-nowrap">Guardian</th>
                  <th className="w-[7%] whitespace-nowrap">Document</th>
                  <th className="min-w-0 w-[20%]">Reason</th>
                  <th className="min-w-0 w-[16%]">Students</th>
                  <th className="w-[8%] whitespace-nowrap">Status</th>
                  <th className="min-w-0 w-[12%]">Admin remarks</th>
                  <th className="w-[10%] whitespace-nowrap">Submitted</th>
                  <th className="w-[19%] min-w-[13rem] whitespace-nowrap">Update</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const rs = rowState[row._id] || {
                    status: latepassSelectStatus(row.status),
                    remarks: row.adminRemarks || '',
                  }
                  const href = row.documentFile || ''
                  const students = row.students?.length ? row.students : []
                  return (
                    <tr key={row._id}>
                      <td className="align-top whitespace-nowrap px-2 py-3 text-xs font-medium">
                        {formatDateShort(row.date)}
                      </td>
                      <td className="align-top whitespace-nowrap px-2 py-3 text-xs">{arrivingLabel(row)}</td>
                      <td className="align-top break-all px-2 py-3 font-mono text-xs">
                        {row.guardianContactNo || '—'}
                      </td>
                      <td className="align-top whitespace-nowrap px-2 py-3">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-300 dark:hover:bg-primary-900/60"
                          >
                            Open
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="min-w-0 align-top px-2 py-3">
                        <WrappableCell>{row.reason}</WrappableCell>
                      </td>
                      <td className="min-w-0 align-top px-2 py-3">
                        <AdminStudentsList students={students} />
                      </td>
                      <td className="align-top whitespace-nowrap px-2 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="min-w-0 align-top px-2 py-3 text-slate-500 dark:text-slate-400">
                        <WrappableCell>{row.adminRemarks}</WrappableCell>
                      </td>
                      <td className="align-top px-2 py-3 text-xs leading-snug text-slate-600 dark:text-slate-400">
                        {formatSubmitted(row.createdAt)}
                      </td>
                      <td className="align-top px-2 py-3">
                        <div className="flex min-w-[13rem] flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-700 dark:bg-slate-800/40">
                          <select
                            value={rs.status}
                            onChange={(e) => setRow(row._id, { status: e.target.value })}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            disabled={updatingId === row._id}
                            aria-label="Update late pass status"
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          {rs.status === 'rejected' && (
                            <textarea
                              value={rs.remarks}
                              onChange={(e) => setRow(row._id, { remarks: e.target.value })}
                              placeholder="Remarks (required if rejected)"
                              rows={2}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                              disabled={updatingId === row._id}
                              aria-label="Admin remarks for rejection"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => saveStatus(row._id)}
                            disabled={updatingId === row._id}
                            className="rounded-full bg-primary-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 disabled:opacity-50"
                          >
                            {updatingId === row._id ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
