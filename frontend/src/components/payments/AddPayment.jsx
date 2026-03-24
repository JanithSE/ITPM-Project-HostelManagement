import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'

const PROOF_MAX_BYTES = 10 * 1024 * 1024
const ROOM_TYPES = [
  { value: 'single', label: 'Single' },
  { value: '2 person', label: '2 person' },
  { value: '3 person', label: '3 person' },
]
const FACILITY_TYPES = [
  { value: 'fan', label: 'Fan' },
  { value: 'ac', label: 'AC' },
]
const TRANSACTION_TYPES = [
  { value: 'bank slip', label: 'Bank slip' },
  { value: 'online payment', label: 'Online payment' },
]

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-primary-400 dark:focus:bg-slate-900'

function proofFileLooksValid(file) {
  if (!file || file.size > PROOF_MAX_BYTES) return false
  const name = (file.name || '').toLowerCase()
  const allowedMime = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/x-pdf',
  ]
  if (allowedMime.includes(file.type)) return true
  if (!file.type || file.type === 'application/octet-stream') {
    return /\.(jpe?g|png|webp|pdf)$/i.test(name)
  }
  return false
}

function formatAmountTwoDecimals(raw) {
  const n = Number.parseFloat(String(raw).replace(/,/g, ''))
  if (Number.isNaN(n) || n <= 0) return ''
  return n.toFixed(2)
}

