import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import {
  getPersonNameError,
  normalizePersonNameInput,
  PERSON_NAME_MAX,
  PERSON_NAME_MIN,
} from '../../shared/validation/personName.js'

/** Keep in sync with backend/config/paymentPricing.js */
const DEFAULT_PRICING = {
  single: { fan: 18000, ac: 22000 },
  '2 person': { fan: 14000, ac: 18000 },
  '3 person': { fan: 11000, ac: 15000 },
}

const PROOF_MAX_BYTES = 5 * 1024 * 1024
const ROOM_NO_MAX_LEN = 15
const ROOM_NO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9\-]{0,14})?$/

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

/** Previous, current, and next calendar month as YYYY-MM (UTC), for payment month picker. */
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

function allowedPaymentMonthsSet() {
  const { previous, current, next } = paymentMonthBoundsUtc()
  return new Set([previous, current, next])
}

/** Three-letter month names; index = UTC month 0–11 (matches YYYY-MM keys). */
const MONTH_ABBREV_UTC = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const MONTH_PLACEHOLDER_DISPLAY = '-------- ----'

function ymFromYearMonthUtc(year, month0) {
  return `${year}-${String(month0 + 1).padStart(2, '0')}`
}

function paymentPickerYearBounds() {
  const { previous, current, next } = paymentMonthBoundsUtc()
  const ys = [previous, current, next].map((ym) => Number(ym.slice(0, 4)))
  return { minYear: Math.min(...ys), maxYear: Math.max(...ys) }
}

/** Same rule as backend createPayment duplicate check */
const PAYMENT_STATUSES_THAT_BLOCK_MONTH = new Set(['rejected', 'failed'])

function monthKeysAlreadyPaid(paymentsList) {
  const list = Array.isArray(paymentsList) ? paymentsList : []
  const keys = new Set()
  for (const p of list) {
    const m = p?.month
    if (!m || typeof m !== 'string') continue
    const st = String(p.status ?? '').toLowerCase()
    if (PAYMENT_STATUSES_THAT_BLOCK_MONTH.has(st)) continue
    keys.add(m)
  }
  return [...keys]
}

