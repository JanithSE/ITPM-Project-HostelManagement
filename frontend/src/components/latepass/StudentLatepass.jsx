import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'

function arrivingLabel(row) {
  return row.arrivingTime || row.returnTime || '—'
}

function docHref(row) {
  return row.documentFile || ''
}

function studentsSummary(row) {
  const list = row.students
  if (list && list.length > 0) {
    return list.map((s) => `${s.studentName} (${s.studentId})`).join('; ')
  }
  return '—'
}

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Late pass</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Requests you created or where your student ID matches a listed student.
          </p>
        </div>
        <Link
          to="/student/latepass/new"
          className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700"
        >
          Add late pass
        </Link>
      </div>

      <div className="panel-surface overflow-hidden rounded-2xl shadow-card">
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        <div className="overflow-x-auto p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No requests yet.{' '}
              <Link to="/student/latepass/new" className="font-medium text-primary-600 hover:underline">
                Add late pass
              </Link>
            </p>
          ) : (
            <table className="table-dashboard">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Arriving time</th>
                  <th className="min-w-[10rem]">Reason</th>
                  <th>Guardian contact</th>
                  <th>Document</th>
                  <th className="min-w-[12rem]">Students</th>
                  <th>Status</th>
                  <th>Admin remarks</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const href = docHref(row)
                  return (
                    <tr key={row._id}>
                      <td className="whitespace-nowrap px-3 py-3">
                        {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">{arrivingLabel(row)}</td>
                      <td className="max-w-xs px-3 py-3 text-xs" title={row.reason || ''}>
                        {row.reason || '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs">{row.guardianContactNo || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {href ? (
                          <a
                            href={href}
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
                      <td className="max-w-[14rem] px-3 py-3 text-xs" title={studentsSummary(row)}>
                        {studentsSummary(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="max-w-[10rem] px-3 py-3 text-xs">{row.adminRemarks || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
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
