import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'
import EditModal from '../../shared/components/admin/EditModal'
import RemarksTextarea from '../../shared/components/admin/RemarksTextarea'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
]

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `LKR ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatMoneyCompact(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const value = Number(n)
  if (value >= 1000) return `LKR ${(value / 1000).toFixed(1)}K`
  return formatMoney(value).replace('.00', '')
}

function truncateText(text, maxLen = 90) {
  const s = String(text ?? '').trim()
  if (!s) return ''
  if (s.length <= maxLen) return s
  return `${s.slice(0, Math.max(0, maxLen - 3))}...`
}

function paymentSelectStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'paid' || s === 'completed') return 'completed'
  if (s === 'failed' || s === 'rejected') return 'rejected'
  if (s === 'processing') return 'processing'
  return 'pending'
}

function proofHref(p) {
  return p.proofFile || p.proofUrl || ''
}

export default function AdminPayments() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [rowState, setRowState] = useState({})
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(null)

  const totalDue = list.reduce((s, p) => s + (Number(p?.amount) || 0), 0)
  const collected = list
    .filter((p) => paymentSelectStatus(p?.status) === 'completed')
    .reduce((s, p) => s + (Number(p?.amount) || 0), 0)
  const outstanding = Math.max(0, totalDue - collected)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await axiosClient.get('/payments/admin')
      const rows = Array.isArray(data) ? data : []
      setList(rows)
      const next = {}
      rows.forEach((p) => {
        next[p._id] = {
          status: paymentSelectStatus(p.status),
          remarks: p.adminRemarks || '',
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

  async function saveStatus(paymentId) {
    const st = rowState[paymentId]
    if (!st) return false
    const status = st.status
    const adminRemarksTrimmed = (st.remarks || '').trim()
    const includeAdminRemarks = Boolean(st.remarksDirty)

    if (status === 'rejected' && !adminRemarksTrimmed) {
      toast.error('Add admin remarks when rejecting.')
      return false
    }

    setUpdatingId(paymentId)
    try {
      const body = { status }
      // Preserve previous adminRemarks unless the admin actually edited the field.
      if (includeAdminRemarks) body.adminRemarks = adminRemarksTrimmed

      await axiosClient.patch(`/payments/${paymentId}/status`, body)
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

  function setRow(paymentId, patch) {
    setRowState((prev) => ({
      ...prev,
      [paymentId]: { ...(prev[paymentId] || {}), ...patch },
    }))
  }

  function openEdit(payment) {
    if (!payment?._id) return
    setRow(payment._id, {
      status: paymentSelectStatus(payment.status),
      remarks: payment.adminRemarks || '',
      remarksDirty: false,
    })
    setEditId(payment._id)
    setEditOpen(true)
  }

  function closeEdit() {
    setEditOpen(false)
    setEditId(null)
  }

  async function handleUpdateFromModal() {
    if (!editId) return
    const ok = await saveStatus(editId)
    if (ok) closeEdit()
  }

  const editingRow = editId ? list.find((r) => r._id === editId) : null
  const editState = editId ? rowState[editId] : null

  return (
    <>
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-blue-50 px-5 py-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-900/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Payments</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              • Hostel Management System
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-lg font-semibold text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
              <span className="mr-2 text-amber-500">●</span>Live
            </div>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="rounded-xl bg-blue-500 px-5 py-2.5 text-base font-semibold text-white shadow-sm shadow-blue-500/25 hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-violet-50/90 p-5 dark:border-indigo-900/70 dark:from-slate-900 dark:to-indigo-950/40">
          <div className="flex items-start justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Total Due</div>
            <span className="text-lg text-indigo-500">◈</span>
          </div>
          <div className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {formatMoneyCompact(totalDue)}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-cyan-50/90 p-5 dark:border-emerald-900/70 dark:from-slate-900 dark:to-emerald-950/40">
          <div className="flex items-start justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Collected</div>
            <span className="text-lg text-emerald-500">✓</span>
          </div>
          <div className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {formatMoneyCompact(collected)}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/90 to-pink-50/90 p-5 dark:border-rose-900/70 dark:from-slate-900 dark:to-rose-950/40">
          <div className="flex items-start justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Outstanding</div>
            <span className="text-lg text-rose-500">⚠</span>
          </div>
          <div className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {formatMoneyCompact(outstanding)}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Payment Records</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">All student submissions.</p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Refresh
        </button>
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
            <p className="text-sm text-slate-600 dark:text-slate-400">No payment records.</p>
          ) : (
            <table className="table-admin-compact w-full min-w-[52rem] table-fixed">
              <thead>
                <tr>
                  <th className="w-[30%] whitespace-nowrap text-left">Student</th>
                  <th className="w-[16%] whitespace-nowrap text-left">Date</th>
                  <th className="w-[16%] whitespace-nowrap text-left">Status</th>
                  <th className="min-w-0 w-[30%] text-left">Remarks</th>
                  <th className="w-[8%] whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const normalizedStatus = paymentSelectStatus(p.status)
                  const remarks = p.adminRemarks || ''
                  const remarksPreview = remarks ? truncateText(remarks, 120) : 'No admin remarks yet'

                  return (
                    <tr key={p._id} className="border-t border-slate-100 dark:border-slate-800/50 align-top">
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                            {p.studentName || p.student?.name || '—'}
                          </div>
                          <div className="break-all font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {p.roomNo || '—'} · {p.month || '—'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge status={normalizedStatus} />
                      </td>
                      <td className="px-4 py-4">
                        <div
                          className="max-h-[2.6rem] overflow-hidden whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-200"
                          title={remarks || undefined}
                        >
                          {remarksPreview}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          disabled={updatingId === p._id}
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
      <EditModal
        open={editOpen}
        title="Edit payment request"
        onClose={closeEdit}
        footer={
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
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/30">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {editingRow.studentName || editingRow.student?.name || '—'}
            </div>
            <div className="mt-1 text-xs text-slate-700 dark:text-slate-200">
              Room {editingRow.roomNo || '—'} · {editingRow.month || '—'} · {editingRow.roomType || '—'} ·{' '}
              {editingRow.facilityType || '—'}
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-900 dark:text-slate-50">
              {formatMoney(editingRow.amount)}
            </div>
            {proofHref(editingRow) ? (
              <div className="mt-3">
                <a
                  href={proofHref(editingRow)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-300 dark:hover:bg-primary-900/60"
                >
                  Open proof
                </a>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Status</label>
              <div className="relative">
                <select
                  value={editState?.status ?? paymentSelectStatus(editingRow.status)}
                  onChange={(e) => setRow(editingRow._id, { status: e.target.value })}
                  disabled={updatingId === editId}
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100"
                  aria-label="Payment status"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
    ) : null}
    </>
  )
}
