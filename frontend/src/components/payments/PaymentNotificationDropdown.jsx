/** Present `createdAt` in local short date/time string. */
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

/** Dropdown body: list rows, mark-all control, per-row mark-read + dismiss. */
export default function PaymentNotificationDropdown({
  notifications = [],
  loading = false,
  error = '',
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onRemove,
}) {
  return (
    <div className="w-[22rem] max-w-[90vw] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Payment Notifications</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} unread</p>
        </div>
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={loading || unreadCount === 0}
          className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          Mark all read
        </button>
      </div>

      <div className="max-h-[24rem] overflow-y-auto p-2">
        {loading ? (
          <p className="px-2 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading notifications...</p>
        ) : error ? (
          <p className="px-2 py-6 text-center text-sm text-rose-600 dark:text-rose-300">{error}</p>
        ) : notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-slate-500 dark:text-slate-400">No payment notifications.</p>
        ) : (
          notifications.map((item) => (
            <div
              key={item._id}
              className={`group relative mb-2 block w-full rounded-xl border transition ${
                item.read
                  ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
                  : 'border-emerald-200 bg-emerald-50/60 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/30'
              }`}
            >
              <button
                type="button"
                onClick={() => onMarkRead?.(item)}
                className="block w-full px-3 py-3 text-left"
              >
                <p className="pr-6 text-sm font-medium text-slate-900 dark:text-slate-100">{item.message}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {item.roleTarget}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatWhen(item.createdAt)}</span>
                </div>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  console.log('[Dropdown] Remove clicked for:', item._id)
                  e.stopPropagation()
                  onRemove?.(item)
                }}
                className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all hover:bg-slate-200 hover:text-slate-600 group-hover:opacity-100 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                title="Remove notification"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
