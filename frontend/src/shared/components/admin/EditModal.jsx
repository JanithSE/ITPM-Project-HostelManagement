import { useEffect } from 'react'

export default function EditModal({ open, title, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.()
        }}
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-6">
          <div>
            <h2 id="edit-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
        {footer ? (
          <div className="border-t border-slate-100 p-4 dark:border-slate-800 sm:p-6">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}

