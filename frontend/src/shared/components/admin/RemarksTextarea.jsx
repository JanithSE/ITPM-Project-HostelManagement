import { useEffect, useRef } from 'react'

export default function RemarksTextarea({
  label = 'Admin Remarks (optional)',
  required = false,
  placeholder = 'Enter admin remarks...',
  value,
  onChange,
  disabled = false,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}{' '}
        {required ? <span className="text-rose-600 dark:text-rose-400">*</span> : null}
      </label>
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-primary-400"
      />
    </div>
  )
}

