/**
 * Student late pass list: cards on mobile, table on md+, search, edit/delete when pending.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'

/** Prefer `arrivingTime`; older rows may only have `returnTime`. */
function arrivingLabel(row) {
  return row.arrivingTime || row.returnTime || '—'
}

/** Uploaded supporting document path for “View” links. */
function docHref(row) {
  return row.documentFile || ''
}

/** Pass `date` field to locale short string. */
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

/** Compact list of embedded `students` for a late pass row. */
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

/** Mobile layout: single card with actions for one late pass row. */
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
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const filteredList = useMemo(() => {
    if (!searchQuery) return list
    const q = searchQuery.toLowerCase()
    return list.filter((row) => {
      const status = String(row?.status || '').toLowerCase()
      const reason = String(row?.reason || '').toLowerCase()
      const guardian = String(row?.guardianContactNo || '').toLowerCase()
      const remarks = String(row?.adminRemarks || '').toLowerCase()
      const studentsStr = (row.students || [])
        .map((s) => `${s.studentName} ${s.studentId}`)
        .join(' ')
        .toLowerCase()

      const haystack = [
        reason,
        guardian,
        status,
        remarks,
        studentsStr
      ].join(' ')

      const words = q.split(/\s+/).filter(Boolean)
      return words.every((w) => haystack.includes(w))
    })
  }, [list, searchQuery])

  /** GET `/latepass/my` (creator + legacy links + ID in `students`). */
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

  /** DELETE pending request owned by current student. */
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
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-400"
          />
          <Link
            to="/student/latepass/new"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700"
          >
            Add late pass
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
          ) : filteredList.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No requests match your search.
            </p>
          ) : (
            <>
              {/* Mobile: one card per request */}
              <div className="space-y-4 md:hidden">
                {filteredList.map((row) => (
                  <LatepassCard key={row._id} row={row} onDelete={handleDelete} />
                ))}
              </div>

              {/* md+: table with premium styling */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap">Date</th>
                      <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap">Arriving</th>
                      <th className="px-5 py-4 first:pl-6 last:pr-6 min-w-[12rem]">Reason</th>
                      <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap">Guardian</th>
                      <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap">Document</th>
                      <th className="px-5 py-4 first:pl-6 last:pr-6 min-w-[12rem]">Students</th>
                      <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap">Status</th>
                      <th className="px-5 py-4 first:pl-6 last:pr-6 min-w-[10rem]">Admin remarks</th>
                      <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap">Submitted</th>
                      <th className="px-5 py-4 first:pl-6 last:pr-6 whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((row) => {
                      const href = docHref(row)
                      const isPending = String(row?.status || '').toLowerCase() === 'pending'
                      return (
                        <tr
                          key={row._id}
                          className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/50 dark:border-slate-800/50 dark:hover:bg-slate-900/40 transition-colors"
                        >
                          <td className="px-5 py-4 first:pl-6 last:pr-6 align-top whitespace-nowrap text-xs font-medium">
                            {formatDate(row.date)}
                          </td>
                          <td className="px-5 py-4 first:pl-6 last:pr-6 align-top whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                            {arrivingLabel(row)}
                          </td>
                          <td className="px-5 py-4 first:pl-6 last:pr-6 align-top">
                            <WrappableText empty="—">{row.reason}</WrappableText>
                          </td>
                          <td className="px-5 py-4 first:pl-6 last:pr-6 align-top break-all font-mono text-xs text-slate-600 dark:text-slate-400">
                            {row.guardianContactNo || '—'}
                          </td>
                          <td className="px-5 py-4 first:pl-6 last:pr-6 align-top whitespace-nowrap">
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
                          <td className="px-5 py-4 first:pl-6 last:pr-6 align-top">
                            <StudentsList students={row.students} />
                          </td>
                          <td className="px-5 py-4 first:pl-6 last:pr-6 align-top whitespace-nowrap">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-5 py-4 first:pl-6 last:pr-6 align-top">
                            <WrappableText empty="—">{row.adminRemarks}</WrappableText>
                          </td>
                          <td className="px-5 py-4 first:pl-6 last:pr-6 align-top whitespace-nowrap text-[11px] font-medium text-slate-500 dark:text-slate-500">
                            {formatSubmitted(row.createdAt)}
                          </td>
                          <td className="px-5 py-4 first:pl-6 last:pr-6 align-top text-right whitespace-nowrap">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  to={`/student/latepass/${row._id}/edit`}
                                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-sm transition-all"
                                >
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(row._id)}
                                  className="inline-flex h-8 items-center rounded-lg bg-rose-50 px-3 text-[11px] font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                  <span className="h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                                  Read only
                                </span>
                              </div>
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
