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

function studentLabel(row) {
  const s = row.student
  if (!s) return '—'
  if (typeof s === 'object') {
    return s.name ? `${s.name} (${s.email || ''})` : s.email || '—'
  }
  return String(s)
}

function latepassSelectStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'approved' || s === 'completed') return 'completed'
  if (s === 'rejected') return 'rejected'
  if (s === 'processing') return 'processing'
  return 'pending'
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
      const { data } = await axiosClient.get('/latepass')
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

      await axiosClient.put(`/latepass/${id}`, body)
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
      [id]: { ...prev[id], ...patch },
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Late pass</h1>
          <p className="mt-1 text-sm text-slate-600">
            All student requests. Changes are saved to the database and shown on the student late pass page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        <div className="overflow-x-auto p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-slate-600">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-600">No late pass requests yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Student</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Date</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Return time</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Room type</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Facility</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Ref.</th>
                  <th className="min-w-[10rem] px-2 py-2 font-semibold text-slate-700">Reason</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Status</th>
                  <th className="min-w-[8rem] px-2 py-2 font-semibold text-slate-700">Admin remarks</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Submitted</th>
                  <th className="min-w-[14rem] px-2 py-2 font-semibold text-slate-700">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((row) => {
                  const rs = rowState[row._id] || {
                    status: latepassSelectStatus(row.status),
                    remarks: row.adminRemarks || '',
                  }
                  return (
                    <tr key={row._id} className="align-top text-slate-600">
                      <td className="max-w-[10rem] px-2 py-2 text-xs">{studentLabel(row)}</td>
                      <td className="whitespace-nowrap px-2 py-2">
                        {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">{row.returnTime || '—'}</td>
                      <td className="max-w-[6rem] truncate px-2 py-2" title={row.roomType || ''}>
                        {row.roomType || '—'}
                      </td>
                      <td className="max-w-[6rem] truncate px-2 py-2" title={row.facilityType || ''}>
                        {row.facilityType || '—'}
                      </td>
                      <td className="max-w-[6rem] truncate px-2 py-2" title={row.transactionReference || ''}>
                        {row.transactionReference || '—'}
                      </td>
                      <td className="max-w-[12rem] px-2 py-2 text-xs" title={row.reason || ''}>
                        {row.reason || '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="max-w-[10rem] px-2 py-2 text-xs text-slate-500">
                        {row.adminRemarks || '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex min-w-[12rem] flex-col gap-2">
                          <select
                            value={rs.status}
                            onChange={(e) => setRow(row._id, { status: e.target.value })}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            disabled={updatingId === row._id}
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
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              disabled={updatingId === row._id}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => saveStatus(row._id)}
                            disabled={updatingId === row._id}
                            className="rounded-md bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
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
