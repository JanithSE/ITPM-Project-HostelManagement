import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'

function arrivingLabel(row) {
  return row.arrivingTime || row.returnTime || '—'
}

function docHref(row) {
  return row.documentFile || ''
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatSubmitted(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/** Long reasons / IDs: wrap even without spaces */
function WrappableText({ children, empty = '—' }) {
  const text = children == null || children === '' ? null : String(children)
  if (!text) {
    return <span className="text-slate-400 dark:text-slate-500">{empty}</span>
  }
  return (
    <span
      className="block max-w-full break-words [overflow-wrap:anywhere] text-xs leading-relaxed text-slate-700 dark:text-slate-200"
      title={text.length > 120 ? text : undefined}
    >
      {text}
    </span>
  )
}

function StudentsList({ students }) {
  if (!students?.length) {
    return <span className="text-slate-400 dark:text-slate-500">—</span>
  }
  return (
    <ul className="m-0 max-w-full list-none space-y-2 p-0">
      {students.map((s, i) => (
        <li
          key={`${s.studentId}-${i}`}
          className="border-l-2 border-primary-200 pl-2.5 dark:border-primary-800"
        >
          <span className="block font-medium text-slate-800 dark:text-slate-100">{s.studentName || '—'}</span>
          <span className="block break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {s.studentId || '—'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function LatepassCard({ row, onDelete }) {
  const href = docHref(row)
  const isPending = String(row?.status || '').toLowerCase() === 'pending'
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Date &amp; time
          </p>
          <p className="text-base font-semibold text-slate-900 dark:text-slate-50">{formatDate(row.date)}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Arriving: {arrivingLabel(row)}</p>
        </div>
        <StatusBadge status={row.status} />
      </div>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Reason
          </dt>
          <dd className="mt-0.5">
            <WrappableText empty="No reason given">{row.reason}</WrappableText>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Guardian contact
          </dt>
          <dd className="mt-0.5 break-all font-mono text-xs text-slate-700 dark:text-slate-200">
            {row.guardianContactNo || <span className="text-slate-400">Not provided</span>}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Document
          </dt>
          <dd className="mt-0.5">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                View attachment
              </a>
            ) : (
              <span className="text-slate-400">None</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Students
          </dt>
          <dd className="mt-0.5">
            <StudentsList students={row.students} />
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Admin remarks
          </dt>
          <dd className="mt-0.5">
            <WrappableText empty="No remarks yet">{row.adminRemarks}</WrappableText>
          </dd>
        </div>
        <div className="border-t border-slate-100 pt-2 dark:border-slate-700">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Submitted
          </dt>
          <dd className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{formatSubmitted(row.createdAt)}</dd>
        </div>
        <div className="border-t border-slate-100 pt-2 dark:border-slate-700">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Actions
          </dt>
          <dd className="mt-1">
            {isPending ? (
              <div className="flex items-center gap-2">
                <Link
                  to={`/student/latepass/${row._id}/edit`}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(row._id)}
                  className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Delete
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">Read only</span>
            )}
          </dd>
        </div>
      </dl>
    </article>
  )
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

  async function handleDelete(id) {
    const ok = window.confirm('Delete this late pass request? This action cannot be undone.')
    if (!ok) return
    try {
      await axiosClient.delete(`/latepass/${id}/delete-by-student`)
      toast.success('Late pass deleted.')
      await load()
    } catch (err) {
      toast.error(getAxiosErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Late pass</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Requests you created, plus any request that includes your student ID. On phones each request appears as
            a card; on larger screens you get a full table.
          </p>
        </div>
        <Link
          to="/student/latepass/new"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700"
        >
          Add late pass
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
        <div className="p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No requests yet.{' '}
              <Link
                to="/student/latepass/new"
                className="font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Add late pass
              </Link>
            </p>
          ) : (
            <>
              {/* Mobile: one card per request */}
              <div className="space-y-4 md:hidden">
                {list.map((row) => (
                  <LatepassCard key={row._id} row={row} onDelete={handleDelete} />
                ))}
              </div>

              {/* md+: table with wrapping cells */}
              <div className="hidden overflow-x-auto md:block">
                <table className="table-dashboard w-full min-w-[56rem] table-fixed">
                  <thead>
                    <tr>
                      <th className="w-[9%] align-bottom">Date</th>
                      <th className="w-[8%] align-bottom">Arriving</th>
                      <th className="min-w-0 w-[22%] align-bottom">Reason</th>
                      <th className="w-[11%] align-bottom">Guardian</th>
                      <th className="w-[7%] align-bottom">Document</th>
                      <th className="min-w-0 w-[18%] align-bottom">Students</th>
                      <th className="w-[9%] align-bottom">Status</th>
                      <th className="min-w-0 w-[10%] align-bottom">Admin remarks</th>
                      <th className="w-[14%] align-bottom">Submitted</th>
                      <th className="w-[12%] align-bottom">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((row) => {
                      const href = docHref(row)
                      const isPending = String(row?.status || '').toLowerCase() === 'pending'
                      return (
                        <tr key={row._id}>
                          <td className="align-top whitespace-nowrap text-xs">{formatDate(row.date)}</td>
                          <td className="align-top whitespace-nowrap text-xs">{arrivingLabel(row)}</td>
                          <td className="min-w-0 align-top">
                            <WrappableText empty="—">{row.reason}</WrappableText>
                          </td>
                          <td className="align-top break-all font-mono text-xs">{row.guardianContactNo || '—'}</td>
                          <td className="align-top whitespace-nowrap">
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
                          <td className="min-w-0 align-top">
                            <StudentsList students={row.students} />
                          </td>
                          <td className="align-top whitespace-nowrap">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="min-w-0 align-top">
                            <WrappableText empty="—">{row.adminRemarks}</WrappableText>
                          </td>
                          <td className="align-top text-xs leading-snug text-slate-600 dark:text-slate-400">
                            {formatSubmitted(row.createdAt)}
                          </td>
                          <td className="align-top whitespace-nowrap">
                            {isPending ? (
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/student/latepass/${row._id}/edit`}
                                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(row._id)}
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
