import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
]

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `LKR ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function paymentSelectStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'paid' || s === 'completed') return 'completed'
  if (s === 'failed' || s === 'rejected') return 'rejected'
  if (s === 'processing') return 'processing'
  return 'pending'
}

function proofHref(p) {
  return p.proofFile || p.proofUrl || ''
}

export default function AdminPayments() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [rowState, setRowState] = useState({})

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await axiosClient.get('/payments/admin')
      const rows = Array.isArray(data) ? data : []
      setList(rows)
      const next = {}
      rows.forEach((p) => {
        next[p._id] = {
          status: paymentSelectStatus(p.status),
          remarks: p.adminRemarks || '',
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

  async function saveStatus(paymentId) {
    const st = rowState[paymentId]
    if (!st) return
    const status = st.status
    const adminRemarks = status === 'rejected' ? (st.remarks || '').trim() : undefined

    if (status === 'rejected' && !adminRemarks) {
      toast.error('Add admin remarks when rejecting.')
      return
    }

    setUpdatingId(paymentId)
    try {
      const body = { status }
      if (status === 'rejected') body.adminRemarks = adminRemarks

      await axiosClient.patch(`/payments/${paymentId}/status`, body)
      toast.success('Payment updated')
      await load()
    } catch (err) {
      toast.error(getAxiosErrorMessage(err))
    } finally {
      setUpdatingId(null)
    }
  }

  function setRow(paymentId, patch) {
    setRowState((prev) => ({
      ...prev,
      [paymentId]: { ...(prev[paymentId] || {}), ...patch },
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Payments</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">All student submissions.</p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Refresh
        </button>
      </div>

      <div className="panel-surface overflow-hidden rounded-2xl shadow-card">
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
            <p className="text-sm text-slate-600 dark:text-slate-400">No payment records.</p>
          ) : (
            <table className="table-admin-compact">
              <thead>
                <tr>
                  <th>Student name</th>
                  <th>Room no.</th>
                  <th>Month</th>
                  <th>Room type</th>
                  <th>Facility</th>
                  <th>Amount</th>
                  <th>Transaction</th>
                  <th>Proof</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Submitted</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const rs = rowState[p._id] || {
                    status: paymentSelectStatus(p.status),
                    remarks: p.adminRemarks || '',
                  }
                  const href = proofHref(p)
                  return (
                    <tr key={p._id} className="align-top">
                      <td className="px-2 py-2 text-xs font-medium">{p.studentName || p.student?.name || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-2">{p.roomNo || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-2">{p.month || '—'}</td>
                      <td className="px-2 py-2 capitalize">{p.roomType || '—'}</td>
                      <td className="px-2 py-2 uppercase">{p.facilityType || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-2">{formatMoney(p.amount)}</td>
                      <td className="max-w-[6rem] px-2 py-2 text-xs">{p.transactionType || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-2">
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
                      <td className="px-2 py-2">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="max-w-[8rem] px-2 py-2 text-xs">{p.adminRemarks || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex min-w-[11rem] flex-col gap-2">
                          <select
                            value={rs.status}
                            onChange={(e) => setRow(p._id, { status: e.target.value })}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            disabled={updatingId === p._id}
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
                              onChange={(e) => setRow(p._id, { remarks: e.target.value })}
                              placeholder="Remarks (required)"
                              rows={2}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                              disabled={updatingId === p._id}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => saveStatus(p._id)}
                            disabled={updatingId === p._id}
                            className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 disabled:opacity-50"
                          >
                            {updatingId === p._id ? 'Saving…' : 'Save'}
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
