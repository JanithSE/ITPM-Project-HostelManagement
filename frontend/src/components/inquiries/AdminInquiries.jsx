import { useCallback, useEffect, useState } from 'react'
import { inquiryApi } from '../../shared/api/client'
import hostelImage from '../../assets/hostel.jpg'

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
  const [drafts, setDrafts] = useState({})
  const [pending, setPending] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')
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

  async function submitReply(id) {
    const reply = (drafts[id] || '').trim()
    if (!reply) {
      setMsg('Enter a reply before submitting.')
      return
    }
    setMsg('')
    setPending((p) => ({ ...p, [id]: true }))
    try {
      await inquiryApi.reply(id, reply)
      setDrafts((d) => ({ ...d, [id]: '' }))
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
      {/* Page header */}
      <div className="px-6 pt-6 pb-5 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title mb-1 !mb-1">All inquiries</h1>
           
          </div>
          <button
            type="button"
            className="btn-table-primary inline-flex items-center justify-center gap-2 shrink-0 shadow-sm"
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
          <p className="mt-3 text-xs font-medium text-primary-700 bg-primary-50/80 inline-block px-2.5 py-1 rounded-md">
            {list.length} {list.length === 1 ? 'inquiry' : 'inquiries'}
          </p>
        )}
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
          {list.map((row) => (
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
                    disabled={pending[row._id]}
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="btn-table-primary shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={pending[row._id]}
                      onClick={() => submitReply(row._id)}
                    >
                      {pending[row._id] ? 'Sending…' : 'Submit reply'}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
    </div>
  )
}
