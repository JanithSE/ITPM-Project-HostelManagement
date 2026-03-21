import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'

export default function StudentLatepass() {
  const [list, setList] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await axiosClient.get('/latepass/my')
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
          <h1 className="text-2xl font-bold text-slate-900">Late pass</h1>
          <p className="mt-1 text-sm text-slate-600">Your late return requests and admin decisions.</p>
        </div>
        <Link
          to="/student/latepass/new"
          className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          Add late pass
        </Link>
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
            <p className="text-sm text-slate-600">
              No requests yet.{' '}
              <Link to="/student/latepass/new" className="font-medium text-primary-600 hover:underline">
                Add late pass
              </Link>
            </p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">Date</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">Return time</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">Room type</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">Facility type</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">Transaction ref.</th>
                  <th className="min-w-[12rem] px-3 py-3 font-semibold text-slate-700">Reason</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">Status</th>
                  <th className="min-w-[8rem] px-3 py-3 font-semibold text-slate-700">Admin remarks</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">Submitted date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((row) => (
                  <tr key={row._id} className="text-slate-600">
                    <td className="whitespace-nowrap px-3 py-3">
                      {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{row.returnTime || '—'}</td>
                    <td className="max-w-[8rem] truncate px-3 py-3" title={row.roomType || ''}>
                      {row.roomType || '—'}
                    </td>
                    <td className="max-w-[8rem] truncate px-3 py-3" title={row.facilityType || ''}>
                      {row.facilityType || '—'}
                    </td>
                    <td className="max-w-[8rem] truncate px-3 py-3" title={row.transactionReference || ''}>
                      {row.transactionReference || '—'}
                    </td>
                    <td className="max-w-xs px-3 py-3 text-xs" title={row.reason || ''}>
                      {row.reason || '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="max-w-[12rem] px-3 py-3 text-xs" title={row.adminRemarks || ''}>
                      {row.adminRemarks || '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
