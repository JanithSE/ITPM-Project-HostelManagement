import EditModal from './EditModal'

export default function ConfirmDialog({
  open,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <EditModal
      open={open}
      title={title}
      onClose={() => {
        if (busy) return
        onCancel?.()
      }}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onCancel?.()}
            disabled={busy}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => onConfirm?.()}
            disabled={busy}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              danger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      }
    >
      <div className="text-sm text-slate-700 dark:text-slate-200">{message}</div>
    </EditModal>
  )
}

