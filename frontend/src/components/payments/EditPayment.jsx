import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'

const ROOM_TYPES = [
  { value: 'single', label: 'Single' },
  { value: '2 person', label: '2 person' },
  { value: '3 person', label: '3 person' },
]

const FACILITY_TYPES = [
  { value: 'fan', label: 'Fan' },
  { value: 'ac', label: 'AC' },
]

const PROOF_MAX_BYTES = 5 * 1024 * 1024

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-primary-400 dark:focus:bg-slate-900'
const invalidInputRing =
  'border-red-500 dark:border-red-500/80 focus:border-red-500 focus:ring-red-500/30'

function inputClassWithError(base, hasError) {
  return hasError ? `${base} ${invalidInputRing}` : base
}

function paymentMonthBoundsUtc() {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m0 = d.getUTCMonth()
  const prevDate = new Date(Date.UTC(y, m0 - 1, 1))
  const previous = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`
  const current = `${y}-${String(m0 + 1).padStart(2, '0')}`
  const nextDate = new Date(Date.UTC(y, m0 + 1, 1))
  const next = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`
  return { previous, current, next }
}

function formatYmLong(ym) {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym
  const [y, mo] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, mo - 1, 1))
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function proofFileLooksValid(file) {
  if (!file || file.size > PROOF_MAX_BYTES) return false
  const name = (file.name || '').toLowerCase()
  const allowedMime = ['image/jpeg', 'image/png', 'application/pdf', 'application/x-pdf']
  if (allowedMime.includes(file.type)) return true
  if (!file.type || file.type === 'application/octet-stream') {
    return /\.(jpe?g|png|pdf)$/i.test(name)
  }
  return false
}

function formatAmountTwoDecimals(raw) {
  const n = Number.parseFloat(String(raw).replace(/,/g, ''))
  if (Number.isNaN(n) || n <= 0) return ''
  return n.toFixed(2)
}

export default function EditPayment() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [month, setMonth] = useState('')
  const [roomType, setRoomType] = useState('')
  const [facilityType, setFacilityType] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionReference, setTransactionReference] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [proofFileName, setProofFileName] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const { previous, current, next } = paymentMonthBoundsUtc()
  const monthOptions = useMemo(() => [previous, current, next], [previous, current, next])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const { data } = await axiosClient.get(`/payments/${id}`)
        if (cancelled) return
        if (String(data?.status || '').toLowerCase() !== 'pending') {
          toast.error('Only pending payments can be edited.')
          navigate('/student/payments')
          return
        }
        setMonth(String(data?.month || ''))
        setRoomType(String(data?.roomType || ''))
        setFacilityType(String(data?.facilityType || ''))
        setAmount(String(data?.amount ?? ''))
        setTransactionReference(String(data?.transactionReference || ''))
      } catch (err) {
        if (!cancelled) {
          toast.error(getAxiosErrorMessage(err))
          navigate('/student/payments')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (proofFile && !proofFileLooksValid(proofFile)) {
      setFieldErrors((prev) => ({
        ...prev,
        proof: proofFile.size > PROOF_MAX_BYTES ? 'File size must be less than 5MB.' : 'Only JPG, PNG, and PDF files are allowed.',
      }))
      toast.error('Please fix the errors below.')
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('month', month)
      fd.append('roomType', roomType)
      fd.append('facilityType', facilityType)
      fd.append('amount', formatAmountTwoDecimals(amount))
      fd.append('transactionReference', transactionReference.trim())
      if (proofFile) fd.append('proof', proofFile)

      await axiosClient.put(`/payments/${id}/edit-by-student`, fd)
      toast.success('Payment updated successfully.')
      navigate('/student/payments')
    } catch (err) {
      const data = err.response?.data
      if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
        setFieldErrors((prev) => ({ ...prev, ...data.fieldErrors }))
      }
      toast.error(getAxiosErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Loading payment…</p>
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Edit payment</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Only pending payments can be edited.</p>
        </div>
        <Link
          to="/student/payments"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Back to payments
        </Link>
      </div>

      <div className="panel-surface rounded-2xl p-6 shadow-card sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="ep-month" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Month <span className="text-red-500">*</span>
            </label>
            <select
              id="ep-month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={inputClassWithError(inputClass, !!fieldErrors.month)}
              aria-invalid={Boolean(fieldErrors.month)}
              required
            >
              <option value="">Select month…</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {formatYmLong(m)}
                </option>
              ))}
            </select>
            {fieldErrors.month && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.month}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ep-room-type" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Room type <span className="text-red-500">*</span>
              </label>
              <select
                id="ep-room-type"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className={inputClassWithError(inputClass, !!fieldErrors.roomType)}
                required
              >
                <option value="">Select room type…</option>
                {ROOM_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {fieldErrors.roomType && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.roomType}</p>}
            </div>

            <div>
              <label htmlFor="ep-facility" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Facility type <span className="text-red-500">*</span>
              </label>
              <select
                id="ep-facility"
                value={facilityType}
                onChange={(e) => setFacilityType(e.target.value)}
                className={inputClassWithError(inputClass, !!fieldErrors.facilityType)}
                required
              >
                <option value="">Select facility…</option>
                {FACILITY_TYPES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              {fieldErrors.facilityType && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.facilityType}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="ep-amount" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Amount (LKR) <span className="text-red-500">*</span>
            </label>
            <input
              id="ep-amount"
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClassWithError(inputClass, !!fieldErrors.amount)}
              placeholder="e.g. 15000.00"
              required
            />
            {fieldErrors.amount && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.amount}</p>}
          </div>

          <div>
            <label htmlFor="ep-tx-ref" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Transaction reference
            </label>
            <input
              id="ep-tx-ref"
              type="text"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              maxLength={100}
              className={inputClassWithError(inputClass, !!fieldErrors.transactionReference)}
              placeholder="Optional reference number"
            />
            {fieldErrors.transactionReference && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.transactionReference}</p>
            )}
          </div>

          <div>
            <label htmlFor="ep-proof" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Replace payment proof (optional)
            </label>
            <input
              id="ep-proof"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setProofFile(f)
                setProofFileName(f?.name || '')
                if (f && !proofFileLooksValid(f)) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    proof: f.size > PROOF_MAX_BYTES ? 'File size must be less than 5MB.' : 'Only JPG, PNG, and PDF files are allowed.',
                  }))
                } else {
                  setFieldErrors((prev) => ({ ...prev, proof: undefined }))
                }
              }}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100 dark:text-slate-400 dark:file:bg-primary-900/40 dark:file:text-primary-300"
            />
            {proofFileName && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Selected: {proofFileName}</p>}
            {fieldErrors.proof && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.proof}</p>}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
            <Link
              to="/student/payments"
              className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
