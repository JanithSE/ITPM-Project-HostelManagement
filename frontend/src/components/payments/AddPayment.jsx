import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'

const PROOF_MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_PROOF_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/x-pdf',
]

function proofFileLooksValid(file) {
  if (!file || file.size > PROOF_MAX_BYTES) return false
  const name = (file.name || '').toLowerCase()
  if (ALLOWED_PROOF_TYPES.includes(file.type)) return true
  // Windows / some browsers: empty type or octet-stream for PDFs
  if (!file.type || file.type === 'application/octet-stream') {
    return /\.(jpe?g|png|webp|pdf)$/i.test(name)
  }
  return false
}

export default function AddPayment() {
  const navigate = useNavigate()
  const [month, setMonth] = useState('')
  const [roomType, setRoomType] = useState('')
  const [facilityType, setFacilityType] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionReference, setTransactionReference] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const err = {}
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      err.month = 'Select a valid month.'
    }
    const n = Number.parseFloat(amount)
    if (amount === '' || Number.isNaN(n) || n <= 0) {
      err.amount = 'Enter a valid amount greater than zero.'
    } else if (n > 10_000_000) {
      err.amount = 'Amount is too large.'
    }
    if (roomType.length > 120) err.roomType = 'Max 120 characters.'
    if (facilityType.length > 120) err.facilityType = 'Max 120 characters.'
    if (transactionReference.length > 120) err.transactionReference = 'Max 120 characters.'
    if (!proofFile) {
      err.proof = 'Upload payment proof (image or PDF, max 10 MB).'
    } else if (!proofFileLooksValid(proofFile)) {
      err.proof =
        proofFile.size > PROOF_MAX_BYTES
          ? 'File must be 10 MB or smaller.'
          : 'Use a JPG, PNG, WebP, or PDF file.'
    }
    return err
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    setFieldErrors(err)
    if (Object.keys(err).length > 0) return

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('month', month)
      fd.append('amount', String(Number.parseFloat(amount)))
      if (roomType.trim()) fd.append('roomType', roomType.trim())
      if (facilityType.trim()) fd.append('facilityType', facilityType.trim())
      if (transactionReference.trim()) fd.append('transactionReference', transactionReference.trim())
      fd.append('proof', proofFile)

      await axiosClient.post('/payments', fd)
      toast.success('Payment submitted successfully')
      navigate('/student/payments')
    } catch (err) {
      toast.error(getAxiosErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add payment</h1>
          <p className="mt-1 text-sm text-slate-600">Submit hostel fee payment with proof.</p>
        </div>
        <Link
          to="/student/payments"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back to payments
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="ap-month" className="mb-1 block text-sm font-medium text-slate-700">
              Month
            </label>
            <input
              id="ap-month"
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value)
                setFieldErrors((f) => ({ ...f, month: undefined }))
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            {fieldErrors.month && <p className="mt-1 text-sm text-red-600">{fieldErrors.month}</p>}
          </div>

          <div>
            <label htmlFor="ap-roomtype" className="mb-1 block text-sm font-medium text-slate-700">
              Room type
            </label>
            <input
              id="ap-roomtype"
              type="text"
              value={roomType}
              onChange={(e) => {
                setRoomType(e.target.value)
                setFieldErrors((f) => ({ ...f, roomType: undefined }))
              }}
              maxLength={120}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              placeholder="e.g. Single, shared"
            />
            {fieldErrors.roomType && <p className="mt-1 text-sm text-red-600">{fieldErrors.roomType}</p>}
          </div>

          <div>
            <label htmlFor="ap-facility" className="mb-1 block text-sm font-medium text-slate-700">
              Facility type
            </label>
            <input
              id="ap-facility"
              type="text"
              value={facilityType}
              onChange={(e) => {
                setFacilityType(e.target.value)
                setFieldErrors((f) => ({ ...f, facilityType: undefined }))
              }}
              maxLength={120}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              placeholder="e.g. AC, fan"
            />
            {fieldErrors.facilityType && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.facilityType}</p>
            )}
          </div>

          <div>
            <label htmlFor="ap-amount" className="mb-1 block text-sm font-medium text-slate-700">
              Amount (LKR)
            </label>
            <input
              id="ap-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setFieldErrors((f) => ({ ...f, amount: undefined }))
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              placeholder="0.00"
            />
            {fieldErrors.amount && <p className="mt-1 text-sm text-red-600">{fieldErrors.amount}</p>}
          </div>

          <div>
            <label htmlFor="ap-ref" className="mb-1 block text-sm font-medium text-slate-700">
              Transaction reference
            </label>
            <input
              id="ap-ref"
              type="text"
              value={transactionReference}
              onChange={(e) => {
                setTransactionReference(e.target.value)
                setFieldErrors((f) => ({ ...f, transactionReference: undefined }))
              }}
              maxLength={120}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            {fieldErrors.transactionReference && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.transactionReference}</p>
            )}
          </div>

          <div>
            <label htmlFor="ap-proof" className="mb-1 block text-sm font-medium text-slate-700">
              Upload payment slip / proof
            </label>
            <input
              id="ap-proof"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                setProofFile(e.target.files?.[0] || null)
                setFieldErrors((f) => ({ ...f, proof: undefined }))
              }}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
            {fieldErrors.proof && <p className="mt-1 text-sm text-red-600">{fieldErrors.proof}</p>}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit payment'}
            </button>
            <Link
              to="/student/payments"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
