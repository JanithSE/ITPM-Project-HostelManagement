import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'
import EditModal from '../../shared/components/admin/EditModal'
import RemarksTextarea from '../../shared/components/admin/RemarksTextarea'
import ConfirmDialog from '../../shared/components/admin/ConfirmDialog'

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

function truncateText(text, maxLen = 90) {
  const s = String(text ?? '').trim()
  if (!s) return ''
  if (s.length <= maxLen) return s
  return `${s.slice(0, Math.max(0, maxLen - 3))}...`
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
  const [rowState, setRowState] = useState({})
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

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
          remarksDirty: false,
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

  async function saveStatus(id) {
    const st = rowState[id]
    if (!st) return false
    const status = st.status
    const adminRemarksTrimmed = (st.remarks || '').trim()
    const includeAdminRemarks = Boolean(st.remarksDirty)

    if (status === 'rejected' && !adminRemarksTrimmed) {
      toast.error('Add admin remarks when rejecting.')
      return false
    }

    setUpdatingId(id)
    try {
      const body = { status }
      // Preserve previous adminRemarks unless the admin actually edited the field.
      if (includeAdminRemarks) body.adminRemarks = adminRemarksTrimmed

      await axiosClient.patch(`/latepass/${id}/status`, body)
      toast.success('Updated successfully')
      await load()
      return true
    } catch (err) {
      toast.error('Update failed')
      return false
    } finally {
      setUpdatingId(null)
    }
  }

  async function deleteLatepass(id) {
    setUpdatingId(id)
    try {
      await axiosClient.delete(`/latepass/${id}/delete-by-admin`)
      toast.success('Late pass deleted')
      await load()
      return true
    } catch (err) {
      toast.error(getAxiosErrorMessage(err))
      return false
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

  function openEdit(row) {
    if (!row?._id) return
    setRow(row._id, {
      status: latepassSelectStatus(row.status),
      remarks: row.adminRemarks || '',
      remarksDirty: false,
    })
    setEditId(row._id)
    setEditOpen(true)
    setDeleteConfirmOpen(false)
  }

  function closeEdit() {
    setEditOpen(false)
    setEditId(null)
    setDeleteConfirmOpen(false)
  }

  async function handleUpdateFromModal() {
    if (!editId) return
    const ok = await saveStatus(editId)
    if (ok) closeEdit()
  }

  async function handleConfirmDelete() {
    if (!editId) return
    const ok = await deleteLatepass(editId)
    setDeleteConfirmOpen(false)
    if (ok) closeEdit()
  }

  const pendingCount = list.filter((r) => latepassSelectStatus(r?.status) === 'pending').length
  const processingCount = list.filter((r) => latepassSelectStatus(r?.status) === 'processing').length
  const completedCount = list.filter((r) => latepassSelectStatus(r?.status) === 'completed').length
  const rejectedCount = list.filter((r) => latepassSelectStatus(r?.status) === 'rejected').length

  const editingRow = editId ? list.find((r) => r._id === editId) : null
  const editState = editId ? rowState[editId] : null
  const allowDelete = editingRow ? canAdminDeleteLatepass(editingRow) : false

  return (
    <>
    <div className="admin-latepass space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-blue-50 px-5 py-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-900/30">
        <div className="admin-latepass__header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Late pass</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">All student requests with admin review controls.</p>
          </div>
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
        <div className="overflow-x-auto p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">No late pass requests.</p>
          ) : (
            <table className="admin-latepass__table table-admin-compact w-full min-w-[52rem] table-fixed">
              <thead>
                <tr>
                  <th className="w-[24%] whitespace-nowrap">Student</th>
                  <th className="w-[14%] whitespace-nowrap">Date</th>
                  <th className="w-[16%] whitespace-nowrap">Status</th>
                  <th className="min-w-0 w-[36%]">Remarks</th>
                  <th className="w-[10%] whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const students = row.students?.length ? row.students : []
                  const first = students[0]
                  const moreCount = Math.max(0, students.length - 1)

                  const normalizedStatus = latepassSelectStatus(row.status)
                  // Late pass "completed" is treated as "Approved" (green).
                  const statusForBadge = normalizedStatus === 'completed' ? 'approved' : normalizedStatus

                  const remarks = row.adminRemarks || ''
                  const remarksPreview = remarks ? truncateText(remarks, 120) : 'No admin remarks yet'

                  return (
                    <tr key={row._id} className="border-t border-slate-100 dark:border-slate-800/50">
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                            {String(first?.studentName || '').trim() || '—'}
                          </div>
                          <div className="break-all font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {first?.studentId || ''}
                          </div>
                          {moreCount > 0 ? (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">+{moreCount} more</div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap align-top text-xs">{formatDateShort(row.date)}</td>
                      <td className="px-4 py-4 whitespace-nowrap align-top">
                        <StatusBadge status={statusForBadge} />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div
                          className="max-h-[2.6rem] overflow-hidden whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-200"
                          title={remarks || undefined}
                        >
                          {remarksPreview}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          disabled={updatingId === row._id}
                          title="Edit status and admin remarks"
                          className="rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 disabled:opacity-50"
                        >
                          Edit
                        </button>
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

    {editingRow ? (
      <>
        <EditModal
          open={editOpen}
          title="Edit late pass request"
          onClose={closeEdit}
          footer={
            <div className="space-y-3">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={updatingId === editId}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateFromModal}
                  disabled={updatingId === editId}
                  title="Updates both status and admin remarks"
                  className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updatingId === editId ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                      <span>Updating…</span>
                    </>
                  ) : (
                    'Update Status'
                  )}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={updatingId === editId || !allowDelete}
                  title={!allowDelete ? 'Delete is allowed only for rejected or invalid/test records.' : 'Delete this record'}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/30">
              <div className="flex flex-wrap gap-2 text-xs text-slate-700 dark:text-slate-200">
                <span className="font-semibold">Date:</span> <span>{formatDateShort(editingRow.date)}</span>
                <span className="font-semibold">Arriving:</span> <span>{arrivingLabel(editingRow)}</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">Students</div>
              <div className="mt-1">
                <AdminStudentsList students={editingRow.students?.length ? editingRow.students : []} />
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">Reason</div>
              <div className="mt-1">
                <WrappableCell empty="—">{editingRow.reason}</WrappableCell>
              </div>
              {editingRow.documentFile ? (
                <div className="mt-3">
                  <a
                    href={editingRow.documentFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-300 dark:hover:bg-primary-900/60"
                  >
                    Open document
                  </a>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Status</label>
                <div className="relative">
                  <select
                    value={editState?.status ?? latepassSelectStatus(editingRow.status)}
                    onChange={(e) => setRow(editingRow._id, { status: e.target.value })}
                    disabled={updatingId === editId}
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100"
                    aria-label="Late pass status"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.value === 'completed' ? 'Approved' : o.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 dark:text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
              </div>

              <RemarksTextarea
                label="Admin Remarks (optional)"
                placeholder="Enter admin remarks..."
                value={editState?.remarks ?? ''}
                onChange={(e) => setRow(editingRow._id, { remarks: e.target.value, remarksDirty: true })}
                disabled={updatingId === editId}
              />
              {String(editState?.status ?? editingRow.status).toLowerCase() === 'rejected' ? (
                <p className="text-sm text-rose-600 dark:text-rose-400">Required when status is Rejected.</p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Remarks are optional for this status.</p>
              )}
            </div>
          </div>
        </EditModal>

        <ConfirmDialog
          open={deleteConfirmOpen}
          title="Delete late pass?"
          message="Are you sure you want to delete this record?"
          confirmText="Delete"
          cancelText="Cancel"
          danger
          busy={updatingId === editId}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
        />
      </>
    ) : null}
    </>
  )
}
