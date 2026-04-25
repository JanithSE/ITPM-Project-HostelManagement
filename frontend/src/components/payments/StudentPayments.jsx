/**
 * Student payment history: fetch `/payments/my`, client search, open proof, edit/delete when pending.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `LKR ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Prefer `proofFile`, fall back to legacy `proofUrl`. */
function proofHref(p) {
  return p.proofFile || p.proofUrl || ''
}

/** Table cell text that wraps long strings without breaking layout. */
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
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const filteredList = list.filter((p) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (p.studentName || p.student?.name || '').toLowerCase().includes(q) ||
      (p.roomNo || '').toLowerCase().includes(q) ||
      (p.roomType || '').toLowerCase().includes(q) ||
      (p.facilityType || '').toLowerCase().includes(q) ||
      (p.month || '').toLowerCase().includes(q) ||
      (p.status || '').toLowerCase().includes(q) ||
      (p.transactionType || p.transactionReference || '').toLowerCase().includes(q) ||
      (p.adminRemarks || '').toLowerCase().includes(q)
    )
  })

  /** GET `/payments/my` into local table state. */
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

  /** Soft-delete pending row via API then refresh list. */
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
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-400"
          />
          <Link
            to="/student/payments/new"
            className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700"
          >
            Add payment
          </Link>
        </div>
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
          ) : filteredList.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {searchQuery ? (
                "No matching payments found."
              ) : (
                <>
                  No payments yet.{' '}
                  <Link to="/student/payments/new" className="font-medium text-primary-600 hover:underline">
                    Add payment
                  </Link>
                </>
              )}
            </p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap">Student</th>
                  <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap">Room</th>
                  <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap">Month</th>
                  <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap">Type</th>
                  <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap">Facility</th>
                  <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap text-right">Amount</th>
                  <th className="px-5 py-4 first:pl-6 last:pr-6 min-w-[12rem]">Reference</th>
                  <th className="px-5 py-4 first:pl-6 last:pr-6">Proof</th>
                  <th className="px-5 py-4 first:pl-6 last:pr-6">Status</th>
                  <th className="px-5 py-4 first:pl-6 last:pr-6 min-w-[14rem]">Admin remarks</th>
                  <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap">Submitted</th>
                  <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((p) => {
                  const href = proofHref(p)
                  const isPending = String(p?.status || '').toLowerCase() === 'pending'
                  return (
                    <tr
                      key={p._id}
                      className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/50 dark:border-slate-800/50 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="px-5 py-4 first:pl-6 last:pr-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {p.studentName || p.student?.name || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 first:pl-6 last:pr-6 text-sm text-slate-600 dark:text-slate-400">
                        #{p.roomNo || '—'}
                      </td>
                      <td className="px-5 py-4 first:pl-6 last:pr-6 text-sm text-slate-600 dark:text-slate-400">
                        {p.month || '—'}
                      </td>
                      <td className="px-5 py-4 first:pl-6 last:pr-6">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                          {p.roomType || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 first:pl-6 last:pr-6">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                          {p.facilityType || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 first:pl-6 last:pr-6 text-right whitespace-nowrap text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(p.amount)}
                      </td>
                      <td className="px-5 py-4 first:pl-6 last:pr-6">
                        <WrappableText>{p.transactionType || p.transactionReference}</WrappableText>
                      </td>
                      <td className="px-5 py-4 first:pl-6 last:pr-6">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center rounded-lg bg-indigo-50 px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 first:pl-6 last:pr-6">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-4 first:pl-6 last:pr-6">
                        <WrappableText empty="—">{p.adminRemarks}</WrappableText>
                      </td>
                      <td className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap text-[11px] font-medium text-slate-500 dark:text-slate-500">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                        <div className="text-[10px] opacity-60">
                          {p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td className="px-5 py-4 first:pl-6 last:pr-6 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/student/payments/${p._id}/edit`}
                              className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-sm transition-all"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(p._id)}
                              aria-label="Delete payment"
                              title="Delete payment"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-sm font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-all"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              <span className="h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                              Locked
                            </span>
                          </div>
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
