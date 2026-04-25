/**
 * Admin late pass dashboard: search, date filter, KPI tiles, table, PDF export,
 * modal PATCH status, row delete (backend allows only rejected/invalid for delete).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

/** Map stored status + legacy `approved` into select/filter buckets. */
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


function formatDateShort(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatSubmitted(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function buildStudentsPdfLine(students) {
  if (!students?.length) return '—'
  return students
    .map((s) => {
      const name = String(s.studentName || '').trim()
      const id = s.studentId || ''
      const room = s.roomNo != null && String(s.roomNo).trim() !== '' ? `Rm ${s.roomNo}` : ''
      return [name, id, room].filter(Boolean).join(' · ')
    })
    .join(' | ')
}

/** Multi-token search across visible row text (labels + student rows). */
function latepassRowMatchesQuery(row, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const statusNorm = latepassSelectStatus(row.status)
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusNorm)?.label || ''
  const studentsBits = (row.students || [])
    .map((s) => [s.studentName, s.studentId, s.roomNo].map((x) => String(x ?? '').toLowerCase()).join(' '))
    .join(' ')
  const haystack = [
    formatDateShort(row.date),
    arrivingLabel(row),
    row.guardianContactNo,
    row.reason,
    row.status,
    statusNorm,
    statusLabel,
    formatSubmitted(row.createdAt),
    row.adminRemarks,
    studentsBits,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const words = q.split(/\s+/).filter(Boolean)
  return words.every((w) => haystack.includes(w))
}

/** Export filtered rows as landscape PDF for records. */
function downloadLatepassPdfReport(rows) {
  if (!rows.length) {
    toast.error('No late pass data to download.')
    return
  }
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text('Late pass report', 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Generated ${new Date().toLocaleString()} · ${rows.length} record(s)`, 14, 22)

  const head = [['Date', 'Arriving', 'Guardian', 'Reason', 'Students', 'Status', 'Submitted', 'Admin remark']]
  const body = rows.map((row) => {
    const status = latepassSelectStatus(row.status)
    const opt = STATUS_OPTIONS.find((o) => o.value === status)
    return [
      formatDateShort(row.date),
      arrivingLabel(row),
      row.guardianContactNo || '—',
      String(row.reason || '—').replace(/\s+/g, ' '),
      buildStudentsPdfLine(row.students),
      opt?.label || status,
      formatSubmitted(row.createdAt),
      String(row.adminRemarks || '—').replace(/\s+/g, ' '),
    ]
  })

  autoTable(doc, {
    startY: 26,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [67, 56, 202], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 18 },
      2: { cellWidth: 28 },
      3: { cellWidth: 42 },
      4: { cellWidth: 48 },
      5: { cellWidth: 22 },
      6: { cellWidth: 32 },
      7: { cellWidth: 36 },
    },
    margin: { left: 14, right: 14 },
  })

  doc.save(`late-pass-${new Date().toISOString().slice(0, 10)}.pdf`)
  toast.success('PDF downloaded')
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
          className="rounded-lg border border-slate-200 bg-white/60 px-2.5 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
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
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDate, setFilterDate] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({ status: 'pending', remarks: '' })
  const [editSaving, setEditSaving] = useState(false)

  const filteredList = useMemo(
    () =>
      list.filter((row) => {
        const matchesQuery = latepassRowMatchesQuery(row, searchQuery)
        if (!filterDate) return matchesQuery
        const rowYmd = row.date ? new Date(row.date).toISOString().split('T')[0] : ''
        return matchesQuery && rowYmd === filterDate
      }),
    [list, searchQuery, filterDate],
  )

  /** GET `/latepass/admin` full list. */
  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await axiosClient.get('/latepass/admin')
      const rows = Array.isArray(data) ? data : []
      setList(rows)
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

  /** Open modal with normalized status + existing remarks for one row. */
  function openEdit(row) {
    setEditingId(row._id)
    setEditDraft({
      status: latepassSelectStatus(row.status),
      remarks: row.adminRemarks || '',
    })
  }

  /** PATCH `/latepass/:id/status` from modal. */
  async function submitEdit(e) {
    e.preventDefault()
    if (!editingId) return
    setEditSaving(true)
    try {
      await axiosClient.patch(`/latepass/${editingId}/status`, {
        status: editDraft.status,
        adminRemarks: String(editDraft.remarks || '').trim(),
      })
      toast.success('Late pass updated')
      setEditingId(null)
      await load()
    } catch (err) {
      toast.error(getAxiosErrorMessage(err))
    } finally {
      setEditSaving(false)
    }
  }



  /** DELETE via admin route (server allows rejected or invalid/test only). */
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



  const pendingCount = list.filter((r) => latepassSelectStatus(r?.status) === 'pending').length
  const processingCount = list.filter((r) => latepassSelectStatus(r?.status) === 'processing').length
  const completedCount = list.filter((r) => latepassSelectStatus(r?.status) === 'completed').length
  const rejectedCount = list.filter((r) => latepassSelectStatus(r?.status) === 'rejected').length

  return (
    <div className="admin-latepass space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-blue-50 px-5 py-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-900/30">
        <div className="admin-latepass__header flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Late pass</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">All student requests with admin review controls.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:max-w-2xl lg:flex-1">
            <label className="sr-only" htmlFor="admin-latepass-search">
              Search late pass requests
            </label>
            <input
              id="admin-latepass-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, ID, room, reason, guardian, status…"
              className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 sm:min-w-[16rem]"
              autoComplete="off"
            />
            <div className="relative">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:w-[10rem]"
                title="Filter by arrival date"
              />
              {filterDate && (
                <button
                  type="button"
                  onClick={() => setFilterDate('')}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Clear date filter"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => downloadLatepassPdfReport(filteredList)}
              disabled={loading || filteredList.length === 0}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
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
          <div className="mb-3 flex justify-end">
            {/* Bulk save button removed */}
          </div>
        </div>
        <div className="overflow-x-auto p-4 pt-3 sm:p-6 sm:pt-3">
          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">No late pass requests.</p>
          ) : filteredList.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No requests match your search. Try different keywords or clear the search box.
            </p>
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
                  <th className="w-[15%] min-w-[14rem] whitespace-nowrap">Admin remarks</th>
                  <th className="w-[9%] min-w-[9rem] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((row) => {
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
                      <td className="min-w-0 align-top px-2 py-2">
                        <WrappableCell empty="—">{row.adminRemarks}</WrappableCell>
                      </td>
                      <td className="align-top px-2 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            disabled={updatingId === row._id}
                            className="flex-1 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteLatepass(row._id)}
                            disabled={updatingId === row._id}
                            className="flex-1 rounded-full border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/30"
                          >
                            Delete
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

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Update status</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Edit status and admin remark</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                aria-label="Close"
                disabled={editSaving}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitEdit} className="mt-4 space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Status
                </label>
                <select
                  value={editDraft.status}
                  onChange={(e) => setEditDraft((d) => ({ ...d, status: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  disabled={editSaving}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Admin remark
                </label>
                <textarea
                  value={editDraft.remarks}
                  onChange={(e) => setEditDraft((d) => ({ ...d, remarks: e.target.value }))}
                  placeholder="Add context for this status update"
                  rows={4}
                  className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  disabled={editSaving}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  disabled={editSaving}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-full bg-primary-600 px-5 py-2 text-xs font-semibold text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 disabled:opacity-50"
                >
                  {editSaving ? 'Updating…' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