/** e.g. 2026-03 → "March 2026" (UTC, matches payment month keys) */
function formatYmLong(ym) {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym
  const [y, mo] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, mo - 1, 1))
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function getExpectedAmount(pricing, roomType, facilityType) {
  if (!pricing || !roomType || !facilityType) return null
  const row = pricing[roomType]
  if (!row) return null
  const n = row[facilityType]
  return typeof n === 'number' ? n : null
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

function amountsMatch(expected, actual, eps = 0.005) {
  if (expected == null || !Number.isFinite(actual)) return false
  return Math.abs(Number(actual) - Number(expected)) < eps
}

/** Inline live validation: show while typing. Use `blur: true` for required-if-empty. */
const invalidInputRing =
  'border-red-500 dark:border-red-500/80 focus:border-red-500 focus:ring-red-500/30'

function inputClassWithError(base, hasError) {
  return hasError ? `${base} ${invalidInputRing}` : base
}

function liveValidateRoomNo(raw, { blur = false } = {}) {
  const roomTrim = String(raw ?? '').trim()
  if (!roomTrim) return blur ? 'Room number is required.' : undefined
  if (roomTrim.length > ROOM_NO_MAX_LEN) {
    return `Room number must be at most ${ROOM_NO_MAX_LEN} characters.`
  }
  if (!ROOM_NO_RE.test(roomTrim)) {
    return 'Use letters, digits, or a hyphen only (e.g. A101, B-12).'
  }
  return undefined
}

function liveValidateMonth(month, { blur = false, paidMonths = null } = {}) {
  if (!month) return blur ? 'Select a valid month.' : undefined
  if (!/^\d{4}-\d{2}$/.test(month)) return 'Select a valid month.'
  const [, mm] = month.split('-')
  const mNum = Number.parseInt(mm, 10)
  if (mNum < 1 || mNum > 12) return 'Select a valid month.'
  const allowed = allowedPaymentMonthsSet()
  if (!allowed.has(month)) {
    return 'You can only select the previous month, the current month, or the next month.'
  }
  if (paidMonths && paidMonths.has(month)) {
    return 'Payment for this month already exists.'
  }
  return undefined
}

function liveValidateRoomType(value, { blur = false } = {}) {
  if (!ROOM_TYPES.some((r) => r.value === value)) {
    return blur ? 'Select a room type.' : undefined
  }
  return undefined
}

function liveValidateFacilityType(value, { blur = false } = {}) {
  if (!FACILITY_TYPES.some((f) => f.value === value)) {
    return blur ? 'Select a facility type.' : undefined
  }
  return undefined
}

function liveValidateAmount(raw, roomType, facilityType, pricing, { blur = false } = {}) {
  const amountStr = String(raw ?? '').replace(/,/g, '').trim()
  if (amountStr === '') return blur ? 'Amount is required.' : undefined
  const amt = Number.parseFloat(amountStr)
  if (Number.isNaN(amt)) return 'Enter a valid amount in LKR (numbers only).'
  if (amt <= 0) return 'Amount must be greater than 0.'
  if (amountStr.includes('.')) {
    const dec = amountStr.split('.')[1] || ''
    if (dec.length > 2) return 'Use at most 2 decimal places (e.g. 5000.00).'
  }
  const expected = getExpectedAmount(pricing, roomType, facilityType)
  if (
    ROOM_TYPES.some((r) => r.value === roomType) &&
    FACILITY_TYPES.some((f) => f.value === facilityType) &&
    expected != null &&
    !amountsMatch(expected, amt)
  ) {
    return 'Amount does not match the selected room and facility type.'
  }
  return undefined
}

function liveValidateTransactionType(value, { blur = false } = {}) {
  if (!TRANSACTION_TYPES.some((t) => t.value === value)) {
    return blur ? 'Select a transaction type.' : undefined
  }
  return undefined
}

function liveValidateProof(file, { blur = false } = {}) {
  if (!file) return blur ? 'Upload a payment slip or proof.' : undefined
  if (!proofFileLooksValid(file)) {
    return file.size > PROOF_MAX_BYTES
      ? 'File size must be less than 5MB.'
      : 'Only JPG, PNG, and PDF files are allowed.'
  }
  return undefined
}

export default function AddPayment() {
  const navigate = useNavigate()
  const [pricing, setPricing] = useState(DEFAULT_PRICING)
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
  const [paidMonthKeys, setPaidMonthKeys] = useState([])
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => Number(paymentMonthBoundsUtc().current.slice(0, 4)))
  const monthPickerRef = useRef(null)

  const paidMonths = useMemo(() => new Set(paidMonthKeys), [paidMonthKeys])

  const { minYear: pickerMinYear, maxYear: pickerMaxYear } = paymentPickerYearBounds()
  const canGoPickerYearPrev = viewYear > pickerMinYear
  const canGoPickerYearNext = viewYear < pickerMaxYear

  useEffect(() => {
    if (!monthPickerOpen) return
    function onDocMouseDown(e) {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target)) {
        setMonthPickerOpen(false)
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') setMonthPickerOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [monthPickerOpen])

  function openMonthPicker() {
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      setViewYear(Number(month.slice(0, 4)))
    } else {
      setViewYear(Number(paymentMonthBoundsUtc().current.slice(0, 4)))
    }
    setMonthPickerOpen(true)
  }

  function selectPaymentMonthYm(ym) {
    setMonth(ym)
    setMonthPickerOpen(false)
    setFieldErrors((f) => ({
      ...f,
      month: liveValidateMonth(ym, { paidMonths }),
    }))
  }

  function clearPaymentMonth() {
    setMonth('')
    setFieldErrors((f) => ({
      ...f,
      month: liveValidateMonth('', { blur: true, paidMonths }),
    }))
  }

  function selectThisUtcMonth() {
    selectPaymentMonthYm(paymentMonthBoundsUtc().current)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await axiosClient.get('/payments/pricing')
        if (!cancelled && data?.pricing) setPricing(data.pricing)
      } catch {
        if (!cancelled) setPricing(DEFAULT_PRICING)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await axiosClient.get('/payments/my')
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        setPaidMonthKeys(monthKeysAlreadyPaid(list))
      } catch {
        if (!cancelled) setPaidMonthKeys([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  /** Prefer first allowed month that does not already have a payment */
  useEffect(() => {
    const paid = new Set(paidMonthKeys)
    const { previous, current, next } = paymentMonthBoundsUtc()
    const order = [previous, current, next]
    setMonth((prev) => {
      const prevOk = prev && !paid.has(prev) && order.includes(prev)
      if (prevOk) return prev
      for (const ym of order) {
        if (!paid.has(ym)) return ym
      }
      return ''
    })
  }, [paidMonthKeys])

  useEffect(() => {
    const expected = getExpectedAmount(pricing, roomType, facilityType)
    if (expected != null) {
      const next = expected.toFixed(2)
      setAmount(next)
      setFieldErrors((f) => ({
        ...f,
        amount: liveValidateAmount(next, roomType, facilityType, pricing),
      }))
    }
  }, [pricing, roomType, facilityType])

  function validate() {
    const err = {}
    const nameErr = getPersonNameError(studentName, { blur: true })
    if (nameErr) err.studentName = nameErr

    const roomTrim = roomNo.trim()
    if (!roomTrim) {
      err.roomNo = 'Room number is required.'
    } else if (roomTrim.length > ROOM_NO_MAX_LEN) {
      err.roomNo = `Room number must be at most ${ROOM_NO_MAX_LEN} characters.`
    } else if (!ROOM_NO_RE.test(roomTrim)) {
      err.roomNo = 'Enter a valid room number (letters, digits, optional hyphen).'
    }

    const allowed = allowedPaymentMonthsSet()
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      err.month = 'Select a valid month.'
    } else {
      const [, mm] = month.split('-')
      const mNum = Number.parseInt(mm, 10)
      if (mNum < 1 || mNum > 12) err.month = 'Select a valid month.'
      else if (!allowed.has(month)) {
        err.month = 'You can only pay for the previous month, the current month, or the next month.'
      } else if (paidMonths.has(month)) {
        err.month = 'Payment for this month already exists.'
      }
    }

    if (!ROOM_TYPES.some((r) => r.value === roomType)) err.roomType = 'Select a room type.'
    if (!FACILITY_TYPES.some((f) => f.value === facilityType)) err.facilityType = 'Select a facility type.'

    const amt = Number.parseFloat(String(amount).replace(/,/g, ''))
    const amountStr = String(amount ?? '').replace(/,/g, '').trim()

    if (amount === '' || amount == null) {
      err.amount = 'Amount is required.'
    } else if (Number.isNaN(amt)) {
      err.amount = 'Enter a valid amount in LKR.'
    } else if (amt <= 0) {
      err.amount = 'Amount must be greater than 0.'
    } else if (amountStr.includes('.')) {
      const dec = amountStr.split('.')[1] || ''
      if (dec.length > 2) err.amount = 'Enter a valid amount in LKR (up to 2 decimal places).'
    }

    const expected = getExpectedAmount(pricing, roomType, facilityType)
    if (
      !err.amount &&
      !err.roomType &&
      !err.facilityType &&
      expected != null &&
      !amountsMatch(expected, amt)
    ) {
      err.amount = 'Amount does not match the selected room and facility type.'
    }

    if (!TRANSACTION_TYPES.some((t) => t.value === transactionType)) {
      err.transactionType = 'Select a transaction type.'
    }

    if (!proofFile) {
      err.proof = 'Upload a payment slip or proof.'
    } else if (!proofFileLooksValid(proofFile)) {
      err.proof =
        proofFile.size > PROOF_MAX_BYTES
          ? 'File size must be less than 5MB.'
          : 'Only JPG, PNG, and PDF files are allowed.'
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
      fd.append('studentName', normalizePersonNameInput(studentName))
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
    } catch (errAxios) {
      const data = errAxios.response?.data
      if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
        setFieldErrors((prev) => ({ ...prev, ...data.fieldErrors }))
      }
      toast.error(getAxiosErrorMessage(errAxios))
    } finally {
      setSubmitting(false)
    }
  }

  const { previous: optPrev, current: optCurrent, next: optNext } = paymentMonthBoundsUtc()
  const monthOptions = [
    { ym: optPrev, paid: paidMonths.has(optPrev) },
    { ym: optCurrent, paid: paidMonths.has(optCurrent) },
    { ym: optNext, paid: paidMonths.has(optNext) },
  ]
  const allAllowedMonthsPaid = monthOptions.every((o) => o.paid)
  const allowedYmSet = allowedPaymentMonthsSet()
  const currentUtcYm = paymentMonthBoundsUtc().current

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Add payment</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            All fields marked * are required. You can pay for the previous month, this month, or next month only. The
            month list shows if a payment is already on file. Amount follows room type + facility (LKR).
          </p>
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
              required
              minLength={PERSON_NAME_MIN}
              maxLength={PERSON_NAME_MAX}
              autoComplete="name"
              value={studentName}
              onChange={(e) => {
                const v = e.target.value
                setStudentName(v)
                setFieldErrors((f) => ({
                  ...f,
                  studentName: getPersonNameError(v),
                }))
              }}
              onBlur={() =>
                setFieldErrors((f) => ({
                  ...f,
                  studentName: getPersonNameError(studentName, { blur: true }),
                }))
              }
              className={inputClassWithError(inputClass, !!fieldErrors.studentName)}
              placeholder="e.g. Shrihara Perera"
              aria-invalid={Boolean(fieldErrors.studentName)}
            />
            {fieldErrors.studentName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.studentName}</p>
            )}
          </div>

          <div>
            <label htmlFor="ap-roomno" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Room no. <span className="text-red-500">*</span>
            </label>
            <input
              id="ap-roomno"
              type="text"
              required
              maxLength={ROOM_NO_MAX_LEN}
              value={roomNo}
              onChange={(e) => {
                const v = e.target.value
                setRoomNo(v)
                setFieldErrors((f) => ({ ...f, roomNo: liveValidateRoomNo(v) }))
              }}
              onBlur={() =>
                setFieldErrors((f) => ({
                  ...f,
                  roomNo: liveValidateRoomNo(roomNo, { blur: true }),
                }))
              }
              className={inputClassWithError(inputClass, !!fieldErrors.roomNo)}
              placeholder="e.g. A101, B-12, 104"
              aria-invalid={Boolean(fieldErrors.roomNo)}
            />
            {fieldErrors.roomNo && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.roomNo}</p>}
          </div>

          <div>
            <label htmlFor="ap-month" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Month <span className="text-red-500">*</span>
            </label>
            <div ref={monthPickerRef} className="relative">
              <button
                type="button"
                id="ap-month"
                disabled={allAllowedMonthsPaid}
                onClick={() => (monthPickerOpen ? setMonthPickerOpen(false) : openMonthPicker())}
                onBlur={() =>
                  setFieldErrors((f) => ({
                    ...f,
                    month: liveValidateMonth(month, { blur: true, paidMonths }),
                  }))
                }
                aria-expanded={monthPickerOpen}
                aria-haspopup="dialog"
                aria-controls="ap-month-calendar"
                className={`relative flex w-full items-center rounded-xl border py-2.5 pl-3.5 pr-10 text-left text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 ${
                  fieldErrors.month
                    ? `${invalidInputRing} border-red-500 bg-slate-50/50 dark:border-red-500/80 dark:bg-slate-800/50`
                    : 'border-slate-200 bg-slate-50/50 focus:border-primary-500 focus:bg-white dark:border-slate-600 dark:bg-slate-800/50 dark:focus:border-primary-400 dark:focus:bg-slate-900'
                }`}
                aria-invalid={Boolean(fieldErrors.month)}
              >
                <span className="min-w-0 flex-1 truncate font-mono text-[15px] tracking-wide">
                  {month ? (
                    formatYmLong(month)
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">{MONTH_PLACEHOLDER_DISPLAY}</span>
                  )}
                </span>
                <span
                  className="pointer-events-none absolute right-3 top-1/2 z-[1] -translate-y-1/2 text-slate-500 dark:text-slate-400"
                  aria-hidden
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5"
                    />
                  </svg>
                </span>
              </button>

              {monthPickerOpen && !allAllowedMonthsPaid && (
                <div
                  id="ap-month-calendar"
                  role="dialog"
                  aria-label="Choose payment month"
                  className="absolute left-0 right-0 z-50 mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-600 dark:bg-slate-800 sm:left-auto sm:min-w-[300px]"
                >
                  <div className="flex items-center justify-between gap-2 pb-2">
                    <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {viewYear}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700"
                        disabled={!canGoPickerYearPrev}
                        aria-label="Previous year"
                        onClick={() => setViewYear((y) => y - 1)}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700"
                        disabled={!canGoPickerYearNext}
                        aria-label="Next year"
                        onClick={() => setViewYear((y) => y + 1)}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-600" />
                  <div className="grid grid-cols-4 gap-1.5 pt-3">
                    {MONTH_ABBREV_UTC.map((label, month0) => {
                      const ym = ymFromYearMonthUtc(viewYear, month0)
                      const inWindow = allowedYmSet.has(ym)
                      const paid = paidMonths.has(ym)
                      const clickable = inWindow && !paid
                      const isSelected = month === ym
                      let title = ''
                      if (!inWindow) title = 'Not available for payment'
                      else if (paid) title = 'Payment already submitted for this month'
                      return (
                        <button
                          key={`${viewYear}-${month0}`}
                          type="button"
                          title={title || undefined}
                          disabled={!clickable}
                          onClick={() => selectPaymentMonthYm(ym)}
                          className={`rounded-md py-2 text-center text-xs font-semibold transition-colors sm:text-sm ${
                            isSelected && clickable
                              ? 'bg-slate-200 text-slate-900 ring-1 ring-slate-300 dark:bg-slate-600 dark:text-white dark:ring-slate-500'
                              : !clickable
                                ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
                                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/80'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-600">
                    <button
                      type="button"
                      className="text-sm font-medium text-sky-500 hover:text-sky-400 dark:text-sky-400 dark:hover:text-sky-300"
                      onClick={clearPaymentMonth}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      disabled={paidMonths.has(currentUtcYm)}
                      title={paidMonths.has(currentUtcYm) ? 'Payment already submitted for this month' : undefined}
                      className="text-sm font-medium text-sky-500 hover:text-sky-400 disabled:cursor-not-allowed disabled:opacity-40 dark:text-sky-400 dark:hover:text-sky-300"
                      onClick={selectThisUtcMonth}
                    >
                      This month
                    </button>
                  </div>
                </div>
              )}
            </div>
            {allAllowedMonthsPaid && (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300" role="status">
                You already have a payment on file for the previous, current, and next month (pending, processing, or
                completed). Submit is disabled until at least one is rejected or a new payment window applies.
              </p>
            )}
            {fieldErrors.month && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.month}</p>}
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
                    required
                    value={r.value}
                    checked={roomType === r.value}
                    onChange={() => {
                      setRoomType(r.value)
                      setFieldErrors((f) => ({
                        ...f,
                        roomType: undefined,
                        facilityType: liveValidateFacilityType(facilityType, { blur: true }),
                      }))
                    }}
                    className="h-4 w-4 border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  {r.label}
                </label>
              ))}
            </div>
            {fieldErrors.roomType && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.roomType}</p>
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
                    required
                    value={f.value}
                    checked={facilityType === f.value}
                    onChange={() => {
                      setFacilityType(f.value)
                      setFieldErrors((fe) => ({
                        ...fe,
                        facilityType: undefined,
                        roomType: liveValidateRoomType(roomType, { blur: true }),
                      }))
                    }}
                    className="h-4 w-4 border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  {f.label}
                </label>
              ))}
            </div>
            {fieldErrors.facilityType && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.facilityType}</p>
            )}
          </fieldset>

          <div>
            <label htmlFor="ap-amount" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Amount (LKR) <span className="text-red-500">*</span>
            </label>
            <input
              id="ap-amount"
              type="number"
              required
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => {
                const v = e.target.value
                setAmount(v)
                setFieldErrors((f) => ({
                  ...f,
                  amount: liveValidateAmount(v, roomType, facilityType, pricing),
                }))
              }}
              onBlur={() => {
                let next = amount
                if (amount !== '' && !Number.isNaN(Number.parseFloat(amount))) {
                  next = formatAmountTwoDecimals(amount)
                  setAmount(next)
                }
                setFieldErrors((f) => ({
                  ...f,
                  amount: liveValidateAmount(next, roomType, facilityType, pricing, { blur: true }),
                }))
              }}
              className={inputClassWithError(inputClass, !!fieldErrors.amount)}
              placeholder="0.00"
              aria-invalid={Boolean(fieldErrors.amount)}
            />
            {fieldErrors.amount && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.amount}</p>}
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
                    required
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
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.transactionType}</p>
            )}
          </fieldset>

          <div>
            <label htmlFor="ap-proof" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Upload slip / proof <span className="text-red-500">*</span>
            </label>
            <input
              id="ap-proof"
              type="file"
              required
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setProofFile(f)
                setProofFileName(f?.name || '')
                setFieldErrors((fe) => ({ ...fe, proof: liveValidateProof(f) }))
              }}
              onBlur={() =>
                setFieldErrors((fe) => ({
                  ...fe,
                  proof: liveValidateProof(proofFile, { blur: true }),
                }))
              }
              className={`block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100 dark:text-slate-400 dark:file:bg-primary-900/40 dark:file:text-primary-300 ${
                fieldErrors.proof ? invalidInputRing : ''
              }`}
            />
            {proofFileName && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Selected: <span className="font-medium text-slate-800 dark:text-slate-200">{proofFileName}</span>
              </p>
            )}
            {fieldErrors.proof && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.proof}</p>}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || allAllowedMonthsPaid}
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
