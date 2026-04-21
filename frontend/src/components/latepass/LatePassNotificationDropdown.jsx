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

export default function LatePassNotificationDropdown({
  notifications = [],
  loading = false,
  error = '',
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
}) {
  return (
    <div className="w-[22rem] max-w-[90vw] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Late Pass Notifications</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} unread</p>
        </div>
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={loading || unreadCount === 0}
          className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 disabled:opacity-50 dark:bg-indigo-950/40 dark:text-indigo-300"
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
          <p className="px-2 py-6 text-center text-sm text-slate-500 dark:text-slate-400">No late pass notifications.</p>
        ) : (
          notifications.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => onMarkRead?.(item)}
              className={`mb-2 block w-full rounded-xl border px-3 py-3 text-left transition ${
                item.read
                  ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
                  : 'border-indigo-200 bg-indigo-50/60 shadow-sm dark:border-indigo-700 dark:bg-indigo-950/30'
              }`}
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.message}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {item.roleTarget}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatWhen(item.createdAt)}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
