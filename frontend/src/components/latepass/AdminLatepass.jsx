import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

function latepassSelectStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'approved' || s === 'completed') return 'completed'
  if (s === 'rejected') return 'rejected'
  if (s === 'processing') return 'processing'
  return 'pending'
}

function arrivingLabel(row) {
  return row.arrivingTime || row.returnTime || '—'
}

function hasTestLikeKeyword(v) {
  return /(^|\b)(test|dummy|sample|invalid)(\b|$)/i.test(String(v ?? ''))
}

function canAdminDeleteLatepass(row) {
  const st = String(row?.status || '').toLowerCase()
  if (st === 'rejected') return true
  if (!Array.isArray(row?.students) || row.students.length === 0) return true
  if (!row?.date || !row?.arrivingTime || !row?.reason || !row?.guardianContactNo) return true
  if (hasTestLikeKeyword(row.reason)) return true
  return (row.students || []).some((s) =>
    !s?.studentName || !s?.studentId || !s?.roomNo ||
    hasTestLikeKeyword(s.studentName) ||
    hasTestLikeKeyword(s.studentId) ||
    hasTestLikeKeyword(s.roomNo),
  )
}

function formatDateShort(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatSubmitted(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** One clear block per student so names/IDs don’t break across lines mid-record. */
function AdminStudentsList({ students }) {
  if (!students?.length) {
    return <span className="text-slate-400 dark:text-slate-500">—</span>
  }
  return (
    <ul className="m-0 max-w-full list-none space-y-2 p-0">
      {students.map((s, i) => (
        <li
          key={`${String(s.studentId ?? '')}-${i}`}
          className="rounded-md border border-slate-200/90 bg-white/50 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800/60"
        >
          <span className="block text-xs font-semibold leading-snug text-slate-900 dark:text-slate-50">
            {String(s.studentName || '').trim() || '—'}
          </span>
          <span className="mt-0.5 block break-all font-mono text-[11px] leading-snug text-slate-600 dark:text-slate-400">
            {s.studentId || '—'}
          </span>
          {s.roomNo != null && String(s.roomNo).trim() !== '' && (
            <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-500">
              Room {s.roomNo}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Long strings (e.g. no spaces) must wrap instead of overflowing into the next column. */
function WrappableCell({ children, empty = '—' }) {
  const text = children == null || children === '' ? null : String(children)
  if (!text) {
    return <span className="text-slate-400 dark:text-slate-500">{empty}</span>
  }
  return (
    <span
      className="block min-w-0 max-w-full break-words [overflow-wrap:anywhere] text-left text-xs leading-relaxed text-slate-700 dark:text-slate-200"
      title={text.length > 100 ? text : undefined}
    >
      {text}
    </span>
  )
}

export default function AdminLatepass() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [rowState, setRowState] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await axiosClient.get('/latepass/admin')
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

  function isRowDirty(row) {
    const st = rowState[row._id]
    if (!st) return false
    const currentStatus = latepassSelectStatus(row.status)
    const currentRemarks = String(row.adminRemarks || '').trim()
    const nextRemarks = String(st.remarks || '').trim()
    return st.status !== currentStatus || nextRemarks !== currentRemarks
  }

  async function persistStatus(id, { silent = false, reloadAfter = true } = {}) {
    const st = rowState[id]
    if (!st) return
    const status = st.status
    const adminRemarks = (st.remarks || '').trim()

    if (!silent) setUpdatingId(id)
    try {
      const body = { status, adminRemarks }

      await axiosClient.patch(`/latepass/${id}/status`, body)
      if (!silent) toast.success('Late pass updated')
      if (reloadAfter) await load()
      return true
    } catch (err) {
      if (!silent) toast.error(getAxiosErrorMessage(err))
      return false
    } finally {
      if (!silent) setUpdatingId(null)
    }
  }

  async function saveAllStatusUpdates() {
    const dirtyRows = list.filter((row) => isRowDirty(row))
    if (dirtyRows.length === 0) {
      toast('No status updates to save.')
      return
    }
    setBulkSaving(true)
    let okCount = 0
    for (const row of dirtyRows) {
      const ok = await persistStatus(row._id, { silent: true, reloadAfter: false })
      if (ok) okCount += 1
    }
    await load()
    setBulkSaving(false)
    if (okCount === dirtyRows.length) toast.success(`Saved ${okCount} updates.`)
    else toast.error(`Saved ${okCount}/${dirtyRows.length}. Please retry failed rows.`)
  }

  async function deleteLatepass(id) {
    const ok = window.confirm('Delete this late pass request? This action cannot be undone.')
    if (!ok) return
    setUpdatingId(id)
    try {
      await axiosClient.delete(`/latepass/${id}/delete-by-admin`)
      toast.success('Late pass deleted')
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
      [id]: { ...(prev[id] || {}), ...patch },
    }))
  }

  // Filtering Logic
  const filteredList = list.filter((row) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase().trim()
    return (row.students || []).some((s) =>
      String(s.studentName || '').toLowerCase().includes(q)
    )
  })

  // Suggestions Logic
  const suggestions = Array.from(new Set(
    list.flatMap((row) => (row.students || []).map((s) => String(s.studentName || '').trim()))
  )).filter((name) =>
    name.toLowerCase().includes(searchTerm.toLowerCase().trim()) &&
    name.toLowerCase() !== searchTerm.toLowerCase().trim()
  ).slice(0, 5)

  function downloadPDF() {
    if (filteredList.length === 0) {
      toast.error('No data to export.')
      return
    }

    const doc = new jsPDF('l', 'mm', 'a4')
    const timestamp = new Date().toLocaleString()

    doc.setFontSize(18)
    doc.text('Late Pass Requests Report', 14, 15)
    doc.setFontSize(10)
    doc.text(`Exported on: ${timestamp}`, 14, 22)

    const tableData = filteredList.map((row) => {
      const studentNames = (row.students || []).map((s) => s.studentName).join(', ') || '—'
      const studentIDs = (row.students || []).map((s) => s.studentId).join(', ') || '—'
      const roomNos = (row.students || []).map((s) => s.roomNo).join(', ') || '—'

      return [
        formatDateShort(row.date),
        arrivingLabel(row),
        row.guardianContactNo || '—',
        row.reason || '—',
        studentNames,
        studentIDs,
        roomNos,
        row.status || '—',
        formatSubmitted(row.createdAt)
      ]
    })

    autoTable(doc, {
      startY: 28,
      head: [['Date', 'Arrival', 'Guardian', 'Reason', 'Students', 'IDs', 'Rooms', 'Status', 'Submitted']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        3: { cellWidth: 40 }, // Reason
        4: { cellWidth: 40 }, // Students
      }
    })

    doc.save(`Late_Pass_Report_${new Date().getTime()}.pdf`)
    toast.success('PDF downloaded successfully')
  }

  const pendingCount = list.filter((r) => latepassSelectStatus(r?.status) === 'pending').length
  const processingCount = list.filter((r) => latepassSelectStatus(r?.status) === 'processing').length
  const completedCount = list.filter((r) => latepassSelectStatus(r?.status) === 'completed').length
  const rejectedCount = list.filter((r) => latepassSelectStatus(r?.status) === 'rejected').length

  return (
    <div className="admin-latepass space-y-6">
      <div className="bg-red-600 text-white text-center p-2 font-bold uppercase tracking-widest">
        Warden Control Sidebar Active
      </div>
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-blue-50 px-5 py-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-900/30">
        <div className="admin-latepass__header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Late pass</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">All student requests with admin review controls.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadPDF}
              disabled={loading || list.length === 0}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="rounded-full bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/25 hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-900/70 dark:bg-amber-950/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Pending</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{pendingCount}</p>
          </div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 dark:border-sky-900/70 dark:bg-sky-950/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">Processing</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{processingCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 dark:border-emerald-900/70 dark:bg-emerald-950/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Approved</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{completedCount}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 dark:border-rose-900/70 dark:bg-rose-950/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">Rejected</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{rejectedCount}</p>
        </div>
      </div>

      <div className="admin-latepass__panel panel-surface overflow-hidden rounded-2xl shadow-card">
        {error && (
          <div
            className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}
        <div className="p-4 pb-0 sm:p-6 sm:pb-0">
          <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search student name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full rounded-full border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:focus:border-primary-400"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {suggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setSearchTerm(name)
                        setShowSuggestions(false)
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={saveAllStatusUpdates}
              disabled={loading || bulkSaving}
              className="rounded-full bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 disabled:opacity-50"
            >
              {bulkSaving ? 'Saving updates…' : 'Save Status Updates'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto p-4 pt-3 sm:p-6 sm:pt-3">
          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
          ) : filteredList.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {searchTerm.trim() ? `No results found for "${searchTerm}"` : 'No late pass requests.'}
              </p>
              {searchTerm.trim() && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-xs font-semibold text-primary-600 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <table className="admin-latepass__table table-admin-compact w-full min-w-[92rem] table-fixed">
              <thead>
                <tr>
                  <th className="w-[8%] whitespace-nowrap">Date</th>
                  <th className="w-[7%] whitespace-nowrap">Arriving</th>
                  <th className="w-[9%] whitespace-nowrap">Guardian</th>
                  <th className="w-[6%] whitespace-nowrap">Document</th>
                  <th className="min-w-0 w-[17%]">Reason</th>
                  <th className="min-w-0 w-[14%]">Students</th>
                  <th className="w-[8%] whitespace-nowrap">Status</th>
                  <th className="w-[8%] whitespace-nowrap">Submitted</th>
                  <th className="w-[15%] min-w-[11rem] whitespace-nowrap">Update status</th>
                  <th className="w-[16%] min-w-[12rem] whitespace-nowrap">Admin remark</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((row) => {
                  const rs = rowState[row._id] || {
                    status: latepassSelectStatus(row.status),
                    remarks: row.adminRemarks || '',
                  }
                  const allowDelete = canAdminDeleteLatepass(row)
                  const href = row.documentFile || ''
                  const students = row.students?.length ? row.students : []
                  return (
                    <tr key={row._id}>
                      <td className="align-top whitespace-nowrap px-2 py-2 text-xs font-medium">
                        {formatDateShort(row.date)}
                      </td>
                      <td className="align-top whitespace-nowrap px-2 py-2 text-xs">{arrivingLabel(row)}</td>
                      <td className="align-top break-all px-2 py-2 font-mono text-xs">
                        {row.guardianContactNo || '—'}
                      </td>
                      <td className="align-top whitespace-nowrap px-2 py-2">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-300 dark:hover:bg-primary-900/60"
                          >
                            Open
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="min-w-0 align-top px-2 py-2">
                        <WrappableCell>{row.reason}</WrappableCell>
                      </td>
                      <td className="min-w-0 align-top px-2 py-2">
                        <AdminStudentsList students={students} />
                      </td>
                      <td className="align-top whitespace-nowrap px-2 py-2">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="align-top px-2 py-2 text-xs leading-snug text-slate-600 dark:text-slate-400">
                        {formatSubmitted(row.createdAt)}
                      </td>
                      <td className="align-top px-2 py-2">
                        <div className="flex min-w-[11rem] flex-col gap-1">
                          <select
                            value={rs.status}
                            onChange={(e) => setRow(row._id, { status: e.target.value })}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            disabled={bulkSaving || updatingId === row._id}
                            aria-label="Update late pass status"
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => deleteLatepass(row._id)}
                            disabled={bulkSaving || updatingId === row._id || !allowDelete}
                            title={!allowDelete ? 'Delete allowed only for rejected or invalid/test records' : 'Delete request'}
                            className="rounded-full border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/30"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                      <td className="align-top px-2 py-2">
                        <div>
                          <textarea
                            value={rs.remarks}
                            onChange={(e) => setRow(row._id, { remarks: e.target.value })}
                            placeholder="Add context for this status update"
                            rows={2}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            disabled={bulkSaving || updatingId === row._id}
                            aria-label="Admin remark for late pass"
                          />
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
