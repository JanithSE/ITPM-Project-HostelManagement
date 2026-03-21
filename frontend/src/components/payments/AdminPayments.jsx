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

function studentLabel(p) {
  const s = p.student
  if (!s) return '—'
  if (typeof s === 'object') {
    return s.name ? `${s.name} (${s.email || ''})` : s.email || '—'
  }
  return String(s)
}

/** Map DB status to select value (matches API normalizer). */
function paymentSelectStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'paid' || s === 'completed') return 'completed'
  if (s === 'failed' || s === 'rejected') return 'rejected'
  if (s === 'processing') return 'processing'
  if (s === 'pending') return 'pending'
  return 'pending'
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
      const { data } = await axiosClient.get('/payments')
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
      toast.error('Add admin remarks when rejecting a payment.')
      return
    }

    setUpdatingId(paymentId)
    try {
      const body = { status }
      if (status === 'rejected') body.adminRemarks = adminRemarks

      await axiosClient.put(`/payments/${paymentId}`, body)
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
      [paymentId]: { ...prev[paymentId], ...patch },
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="mt-1 text-sm text-slate-600">
            All student fee submissions. Updates sync to the database and appear on the student payments page.
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
            <p className="text-sm text-slate-600">No payment records yet. Students submit from the student portal.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Student</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Month</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Amount</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Room no.</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Room type</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Facility</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Ref.</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Proof</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Status</th>
                  <th className="min-w-[10rem] px-2 py-2 font-semibold text-slate-700">Admin remarks</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold text-slate-700">Submitted</th>
                  <th className="min-w-[14rem] px-2 py-2 font-semibold text-slate-700">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((p) => {
                  const rs = rowState[p._id] || {
                    status: paymentSelectStatus(p.status),
                    remarks: p.adminRemarks || '',
                  }
                  return (
                    <tr key={p._id} className="align-top text-slate-600">
                      <td className="max-w-[10rem] px-2 py-2 text-xs">{studentLabel(p)}</td>
                      <td className="whitespace-nowrap px-2 py-2">{p.month || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-2 font-medium">{formatMoney(p.amount)}</td>
                      <td className="whitespace-nowrap px-2 py-2">{p.roomNo || '—'}</td>
                      <td className="max-w-[6rem] truncate px-2 py-2" title={p.roomType || ''}>
                        {p.roomType || '—'}
                      </td>
                      <td className="max-w-[6rem] truncate px-2 py-2" title={p.facilityType || ''}>
                        {p.facilityType || '—'}
                      </td>
                      <td className="max-w-[6rem] truncate px-2 py-2" title={p.transactionReference || ''}>
                        {p.transactionReference || '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        {p.proofUrl ? (
                          <a
                            href={p.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary-600 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="max-w-[10rem] px-2 py-2 text-xs text-slate-500">{p.adminRemarks || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex min-w-[12rem] flex-col gap-2">
                          <select
                            value={rs.status}
                            onChange={(e) => setRow(p._id, { status: e.target.value })}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
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
                              placeholder="Remarks (required if rejected)"
                              rows={2}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              disabled={updatingId === p._id}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => saveStatus(p._id)}
                            disabled={updatingId === p._id}
                            className="rounded-md bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
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
