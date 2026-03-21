import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'

const REASON_MIN = 10
const REASON_MAX = 2000

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export default function AddLatepass() {
  const navigate = useNavigate()
  const [date, setDate] = useState('')
  const [roomType, setRoomType] = useState('')
  const [facilityType, setFacilityType] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [transactionReference, setTransactionReference] = useState('')
  const [reason, setReason] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const err = {}
    if (!date) {
      err.date = 'Select a valid date.'
    } else {
      const chosen = new Date(`${date}T00:00:00`)
      if (Number.isNaN(chosen.getTime())) err.date = 'Invalid date.'
      else if (chosen < startOfToday()) err.date = 'Date cannot be in the past.'
    }
    if (roomType.length > 120) err.roomType = 'Max 120 characters.'
    if (facilityType.length > 120) err.facilityType = 'Max 120 characters.'

    const rt = returnTime.trim()
    if (!rt) {
      err.returnTime = 'Enter expected return time.'
    } else if (!/^\d{1,2}:\d{2}$/.test(rt)) {
      err.returnTime = 'Use a valid time (HH:MM).'
    }

    if (transactionReference.length > 120) err.transactionReference = 'Max 120 characters.'

    const r = reason.trim()
    if (!r) {
      err.reason = 'Enter a reason for your late pass.'
    } else if (r.length < REASON_MIN) {
      err.reason = `At least ${REASON_MIN} characters.`
    } else if (r.length > REASON_MAX) {
      err.reason = `At most ${REASON_MAX} characters.`
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
      const [y, mo, d] = date.split('-').map(Number)
      const dateIso = new Date(y, mo - 1, d).toISOString()

      await axiosClient.post('/latepass', {
        date: dateIso,
        returnTime: returnTime.trim(),
        reason: reason.trim(),
        ...(roomType.trim() ? { roomType: roomType.trim() } : {}),
        ...(facilityType.trim() ? { facilityType: facilityType.trim() } : {}),
        ...(transactionReference.trim()
          ? { transactionReference: transactionReference.trim() }
          : {}),
      })
      toast.success('Late pass submitted successfully')
      navigate('/student/latepass')
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
          <h1 className="text-2xl font-bold text-slate-900">Add late pass</h1>
          <p className="mt-1 text-sm text-slate-600">Request permission to return after curfew.</p>
        </div>
        <Link
          to="/student/latepass"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back to late pass
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="al-date" className="mb-1 block text-sm font-medium text-slate-700">
              Date
            </label>
            <input
              id="al-date"
              type="date"
              min={startOfToday().toISOString().slice(0, 10)}
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setFieldErrors((f) => ({ ...f, date: undefined }))
              }}
              className={inputClass}
            />
            {fieldErrors.date && <p className="mt-1 text-sm text-red-600">{fieldErrors.date}</p>}
          </div>

          <div>
            <label htmlFor="al-roomtype" className="mb-1 block text-sm font-medium text-slate-700">
              Room type
            </label>
            <input
              id="al-roomtype"
              type="text"
              value={roomType}
              onChange={(e) => {
                setRoomType(e.target.value)
                setFieldErrors((f) => ({ ...f, roomType: undefined }))
              }}
              maxLength={120}
              className={inputClass}
              placeholder="e.g. Single, shared"
            />
            {fieldErrors.roomType && <p className="mt-1 text-sm text-red-600">{fieldErrors.roomType}</p>}
          </div>

          <div>
            <label htmlFor="al-facility" className="mb-1 block text-sm font-medium text-slate-700">
              Facility type
            </label>
            <input
              id="al-facility"
              type="text"
              value={facilityType}
              onChange={(e) => {
                setFacilityType(e.target.value)
                setFieldErrors((f) => ({ ...f, facilityType: undefined }))
              }}
              maxLength={120}
              className={inputClass}
              placeholder="e.g. AC, fan"
            />
            {fieldErrors.facilityType && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.facilityType}</p>
            )}
          </div>

          <div>
            <label htmlFor="al-time" className="mb-1 block text-sm font-medium text-slate-700">
              Return time
            </label>
            <input
              id="al-time"
              type="time"
              value={returnTime}
              onChange={(e) => {
                setReturnTime(e.target.value)
                setFieldErrors((f) => ({ ...f, returnTime: undefined }))
              }}
              className={inputClass}
            />
            {fieldErrors.returnTime && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.returnTime}</p>
            )}
          </div>

          <div>
            <label htmlFor="al-ref" className="mb-1 block text-sm font-medium text-slate-700">
              Transaction reference
            </label>
            <input
              id="al-ref"
              type="text"
              value={transactionReference}
              onChange={(e) => {
                setTransactionReference(e.target.value)
                setFieldErrors((f) => ({ ...f, transactionReference: undefined }))
              }}
              maxLength={120}
              className={inputClass}
              placeholder="Optional reference or note"
            />
            {fieldErrors.transactionReference && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.transactionReference}</p>
            )}
          </div>

          <div>
            <label htmlFor="al-reason" className="mb-1 block text-sm font-medium text-slate-700">
              Reason for late pass
            </label>
            <textarea
              id="al-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setFieldErrors((f) => ({ ...f, reason: undefined }))
              }}
              rows={4}
              maxLength={REASON_MAX}
              placeholder={`At least ${REASON_MIN} characters`}
              className={`${inputClass} min-h-[100px] resize-y`}
            />
            <p className="mt-1 text-xs text-slate-500">
              {reason.trim().length} / {REASON_MAX} (min {REASON_MIN})
            </p>
            {fieldErrors.reason && <p className="mt-1 text-sm text-red-600">{fieldErrors.reason}</p>}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit late pass'}
            </button>
            <Link
              to="/student/latepass"
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
