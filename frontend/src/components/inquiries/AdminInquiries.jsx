import { useCallback, useEffect, useMemo, useState } from 'react'
import { inquiryApi } from '../../shared/api/client'
import hostelImage from '../../assets/hostel.jpg'
import { inDateRange, exportInquiriesPdf } from '../../utils/reportExport'

/**
 * VIVA: Admin — Inquiry
 * - Data: `inquiryApi.listAll` + `reply` to send admin message (JSON body `{ reply }`).
 * - Validation: minimum reply length, student email check, block duplicate reply when already replied.
 * - Notifications: `success` / `msg` for feedback; `activityLog` is a small local history for demo.
 * - Image: `imageUrl` on inquiry record; open in modal to review student evidence.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function statusBadgeClass(status) {
  const s = (status || '').toLowerCase()
  if (s === 'open') return 'bg-primary-100 text-primary-800 ring-1 ring-primary-200'
  if (s === 'replied') return 'bg-primary-50 text-primary-700 ring-1 ring-primary-100'
  if (s === 'closed') return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
  return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
}

function initials(name, email) {
  const n = (name || email || '?').trim()
  const parts = n.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

export default function AdminInquiries() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')
  const [drafts, setDrafts] = useState({})
  const [pending, setPending] = useState({})
  const [activityLog, setActivityLog] = useState([])
  const [reportStatus, setReportStatus] = useState('all')
  const [reportFromDate, setReportFromDate] = useState('')
  const [reportToDate, setReportToDate] = useState('')
  const [viewerImage, setViewerImage] = useState('')
  const [viewerTitle, setViewerTitle] = useState('')

  const filteredList = useMemo(
    () =>
      list.filter((row) => {
        const statusOk = reportStatus === 'all' || row.status === reportStatus
        const dateOk = inDateRange(row.createdAt, reportFromDate, reportToDate)
        return statusOk && dateOk
      }),
    [list, reportStatus, reportFromDate, reportToDate]
  )

  function exportPdf() {
    if (filteredList.length === 0) {
      setMsg('No rows match the current report filters.')
      return
    }
    setMsg('')
    try {
      exportInquiriesPdf(filteredList)
    } catch (e) {
      setMsg(e?.message || 'PDF export failed')
    }
  }

  function clearReportFilters() {
    setReportStatus('all')
    setReportFromDate('')
    setReportToDate('')
  }

  // Load all inquiries for admin review.
  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')
    setSuccess('')
    try {
      const data = await inquiryApi.listAll()
      setList(Array.isArray(data) ? data : [])
    } catch (e) {
      setMsg(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function setDraft(id, text) {
    setDrafts((d) => ({ ...d, [id]: text }))
  }

  // Validate and submit a reply for a single inquiry row.
  async function submitReply(id) {
    const reply = (drafts[id] || '').trim()
    const inquiry = list.find((x) => String(x._id) === String(id))
    const canReply = inquiry && inquiry.status === 'open' && !inquiry.reply
    const studentEmail = String(inquiry?.from?.email || '').trim().toLowerCase()
    const emailValid = EMAIL_REGEX.test(studentEmail)
    const replyValid = reply.length >= 10

    if (!canReply) {
      setMsg('This inquiry has already been replied.')
      return
    }
    if (!emailValid) {
      setMsg('Student email is invalid or missing.')
      return
    }
    if (!replyValid) {
      setMsg('Reply must be at least 10 characters.')
      return
    }

    const ok = window.confirm('Send this reply to the student?')
    if (!ok) return

    if (!reply) {
      return
    }
    setMsg('')
    setSuccess('')
    setPending((p) => ({ ...p, [id]: true }))
    try {
      await inquiryApi.reply(id, reply)
      setDrafts((d) => ({ ...d, [id]: '' }))
      setSuccess('Reply sent successfully.')
      setActivityLog((log) => [
        { id, at: new Date().toLocaleString() },
        ...log,
      ].slice(0, 8))
      await load()
    } catch (e) {
      setMsg(e.message || 'Reply failed')
    } finally {
      setPending((p) => ({ ...p, [id]: false }))
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: `url(${hostelImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        padding: '24px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.58)',
        }}
      />
      <div className="content-card !p-0 overflow-hidden shadow-md border-gray-200/80" style={{ position: 'relative', zIndex: 1 }}>
      {/* Admin inquiries header and quick refresh */}
      <div className="px-6 pt-6 pb-5 border-b border-primary-300/30 bg-gradient-to-r from-slate-900 via-blue-900 to-blue-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title mb-1 !mb-1 !text-white">All Inquiries</h1>
            <p className="text-primary-100 text-sm">Review student messages and send validated replies.</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 shrink-0 shadow-sm rounded-lg px-4 py-2 text-sm font-semibold text-primary-700 bg-white hover:bg-primary-50 disabled:opacity-60"
            onClick={load}
            disabled={loading}
          >
            <span className="text-lg leading-none" aria-hidden>
              ↻
            </span>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {list.length > 0 && (
          <p className="mt-3 text-xs font-medium text-primary-700 bg-white/90 inline-block px-2.5 py-1 rounded-md">
            {list.length} {list.length === 1 ? 'inquiry' : 'inquiries'}
          </p>
        )}
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-primary-100 uppercase tracking-wide">Reports</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-primary-100 mb-1">Status</label>
              <select
                className="w-full rounded-lg border border-primary-100/30 bg-white px-3 py-2 text-sm text-slate-800"
                value={reportStatus}
                onChange={(e) => setReportStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="replied">Replied</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-primary-100 mb-1">From</label>
              <input
                type="date"
                className="w-full rounded-lg border border-primary-100/30 bg-white px-3 py-2 text-sm text-slate-800"
                value={reportFromDate}
                onChange={(e) => setReportFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-primary-100 mb-1">To</label>
              <input
                type="date"
                className="w-full rounded-lg border border-primary-100/30 bg-white px-3 py-2 text-sm text-slate-800"
                value={reportToDate}
                onChange={(e) => setReportToDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-table-primary text-sm px-3 py-2" onClick={exportPdf}>
              Export PDF
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
              onClick={clearReportFilters}
            >
              Clear filters
            </button>
          </div>
          <p className="text-xs text-primary-100">
            Showing {filteredList.length} of {list.length} inquiries (filters apply to list and exports)
          </p>
        </div>
      </div>

      <div className="p-6 bg-gray-50/50">
        {msg && (
          <div
            className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-3 rounded-lg"
            role="alert"
          >
            {msg}
          </div>
        )}
        {success && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-100 px-4 py-3 rounded-lg" role="alert">
            {success}
          </div>
        )}

        {activityLog.length > 0 && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Activity Log</p>
            <ul className="space-y-2">
              {activityLog.map((a, idx) => (
                <li key={`${a.id}-${a.at}-${idx}`} className="text-xs text-gray-600">
                  Reply sent at {a.at}
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading && list.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-sm">Loading inquiries…</div>
        )}

        {!loading && list.length === 0 && (
          <div className="text-center py-16 px-4 rounded-xl border border-dashed border-gray-200 bg-white">
            <p className="text-gray-500 text-sm mb-1">No inquiries yet</p>
            <p className="text-gray-400 text-xs">When students submit inquiries, they will appear here.</p>
          </div>
        )}

        <ul className="space-y-5 list-none m-0 p-0">
          {/* List is already sorted by newest first from backend using createdAt descending */}
          {filteredList.map((row) => {
            const replyText = drafts[row._id] ?? ''
            const replyTrim = replyText.trim()
            const canReply = row.status === 'open' && !row.reply
            const studentEmail = String(row.from?.email || '').trim().toLowerCase()
            const emailValid = EMAIL_REGEX.test(studentEmail)
            const replyValid = replyTrim.length >= 10
            const canSend = canReply && emailValid && replyValid && !pending[row._id]
            const errorText = !canReply
              ? ''
              : !emailValid
                ? 'Student email is invalid or missing.'
                : !replyTrim
                  ? 'Reply is required.'
                  : !replyValid
                    ? 'Reply must be at least 10 characters.'
                    : ''

            const borderColor = !canReply
              ? '#e5e7eb'
              : canSend
                ? '#22c55e'
                : errorText
                  ? '#dc2626'
                  : '#e5e7eb'

            return (
              <li
                key={row._id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-primary-100/60 transition-shadow duration-200 overflow-hidden"
              >
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-800 text-sm font-bold ring-2 ring-white shadow-sm"
                      aria-hidden
                    >
                      {initials(row.from?.name, row.from?.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {row.from?.name || 'Student'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{row.from?.email || '—'}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadgeClass(row.status)}`}
                  >
                    {row.status || '—'}
                  </span>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Subject</p>
                  <h2 className="text-lg font-semibold text-gray-900 leading-snug">{row.subject}</h2>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1.5">Message</p>
                  <div className="rounded-lg bg-slate-50 border border-gray-100 px-4 py-3 text-sm text-gray-600 leading-relaxed">
                    {row.message}
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-400 mb-1">Uploaded image</p>
                  {row.imageUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={row.imageUrl}
                        alt="Inquiry upload"
                        className="h-14 w-20 rounded-md object-cover border border-gray-200"
                      />
                      <button
                        type="button"
                        className="btn-table-primary px-3 py-1.5 text-xs"
                        onClick={() => {
                          setViewerImage(row.imageUrl)
                          setViewerTitle(row.subject || 'Inquiry Image')
                        }}
                      >
                        View Image
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No image uploaded</p>
                  )}
                </div>

                {row.reply && (
                  <div className="mb-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary-700/80 mb-1.5">
                      Existing reply
                    </p>
                    <div className="rounded-lg bg-primary-50/90 border border-primary-100 px-4 py-3 text-sm text-gray-700 leading-relaxed">
                      {row.reply}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                  <label htmlFor={`reply-${row._id}`} className="text-xs font-medium text-gray-500 block mb-2">
                    Your reply
                  </label>
                  <textarea
                    id={`reply-${row._id}`}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow resize-y min-h-[5rem] disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Type reply…"
                    value={drafts[row._id] ?? ''}
                    onChange={(e) => setDraft(row._id, e.target.value)}
                    disabled={!canReply || pending[row._id]}
                    style={{ borderColor }}
                    maxLength={1000}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-red-600">{errorText}</p>
                    <p className="text-xs text-gray-500">{(drafts[row._id] || '').length}/1000</p>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="btn-table-primary shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={!canReply || !emailValid || !replyValid || pending[row._id]}
                      onClick={() => submitReply(row._id)}
                    >
                      {pending[row._id] ? 'Sending…' : 'Submit reply'}
                    </button>
                  </div>
                </div>
              </div>
            </li>
            )
          })}
        </ul>
      </div>
      {viewerImage && (
        <div className="image-modal-backdrop" onClick={() => setViewerImage('')}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <strong>{viewerTitle || 'Uploaded Image'}</strong>
              <button type="button" className="btn-table-secondary" onClick={() => setViewerImage('')}>
                Close
              </button>
            </div>
            <img src={viewerImage} alt="Enlarged inquiry upload" className="image-modal-image" />
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
