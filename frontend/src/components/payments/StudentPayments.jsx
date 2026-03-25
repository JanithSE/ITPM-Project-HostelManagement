import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `LKR ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function proofHref(p) {
  return p.proofFile || p.proofUrl || ''
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
            <table className="table-dashboard">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Student name</th>
                  <th className="whitespace-nowrap">Room no.</th>
                  <th className="whitespace-nowrap">Month</th>
                  <th className="whitespace-nowrap">Room type</th>
                  <th className="whitespace-nowrap">Facility</th>
                  <th className="whitespace-nowrap">Amount</th>
                  <th className="whitespace-nowrap">Transaction type</th>
                  <th className="whitespace-nowrap">Proof</th>
                  <th className="whitespace-nowrap">Status</th>
                  <th className="min-w-[8rem]">Admin remarks</th>
                  <th className="whitespace-nowrap">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const href = proofHref(p)
                  return (
                    <tr key={p._id}>
                      <td className="px-3 py-3">{p.studentName || p.student?.name || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3">{p.roomNo || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3">{p.month || '—'}</td>
                      <td className="capitalize px-3 py-3">{p.roomType || '—'}</td>
                      <td className="uppercase px-3 py-3">{p.facilityType || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium">{formatMoney(p.amount)}</td>
                      <td className="px-3 py-3">{p.transactionType || p.transactionReference || '—'}</td>
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
                      <td className="max-w-[10rem] px-3 py-3 text-xs" title={p.adminRemarks || ''}>
                        {p.adminRemarks || '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
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
