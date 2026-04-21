import { useCallback, useEffect, useRef, useState } from 'react'
import { paymentNotificationApi } from '../../shared/api/client'
import PaymentNotificationPanel from './PaymentNotificationPanel'

export default function PaymentNotificationBell({ className = '', buttonClassName = '' }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const rootRef = useRef(null)

  const loadNotifications = useCallback(async () => {
    try {
      setError('')
      const data = await paymentNotificationApi.listMine()
      const rows = Array.isArray(data?.notifications) ? data.notifications : []
      setNotifications(rows)
      setUnreadCount(Number(data?.unreadCount) || 0)
    } catch (err) {
      setError(err?.message || 'Unable to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
    const id = setInterval(loadNotifications, 25000)
    return () => clearInterval(id)
  }, [loadNotifications])

  useEffect(() => {
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const markRead = useCallback(async (item) => {
    if (!item?._id || item.read) return
    try {
      const data = await paymentNotificationApi.markRead(item._id)
      setNotifications((prev) => prev.map((row) => (row._id === item._id ? { ...row, read: true } : row)))
      setUnreadCount(Number(data?.unreadCount) || 0)
    } catch {
      // poll refreshes eventually
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await paymentNotificationApi.markAllRead()
      setNotifications((prev) => prev.map((row) => ({ ...row, read: true })))
      setUnreadCount(0)
    } catch {
      // poll refreshes eventually
    }
  }, [])

  return (
    <div ref={rootRef} className={`relative z-[210] ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 ${buttonClassName}`}
        aria-label="Payment notifications"
      >
        <span aria-hidden>💳</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <PaymentNotificationPanel
          notifications={notifications}
          loading={loading}
          error={error}
          unreadCount={unreadCount}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
      ) : null}
    </div>
  )
}
