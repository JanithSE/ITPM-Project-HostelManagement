import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'

const PROOF_MAX_BYTES = 5 * 1024 * 1024
const REASON_MIN = 10
const REASON_MAX = 500

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-primary-400 dark:focus:bg-slate-900'
const textareaClass =
  'w-full min-h-[100px] resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-primary-400 dark:focus:bg-slate-900'
const invalidInputRing =
  'border-red-500 dark:border-red-500/80 focus:border-red-500 focus:ring-red-500/30'

function inputClassWithError(base, hasError) {
  return hasError ? `${base} ${invalidInputRing}` : base
}

function localYmd(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysToYmd(ymdStr, days) {
  const [y, mo, d] = ymdStr.split('-').map(Number)
  const dt = new Date(y, mo - 1, d)
  dt.setDate(dt.getDate() + days)
  return localYmd(dt)
}

function normalizeGuardianPhone(raw) {
  let s = String(raw ?? '').trim().replace(/[\s\-()]/g, '')
  if (s.startsWith('+')) s = s.slice(1)
  if (s.startsWith('94') && s.length >= 10) s = `0${s.slice(2)}`
  return s
}

function isValidLkGuardianPhone(normalized) {
  return /^0[1-9]\d{8}$/.test(normalized)
}

function parseTimeToMinutes(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? '').trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

function documentLooksValid(file) {
  if (!file || file.size > PROOF_MAX_BYTES) return false
  const name = (file.name || '').toLowerCase()
  const m = ['image/jpeg', 'image/png', 'application/pdf', 'application/x-pdf']
  if (m.includes(file.type)) return true
  if (!file.type || file.type === 'application/octet-stream') {
    return /\.(jpe?g|png|pdf)$/i.test(name)
  }
  return false
}

export default function EditLatepass() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [date, setDate] = useState('')
  const [arrivingTime, setArrivingTime] = useState('')
  const [reason, setReason] = useState('')
  const [guardianContactNo, setGuardianContactNo] = useState('')
  const [documentFile, setDocumentFile] = useState(null)
  const [documentName, setDocumentName] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const todayYmd = localYmd()
  const maxDateYmd = addDaysToYmd(todayYmd, 30)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await axiosClient.get(`/latepass/${id}`)
        if (cancelled) return
        if (String(data?.status || '').toLowerCase() !== 'pending') {
          toast.error('Only pending requests can be edited.')
          navigate('/student/latepass')
          return
        }
        const ownerId = String(data?.createdBy?._id || data?.createdBy || '')
        if (!ownerId) {
          toast.error('You can only edit your own request.')
          navigate('/student/latepass')
          return
        }
        const d = data?.date ? new Date(data.date) : null
        setDate(d && !Number.isNaN(d.getTime()) ? localYmd(d) : '')
        setArrivingTime(String(data?.arrivingTime || data?.returnTime || ''))
        setReason(String(data?.reason || ''))
        setGuardianContactNo(String(data?.guardianContactNo || ''))
      } catch (err) {
        toast.error(getAxiosErrorMessage(err))
        navigate('/student/latepass')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  function validate() {
    const err = {}
    if (!date) err.date = 'Date is required.'
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) err.date = 'Select a valid date.'
    else if (date < todayYmd) err.date = 'Date cannot be in the past.'
    else if (date > maxDateYmd) err.date = 'Date cannot be more than 30 days in the future.'

    const mins = parseTimeToMinutes(arrivingTime)
    if (!arrivingTime.trim()) err.arrivingTime = 'Arriving time is required.'
    else if (mins == null) err.arrivingTime = 'Select a valid arrival time.'
    else if (mins < 20 * 60) err.arrivingTime = 'Late pass is only needed for arrivals after 8:00 PM.'

    const r = reason.trim().replace(/\s+/g, ' ')
    if (!r) err.reason = 'Reason is required.'
    else if (r.length < REASON_MIN) err.reason = `Reason must be at least ${REASON_MIN} characters.`
    else if (r.length > REASON_MAX) err.reason = `Reason must be at most ${REASON_MAX} characters.`

    const g = guardianContactNo.trim()
    if (!g) err.guardianContactNo = 'Guardian contact number is required.'
    else if (!isValidLkGuardianPhone(normalizeGuardianPhone(g))) err.guardianContactNo = 'Enter a valid guardian contact number.'

    if (documentFile && !documentLooksValid(documentFile)) {
      err.document = documentFile.size > PROOF_MAX_BYTES ? 'File size must be less than 5MB.' : 'Only JPG, PNG, and PDF files are allowed.'
    }
    return err
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    setFieldErrors(err)
    if (Object.keys(err).length) {
      toast.error('Please fix the errors below.')
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('date', date)
      fd.append('arrivingTime', arrivingTime.trim())
      fd.append('reason', reason.trim().replace(/\s+/g, ' '))
      fd.append('guardianContactNo', guardianContactNo.trim())
      if (documentFile) fd.append('document', documentFile)
      await axiosClient.put(`/latepass/${id}/edit-by-student`, fd)
      toast.success('Late pass updated successfully.')
      navigate('/student/latepass')
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

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Loading request…</p>
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Edit late pass</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Only pending requests can be edited.</p>
        </div>
        <Link
          to="/student/latepass"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Back to late pass
        </Link>
      </div>

      <div className="panel-surface rounded-2xl p-6 shadow-card sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="el-date" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              id="el-date"
              type="date"
              required
              min={todayYmd}
              max={maxDateYmd}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClassWithError(inputClass, !!fieldErrors.date)}
            />
            {fieldErrors.date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.date}</p>}
          </div>

          <div>
            <label htmlFor="el-time" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Arriving time <span className="text-red-500">*</span>
            </label>
            <input
              id="el-time"
              type="time"
              required
              min="20:00"
              value={arrivingTime}
              onChange={(e) => setArrivingTime(e.target.value)}
              className={inputClassWithError(inputClass, !!fieldErrors.arrivingTime)}
            />
            {fieldErrors.arrivingTime && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.arrivingTime}</p>
            )}
          </div>

          <div>
            <label htmlFor="el-reason" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="el-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClassWithError(textareaClass, !!fieldErrors.reason)}
            />
            {fieldErrors.reason && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.reason}</p>}
          </div>

          <div>
            <label htmlFor="el-guardian" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Guardian contact no. <span className="text-red-500">*</span>
            </label>
            <input
              id="el-guardian"
              type="text"
              inputMode="tel"
              value={guardianContactNo}
              onChange={(e) => setGuardianContactNo(e.target.value)}
              className={inputClassWithError(inputClass, !!fieldErrors.guardianContactNo)}
              placeholder="e.g. 0771234567"
            />
            {fieldErrors.guardianContactNo && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.guardianContactNo}</p>
            )}
          </div>

          <div>
            <label htmlFor="el-doc" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Replace document (optional)
            </label>
            <input
              id="el-doc"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setDocumentFile(f)
                setDocumentName(f?.name || '')
              }}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100 dark:text-slate-400 dark:file:bg-primary-900/40 dark:file:text-primary-300"
            />
            {documentName && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Selected: {documentName}</p>}
            {fieldErrors.document && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.document}</p>}
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
              to="/student/latepass"
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

