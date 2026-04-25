import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { notificationApi } from '../../shared/api/client'

const POLL_MS = 12000

/** Rewrites long legacy DB messages into the same short form as the backend. */
function formatInquiryNotificationMessage(message) {
  const s = String(message || '')
  const legacy = s.match(
    /^Your inquiry "Inquiry from (.+?) \(([^)]+)\)" has been replied by admin\.?$/i
  )
  if (legacy) {
    return `An admin replied to your inquiry — ${legacy[1].trim()}`
  }
  return s
}

function filterNotificationsByAudience(rows, audience) {
  if (audience === 'admin') {
    return rows.filter((item) => item?.type === 'inquiry_new')
  }
  return rows.filter((item) => item?.type === 'inquiry_reply')
}

function formatWhen(isoDate) {
  const dt = new Date(isoDate)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function InquiryNotificationDropdown({ notifications, loading, error, unreadCount, onItemActivate, audience }) {
  const title = audience === 'admin' ? 'Student inquiries' : 'Inquiry replies'
  const emptyText = audience === 'admin' ? 'No new inquiry notifications.' : 'No inquiry notifications.'
  return (
    <div className="w-[min(24rem,calc(100vw-1rem))] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} unread</p>
      </div>
      <div className="min-h-[4rem] max-h-[24rem] overflow-y-auto p-2">
        {loading ? (
          <p className="px-2 py-4 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : error ? (
          <p className="px-2 py-4 text-center text-sm text-rose-600 dark:text-rose-300">{error}</p>
        ) : notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
        ) : (
          notifications.map((item) => {
            const text = formatInquiryNotificationMessage(item.message)
            return (
              <button
                key={item._id}
                type="button"
                onClick={() => onItemActivate?.(item)}
                className={`mb-2 block w-full rounded-xl border px-3 py-3 text-left transition last:mb-0 ${
                  item.isRead
                    ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
                    : 'border-sky-200 bg-sky-50/80 shadow-sm dark:border-sky-600 dark:bg-sky-950/35'
                }`}
              >
                <p
                  className="break-words text-left text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100"
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                >
                  {text}
                </p>
                <span className="mt-2 block text-left text-[11px] text-slate-500 dark:text-slate-400">
                  {formatWhen(item.createdAt)}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function InquiryNotificationBell({ className = '', buttonClassName = '', audience = 'student' }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })

  const loadNotifications = useCallback(async () => {
    try {
      setError('')
      const data = await notificationApi.listMine()
      const allRows = Array.isArray(data?.notifications) ? data.notifications : []
      const rows = filterNotificationsByAudience(allRows, audience)
      setNotifications(rows)
      setUnreadCount(rows.filter((item) => !item?.isRead).length)
    } catch (err) {
      setError(err?.message || 'Unable to load notifications')
    } finally {
      setLoading(false)
    }
  }, [audience])

  useEffect(() => {
    loadNotifications()
    const id = setInterval(loadNotifications, POLL_MS)
    return () => clearInterval(id)
  }, [loadNotifications])

  const updateMenuPosition = useCallback(() => {
    const el = buttonRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setMenuPos({
      top: r.bottom + 8,
      right: Math.max(8, document.documentElement.clientWidth - r.right),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
    window.addEventListener('scroll', updateMenuPosition, true)
    window.addEventListener('resize', updateMenuPosition)
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true)
      window.removeEventListener('resize', updateMenuPosition)
    }
  }, [open, updateMenuPosition])

  useEffect(() => {
    function onPointerDown(e) {
      const inBell = rootRef.current?.contains(e.target)
      const inMenu = menuRef.current?.contains(e.target)
      if (!inBell && !inMenu) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const onItemActivate = useCallback(
    async (item) => {
      if (item?._id && !item.isRead) {
        try {
          const data = await notificationApi.markRead(item._id)
          setNotifications((prev) => prev.map((row) => (row._id === item._id ? { ...row, isRead: true } : row)))
          setUnreadCount(Number(data?.unreadCount) || 0)
        } catch {
          // Next poll will refresh
        }
      }
      const q = item?.inquiryId ? `?inquiryId=${item.inquiryId}` : ''
      const basePath = audience === 'admin' ? '/admin/inquiries' : '/student/inquiries'
      navigate(`${basePath}${q}`)
      setOpen(false)
    },
    [audience, navigate]
  )

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white p-0 text-base leading-none text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 ${buttonClassName}`}
        aria-label={audience === 'admin' ? 'Student inquiry notifications' : 'Inquiry reply notifications'}
        title={audience === 'admin' ? 'Student inquiries' : 'Inquiry replies'}
      >
        <span aria-hidden className="text-sky-600 dark:text-sky-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 0 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 0 2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
            />
          </svg>
        </span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[9999] w-[min(24rem,calc(100vw-1rem))]"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <InquiryNotificationDropdown
                notifications={notifications}
                loading={loading}
                error={error}
                unreadCount={unreadCount}
                onItemActivate={onItemActivate}
                audience={audience}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
