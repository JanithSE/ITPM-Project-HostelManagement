const STYLES = {
  pending: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  processing: 'bg-blue-100 text-blue-800 ring-blue-600/20',
  completed: 'bg-blue-100 text-blue-800 ring-blue-600/20',
  paid: 'bg-primary-100 text-primary-800 ring-primary-600/20',
  approved: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  rejected: 'bg-red-100 text-red-800 ring-red-600/20',
  failed: 'bg-red-100 text-red-800 ring-red-600/20',
}

function labelFor(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'completed' || s === 'paid') return 'Completed'
  if (s === 'approved') return 'Approved'
  if (s === 'rejected' || s === 'failed') return 'Rejected'
  if (s === 'processing') return 'Processing'
  if (s === 'pending') return 'Pending'
  return status ? String(status) : '—'
}

export default function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase()
  const style = STYLES[s] || 'bg-slate-100 text-slate-700 ring-slate-500/20'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {labelFor(status)}
    </span>
  )
}
