import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import StatusBadge from '../../shared/components/StatusBadge'

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

function WrappableCell({ children, empty = '—' }) {
  const text = children == null || children === '' ? null : String(children)
  if (!text) return <span className="text-slate-400 dark:text-slate-500">{empty}</span>
  return (
    <span
      className="block min-w-0 max-w-full break-words [overflow-wrap:anywhere] text-xs leading-relaxed text-slate-700 dark:text-slate-200"
      title={text.length > 100 ? text : undefined}
    >
      {text}
    </span>
  )
}

function SubmittedCell({ value }) {
  if (!value) return <span className="text-slate-400 dark:text-slate-500">—</span>
  const dt = new Date(value)
  return (
    <span className="block text-xs leading-snug text-slate-600 dark:text-slate-300">
      <span className="block whitespace-nowrap">{dt.toLocaleDateString()}</span>
      <span className="block whitespace-nowrap">{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </span>
  )
}

function downloadPaymentPdfReport(rows) {
  if (!rows.length) {
    toast.error('No payment data to download.')
    return
  }
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text('Payment Records Report', 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Generated ${new Date().toLocaleString()} · ${rows.length} record(s)`, 14, 22)

  const head = [['Student Name', 'Room', 'Month', 'Type', 'Facility', 'Amount', 'Transaction', 'Status', 'Submitted']]
  const body = rows.map((p) => [
    p.studentName || p.student?.name || '—',
    p.roomNo || '—',
    p.month || '—',
    p.roomType || '—',
    p.facilityType || '—',
    formatMoney(p.amount),
    p.transactionType || '—',
    p.status || 'pending',
    new Date(p.createdAt).toLocaleDateString(),
  ])

  autoTable(doc, {
    startY: 26,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    margin: { left: 14, right: 14 },
  })

  doc.save(`payments-${new Date().toISOString().slice(0, 10)}.pdf`)
  toast.success('PDF downloaded')
}

export default function AdminPayments() {
  const [list, setList] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({ status: 'pending', remarks: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')

  const availableMonths = useMemo(() => {
    const months = new Set()
    list.forEach((p) => {
      if (p.month) months.add(p.month)
    })
    return Array.from(months).sort().reverse()
  }, [list])

  const filteredList = useMemo(() => {
    return list.filter((p) => {
      // Search Query Filter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q || [
        p.studentName,
        p.student?.name,
        p.roomNo,
        p.roomType,
        p.facilityType,
        p.month,
        p.status,
        p.transactionType,
        p.adminRemarks
      ].some(val => String(val || '').toLowerCase().includes(q))

      // Status Filter
      const matchesStatus = !statusFilter || paymentSelectStatus(p.status) === statusFilter

      // Month Filter
      const matchesMonth = !monthFilter || p.month === monthFilter

      return matchesSearch && matchesStatus && matchesMonth
    })
  }, [list, searchQuery, statusFilter, monthFilter])



  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await axiosClient.get('/payments/admin')
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

  function openEdit(payment) {
    setEditingId(payment._id)
    setEditDraft({
      status: paymentSelectStatus(payment.status),
      remarks: payment.adminRemarks || '',
    })
  }

  async function submitEdit(e) {
    e.preventDefault()
    if (!editingId) return
    setEditSaving(true)
    try {
      await axiosClient.patch(`/payments/${editingId}/status`, {
        status: editDraft.status,
        adminRemarks: String(editDraft.remarks || '').trim(),
      })
      toast.success('Payment updated')
      setEditingId(null)
      await load()
    } catch (err) {
      toast.error(getAxiosErrorMessage(err))
    } finally {
      setEditSaving(false)
    }
  }

  return (
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



      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Payment Records</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">All student submissions.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-32 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full sm:w-32 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Months</option>
              {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <input
            type="text"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-400"
          />
          <button
            type="button"
            onClick={() => downloadPaymentPdfReport(filteredList)}
            disabled={loading || filteredList.length === 0}
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Refresh
          </button>
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
              {searchQuery ? "No matching payment records found." : "No payment records."}
            </p>
          ) : (
            <table className="table-admin-compact w-full min-w-[90rem] table-fixed">
              <thead>
                <tr>
                  <th className="w-[11%]">Student name</th>
                  <th className="w-[7%] whitespace-nowrap">Room no.</th>
                  <th className="w-[8%] whitespace-nowrap">Month</th>
                  <th className="w-[7%] whitespace-nowrap">Room type</th>
                  <th className="w-[6%] whitespace-nowrap">Facility</th>
                  <th className="w-[9%] whitespace-nowrap">Amount</th>
                  <th className="w-[10%]">Transaction</th>
                  <th className="w-[5%] whitespace-nowrap">Proof</th>
                  <th className="w-[8%] whitespace-nowrap">Status</th>
                  <th className="w-[9%] whitespace-nowrap">Submitted</th>
                  <th className="w-[15%] min-w-[14rem] whitespace-nowrap">Admin remarks</th>
                  <th className="w-[9%] min-w-[9rem] whitespace-nowrap">Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((p) => {
                  const href = proofHref(p)
                  return (
                    <tr key={p._id} className="align-top">
                      <td className="px-2 py-1.5 text-xs font-medium">{p.studentName || p.student?.name || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{p.roomNo || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{p.month || '—'}</td>
                      <td className="px-2 py-1.5 capitalize">{p.roomType || '—'}</td>
                      <td className="px-2 py-1.5 uppercase">{p.facilityType || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{formatMoney(p.amount)}</td>
                      <td className="min-w-0 px-2 py-1.5">
                        <WrappableCell>{p.transactionType || '—'}</WrappableCell>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                          >
                            Open
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <SubmittedCell value={p.createdAt} />
                      </td>
                      <td className="min-w-0 px-2 py-1.5 align-top">
                        <WrappableCell empty="—">{p.adminRemarks}</WrappableCell>
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          disabled={editSaving}
                          className="rounded-full bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 disabled:opacity-50"
                        >
                          {editingId === p._id ? (editSaving ? 'Updating…' : 'Editing…') : 'Update'}
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

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Update payment</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Edit status and admin remark only.</p>
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
