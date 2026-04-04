import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `LKR ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function proofHref(p) {
  return p.proofFile || p.proofUrl || ''
}

function WrappableText({ children, empty = '—' }) {
  const text = children == null || children === '' ? null : String(children)
  if (!text) return <span className="text-slate-400 dark:text-slate-500">{empty}</span>
  return (
    <span
      className="block max-w-full break-words [overflow-wrap:anywhere] text-xs leading-relaxed text-slate-700 dark:text-slate-200"
      title={text.length > 120 ? text : undefined}
    >
      {text}
    </span>
  )
}

export default function StudentPayments() {
  const [list, setList] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await axiosClient.get('/payments/my')
      setList(Array.isArray(data) ? data : [])
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

  async function handleDelete(paymentId) {
    const ok = window.confirm('Delete this payment? This action cannot be undone.')
    if (!ok) return
    try {
      await axiosClient.delete(`/payments/${paymentId}/delete-by-student`)
      toast.success('Payment deleted.')
      await load()
    } catch (err) {
      toast.error(getAxiosErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Payments</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Your submitted fee payments only.</p>
        </div>
        <Link
          to="/student/payments/new"
          className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700"
        >
          Add payment
        </Link>
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
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No payments yet.{' '}
              <Link to="/student/payments/new" className="font-medium text-primary-600 hover:underline">
                Add payment
              </Link>
            </p>
          ) : (
            <table className="table-dashboard w-full min-w-[70rem] table-fixed">
              <thead>
                <tr>
                  <th className="w-[11%]">Student name</th>
                  <th className="whitespace-nowrap">Room no.</th>
                  <th className="whitespace-nowrap">Month</th>
                  <th className="whitespace-nowrap">Room type</th>
                  <th className="whitespace-nowrap">Facility</th>
                  <th className="whitespace-nowrap">Amount</th>
                  <th className="min-w-0 w-[11%]">Transaction type</th>
                  <th className="whitespace-nowrap">Proof</th>
                  <th className="whitespace-nowrap">Status</th>
                  <th className="min-w-0 w-[13%]">Admin remarks</th>
                  <th className="whitespace-nowrap">Submitted</th>
                  <th className="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const href = proofHref(p)
                  const isPending = String(p?.status || '').toLowerCase() === 'pending'
                  return (
                    <tr key={p._id}>
                      <td className="px-3 py-3">{p.studentName || p.student?.name || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3">{p.roomNo || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3">{p.month || '—'}</td>
                      <td className="capitalize px-3 py-3">{p.roomType || '—'}</td>
                      <td className="uppercase px-3 py-3">{p.facilityType || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium">{formatMoney(p.amount)}</td>
                      <td className="min-w-0 px-3 py-3">
                        <WrappableText>{p.transactionType || p.transactionReference}</WrappableText>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                          >
                            View
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="min-w-0 px-3 py-3">
                        <WrappableText empty="—">{p.adminRemarks}</WrappableText>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/student/payments/${p._id}/edit`}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(p._id)}
                              className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">Read only</span>
                        )}
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