export default function AddPayment() {
  const navigate = useNavigate()
  const [studentName, setStudentName] = useState('')
  const [roomNo, setRoomNo] = useState('')
  const [month, setMonth] = useState('')
  const [roomType, setRoomType] = useState('')
  const [facilityType, setFacilityType] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionType, setTransactionType] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [proofFileName, setProofFileName] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const err = {}
    if (!studentName.trim()) err.studentName = 'Student name is required.'
    if (!roomNo.trim()) err.roomNo = 'Room number is required.'
    if (!month || !/^\d{4}-\d{2}$/.test(month)) err.month = 'Select a valid month.'
    if (!ROOM_TYPES.some((r) => r.value === roomType)) err.roomType = 'Select a room type.'
    if (!FACILITY_TYPES.some((f) => f.value === facilityType)) err.facilityType = 'Select a facility type.'
    const amt = Number.parseFloat(amount)
    if (amount === '' || Number.isNaN(amt) || amt <= 0) err.amount = 'Enter a positive amount.'
    if (!TRANSACTION_TYPES.some((t) => t.value === transactionType)) {
      err.transactionType = 'Select a transaction type.'
    }
    if (!proofFile) err.proof = 'Upload slip or proof (image or PDF).'
    else if (!proofFileLooksValid(proofFile)) {
      err.proof =
        proofFile.size > PROOF_MAX_BYTES
          ? 'File must be 10 MB or smaller.'
          : 'Use JPG, PNG, WebP, or PDF.'
    }
    return err
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    setFieldErrors(err)
    if (Object.keys(err).length > 0) {
      toast.error('Please fix the errors below.')
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('studentName', studentName.trim())
      fd.append('roomNo', roomNo.trim())
      fd.append('month', month)
      fd.append('roomType', roomType)
      fd.append('facilityType', facilityType)
      fd.append('amount', formatAmountTwoDecimals(amount))
      fd.append('transactionType', transactionType)
      fd.append('proof', proofFile)

      await axiosClient.post('/payments', fd)
      toast.success('Payment submitted successfully')
      navigate('/student/payments')
    } catch (err) {
      const msg = getAxiosErrorMessage(err)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Add payment</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">All fields marked * are required.</p>
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
            <label htmlFor="ap-name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Student name <span className="text-red-500">*</span>
            </label>
            <input
              id="ap-name"
              type="text"
              value={studentName}
              onChange={(e) => {
                setStudentName(e.target.value)
                setFieldErrors((f) => ({ ...f, studentName: undefined }))
              }}
              className={inputClass}
            />
            {fieldErrors.studentName && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.studentName}</p>
            )}
          </div>

          <div>
            <label htmlFor="ap-roomno" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Room no. <span className="text-red-500">*</span>
            </label>
            <input
              id="ap-roomno"
              type="text"
              value={roomNo}
              onChange={(e) => {
                setRoomNo(e.target.value)
                setFieldErrors((f) => ({ ...f, roomNo: undefined }))
              }}
              className={inputClass}
            />
            {fieldErrors.roomNo && <p className="mt-1 text-sm text-red-600">{fieldErrors.roomNo}</p>}
          </div>

          <div>
            <label htmlFor="ap-month" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Month <span className="text-red-500">*</span>
            </label>
            <input
              id="ap-month"
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value)
                setFieldErrors((f) => ({ ...f, month: undefined }))
              }}
              className={inputClass}
            />
            {fieldErrors.month && <p className="mt-1 text-sm text-red-600">{fieldErrors.month}</p>}
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Room type <span className="text-red-500">*</span>
            </legend>
            <div className="flex flex-wrap gap-4">
              {ROOM_TYPES.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="roomType"
                    value={r.value}
                    checked={roomType === r.value}
                    onChange={() => {
                      setRoomType(r.value)
                      setFieldErrors((f) => ({ ...f, roomType: undefined }))
                    }}
                    className="h-4 w-4 border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  {r.label}
                </label>
              ))}
            </div>
            {fieldErrors.roomType && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.roomType}</p>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Facility type <span className="text-red-500">*</span>
            </legend>
            <div className="flex flex-wrap gap-4">
              {FACILITY_TYPES.map((f) => (
                <label key={f.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="facilityType"
                    value={f.value}
                    checked={facilityType === f.value}
                    onChange={() => {
                      setFacilityType(f.value)
                      setFieldErrors((fe) => ({ ...fe, facilityType: undefined }))
                    }}
                    className="h-4 w-4 border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  {f.label}
                </label>
              ))}
            </div>
            {fieldErrors.facilityType && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.facilityType}</p>
            )}
          </fieldset>

          <div>
            <label htmlFor="ap-amount" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Amount (LKR) <span className="text-red-500">*</span>
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
              onBlur={() => {
                if (amount !== '' && !Number.isNaN(Number.parseFloat(amount))) {
                  setAmount(formatAmountTwoDecimals(amount))
                }
              }}
              className={inputClass}
              placeholder="0.00"
            />
            {fieldErrors.amount && <p className="mt-1 text-sm text-red-600">{fieldErrors.amount}</p>}
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Transaction type <span className="text-red-500">*</span>
            </legend>
            <div className="flex flex-wrap gap-4">
              {TRANSACTION_TYPES.map((t) => (
                <label key={t.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="transactionType"
                    value={t.value}
                    checked={transactionType === t.value}
                    onChange={() => {
                      setTransactionType(t.value)
                      setFieldErrors((f) => ({ ...f, transactionType: undefined }))
                    }}
                    className="h-4 w-4 border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  {t.label}
                </label>
              ))}
            </div>
            {fieldErrors.transactionType && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.transactionType}</p>
            )}
          </fieldset>

          <div>
            <label htmlFor="ap-proof" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Upload slip / proof <span className="text-red-500">*</span>
            </label>
            <input
              id="ap-proof"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setProofFile(f)
                setProofFileName(f?.name || '')
                setFieldErrors((fe) => ({ ...fe, proof: undefined }))
              }}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100 dark:text-slate-400 dark:file:bg-primary-900/40 dark:file:text-primary-300"
            />
            {proofFileName && (
              <p className="mt-1 text-sm text-slate-600">
                Selected: <span className="font-medium text-slate-800">{proofFileName}</span>
              </p>
            )}
            {fieldErrors.proof && <p className="mt-1 text-sm text-red-600">{fieldErrors.proof}</p>}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Payment'}
            </button>
            <Link
              to="/student/payments"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
