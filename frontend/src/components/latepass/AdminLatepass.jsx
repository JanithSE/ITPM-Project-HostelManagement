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

function studentsSummary(students) {
  if (!students?.length) return '—'
  return students
    .map((s) => `${s.studentName} · ${s.studentId} · ${s.roomNo}`)
    .join(' | ')
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

  return (
    <div className="admin-latepass space-y-6">
      <div className="admin-latepass__header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Late pass</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">All student requests (table view).</p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh
        </button>
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
            <table className="admin-latepass__table table-admin-compact">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Date</th>
                  <th className="whitespace-nowrap">Arriving time</th>
                  <th className="whitespace-nowrap">Guardian contact</th>
                  <th className="whitespace-nowrap">Document</th>
                  <th className="min-w-[10rem]">Reason</th>
                  <th className="min-w-[14rem]">Students</th>
                  <th className="whitespace-nowrap">Status</th>
                  <th className="min-w-[8rem]">Admin remarks</th>
                  <th className="whitespace-nowrap">Submitted</th>
                  <th className="min-w-[13rem]">Update</th>
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
                  const summary = studentsSummary(students)
                  return (
                    <tr key={row._id}>
                      <td className="whitespace-nowrap px-2 py-3">
                        {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3">{arrivingLabel(row)}</td>
                      <td className="max-w-[8rem] px-2 py-3 text-xs">{row.guardianContactNo || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-3">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                          >
                            Open
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="max-w-[12rem] px-2 py-3 text-xs" title={row.reason || ''}>
                        {row.reason || '—'}
                      </td>
                      <td className="max-w-[16rem] px-2 py-3 text-xs" title={summary !== '—' ? summary : ''}>
                        {summary}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="max-w-[10rem] px-2 py-3 text-xs text-slate-500">{row.adminRemarks || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-xs">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex min-w-[12rem] flex-col gap-2">
                          <select
                            value={rs.status}
                            onChange={(e) => setRow(row._id, { status: e.target.value })}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                              disabled={updatingId === row._id}
                              aria-label="Admin remarks for rejection"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => saveStatus(row._id)}
                            disabled={updatingId === row._id}
                            className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 disabled:opacity-50"
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
