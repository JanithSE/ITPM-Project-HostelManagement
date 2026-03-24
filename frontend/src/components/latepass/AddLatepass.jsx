import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'

const PROOF_MAX_BYTES = 10 * 1024 * 1024
/** Shared Tailwind for text inputs (semantic BEM added per element) */
const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-primary-400 dark:focus:bg-slate-900'
const textareaClass =
  'late-pass-form__textarea w-full min-h-[100px] resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-primary-400 dark:focus:bg-slate-900'
const fileInputClass =
  'late-pass-form__input--file block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100 dark:text-slate-400 dark:file:bg-primary-900/40 dark:file:text-primary-300'

const PHONE_RE = /^[0-9+\s\-()]{8,22}$/
const STUDENT_ID_RE = /^[A-Za-z]{2}\d{8}$/

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function documentLooksValid(file) {
  if (!file || file.size > PROOF_MAX_BYTES) return false
  const name = (file.name || '').toLowerCase()
  const m = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/x-pdf',
  ]
  if (m.includes(file.type)) return true
  if (!file.type || file.type === 'application/octet-stream') {
    return /\.(jpe?g|png|webp|pdf)$/i.test(name)
  }
  return false
}

function emptyStudentRow() {
  return { studentName: '', studentId: '', roomNo: '' }
}

export default function AddLatepass() {
  const navigate = useNavigate()
  const [date, setDate] = useState('')
  const [arrivingTime, setArrivingTime] = useState('')
  const [reason, setReason] = useState('')
  const [guardianContactNo, setGuardianContactNo] = useState('')
  const [documentFile, setDocumentFile] = useState(null)
  const [documentName, setDocumentName] = useState('')
  const [students, setStudents] = useState([emptyStudentRow()])
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function setStudentRow(index, key, value) {
    setStudents((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
    setFieldErrors((e) => ({ ...e, [`student_${index}_${key}`]: undefined, students: undefined }))
  }

  function addStudentRow() {
    setStudents((prev) => [...prev, emptyStudentRow()])
  }

  function removeStudentRow(index) {
    if (students.length <= 1) {
      toast.error('At least one student row is required.')
      return
    }
    setStudents((prev) => prev.filter((_, i) => i !== index))
    setFieldErrors({})
  }

  function validate() {
    const err = {}
    if (!date) err.date = 'Date is required.'
    else {
      const chosen = new Date(`${date}T00:00:00`)
      if (Number.isNaN(chosen.getTime())) err.date = 'Invalid date.'
      else if (chosen < startOfToday()) err.date = 'Date cannot be in the past.'
    }
    if (!arrivingTime.trim()) err.arrivingTime = 'Arriving time is required.'
    if (!reason.trim()) err.reason = 'Reason is required.'
    if (!guardianContactNo.trim()) err.guardianContactNo = 'Guardian contact is required.'
    else if (!PHONE_RE.test(guardianContactNo.trim())) {
      err.guardianContactNo = 'Use 8–22 characters: digits, +, spaces, dashes, or parentheses.'
    }
    if (!documentFile) err.document = 'Document upload is required.'
    else if (!documentLooksValid(documentFile)) {
      err.document =
        documentFile.size > PROOF_MAX_BYTES ? 'Max 10 MB.' : 'Use JPG, PNG, WebP, or PDF.'
    }

    students.forEach((row, i) => {
      if (!row.studentName.trim()) err[`student_${i}_studentName`] = 'Required'
      if (!row.studentId.trim()) err[`student_${i}_studentId`] = 'Required'
      else if (!STUDENT_ID_RE.test(row.studentId.trim())) {
        err[`student_${i}_studentId`] = 'Use 2 letters + 8 numbers (e.g. IT23603318).'
      }
      if (!row.roomNo.trim()) err[`student_${i}_roomNo`] = 'Required'
    })

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
      const [y, mo, d] = date.split('-').map(Number)
      const dateIso = new Date(y, mo - 1, d).toISOString()

      const fd = new FormData()
      fd.append('date', dateIso)
      fd.append('arrivingTime', arrivingTime.trim())
      fd.append('reason', reason.trim())
      fd.append('guardianContactNo', guardianContactNo.trim())
      fd.append(
        'students',
        JSON.stringify(
          students.map((s) => ({
            studentName: s.studentName.trim(),
            studentId: s.studentId.trim(),
            roomNo: s.roomNo.trim(),
          }))
        )
      )
      fd.append('document', documentFile)

      await axiosClient.post('/latepass', fd)
      toast.success('Late pass submitted successfully')
      navigate('/student/latepass')
    } catch (err) {
      toast.error(getAxiosErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="late-pass-form late-pass-form--page mx-auto w-full max-w-3xl">
      <div className="late-pass-form__page-header mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="late-pass-form__intro">
          <h1 id="late-pass-form-title" className="late-pass-form__title text-2xl font-bold text-slate-900 dark:text-slate-50">
            Add late pass
          </h1>
          <p className="late-pass-form__subtitle mt-1 text-sm text-slate-600 dark:text-slate-400">
            All fields marked * are required.
          </p>
        </div>
        <Link
          to="/student/latepass"
          className="late-pass-form__link late-pass-form__link--back inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Back to late pass
        </Link>
      </div>

      <div className="late-pass-form__card panel-surface rounded-2xl p-6 shadow-card sm:p-8">
        <form
          onSubmit={handleSubmit}
          className="late-pass-form__form space-y-6"
          noValidate
          aria-labelledby="late-pass-form-title"
        >
          <div className="late-pass-form__field late-pass-form__field--date">
            <label
              htmlFor="al-date"
              className="late-pass-form__label late-pass-form__label--date mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Date <span className="late-pass-form__required text-red-500">*</span>
            </label>
            <input
              id="al-date"
              name="latePassDate"
              type="date"
              min={startOfToday().toISOString().slice(0, 10)}
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setFieldErrors((f) => ({ ...f, date: undefined }))
              }}
              className={`late-pass-form__input late-pass-form__input--date ${inputClass}`}
              aria-invalid={Boolean(fieldErrors.date)}
              aria-describedby={fieldErrors.date ? 'al-date-error' : undefined}
            />
            {fieldErrors.date && (
              <p id="al-date-error" className="late-pass-form__error late-pass-form__error--date mt-1 text-sm text-red-600" role="alert">
                {fieldErrors.date}
              </p>
            )}
          </div>

          <div className="late-pass-form__field late-pass-form__field--arriving-time">
            <label
              htmlFor="al-time"
              className="late-pass-form__label late-pass-form__label--arriving-time mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Arriving time <span className="late-pass-form__required text-red-500">*</span>
            </label>
            <input
              id="al-time"
              name="latePassArrivingTime"
              type="time"
              value={arrivingTime}
              onChange={(e) => {
                setArrivingTime(e.target.value)
                setFieldErrors((f) => ({ ...f, arrivingTime: undefined }))
              }}
              className={`late-pass-form__input late-pass-form__input--time ${inputClass}`}
              aria-invalid={Boolean(fieldErrors.arrivingTime)}
              aria-describedby={fieldErrors.arrivingTime ? 'al-time-error' : undefined}
            />
            {fieldErrors.arrivingTime && (
              <p id="al-time-error" className="late-pass-form__error late-pass-form__error--arriving-time mt-1 text-sm text-red-600" role="alert">
                {fieldErrors.arrivingTime}
              </p>
            )}
          </div>

          <div className="late-pass-form__field late-pass-form__field--reason">
            <label
              htmlFor="al-reason"
              className="late-pass-form__label late-pass-form__label--reason mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Reason <span className="late-pass-form__required text-red-500">*</span>
            </label>
            <textarea
              id="al-reason"
              name="latePassReason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setFieldErrors((f) => ({ ...f, reason: undefined }))
              }}
              rows={4}
              className={`late-pass-form__input late-pass-form__input--reason ${textareaClass}`}
              aria-invalid={Boolean(fieldErrors.reason)}
              aria-describedby={fieldErrors.reason ? 'al-reason-error' : undefined}
            />
            {fieldErrors.reason && (
              <p id="al-reason-error" className="late-pass-form__error late-pass-form__error--reason mt-1 text-sm text-red-600" role="alert">
                {fieldErrors.reason}
              </p>
            )}
          </div>

          <div className="late-pass-form__field late-pass-form__field--guardian-contact">
            <label
              htmlFor="al-guardian"
              className="late-pass-form__label late-pass-form__label--guardian mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Guardian contact no. <span className="late-pass-form__required text-red-500">*</span>
            </label>
            <input
              id="al-guardian"
              name="latePassGuardianContact"
              type="text"
              inputMode="tel"
              autoComplete="tel"
              value={guardianContactNo}
              onChange={(e) => {
                setGuardianContactNo(e.target.value)
                setFieldErrors((f) => ({ ...f, guardianContactNo: undefined }))
              }}
              className={`late-pass-form__input late-pass-form__input--guardian-phone ${inputClass}`}
              placeholder="e.g. +94 77 123 4567"
              aria-invalid={Boolean(fieldErrors.guardianContactNo)}
              aria-describedby={fieldErrors.guardianContactNo ? 'al-guardian-error' : undefined}
            />
            {fieldErrors.guardianContactNo && (
              <p id="al-guardian-error" className="late-pass-form__error late-pass-form__error--guardian mt-1 text-sm text-red-600" role="alert">
                {fieldErrors.guardianContactNo}
              </p>
            )}
          </div>

          <div className="late-pass-form__field late-pass-form__field--document">
            <label
              htmlFor="al-doc"
              className="late-pass-form__label late-pass-form__label--document mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Document to submit <span className="late-pass-form__required text-red-500">*</span>
            </label>
            <input
              id="al-doc"
              name="latePassDocument"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setDocumentFile(f)
                setDocumentName(f?.name || '')
                setFieldErrors((fe) => ({ ...fe, document: undefined }))
              }}
              className={`late-pass-form__input ${fileInputClass}`}
              aria-invalid={Boolean(fieldErrors.document)}
              aria-describedby={fieldErrors.document ? 'al-doc-error' : undefined}
            />
            {documentName && (
              <p className="late-pass-form__file-name late-pass-form__selected-file mt-1 text-sm text-slate-600">
                Selected:{' '}
                <span className="late-pass-form__file-name-text font-medium text-slate-800">{documentName}</span>
              </p>
            )}
            {fieldErrors.document && (
              <p id="al-doc-error" className="late-pass-form__error late-pass-form__error--document mt-1 text-sm text-red-600" role="alert">
                {fieldErrors.document}
              </p>
            )}
          </div>

          <div className="late-pass-form__students-section rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40 sm:p-5">
            <div className="late-pass-form__students-header mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="late-pass-form__students-heading text-sm font-semibold text-slate-900 dark:text-slate-100">
                Students <span className="late-pass-form__required text-red-500">*</span>
              </h2>
              <button
                type="button"
                onClick={addStudentRow}
                className="late-pass-form__button late-pass-form__button--add-student rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm hover:bg-primary-50"
              >
                Add another student
              </button>
            </div>
            <p className="late-pass-form__students-hint mb-4 text-xs text-slate-600 dark:text-slate-400">
              At least one student row is required.
            </p>

            <div className="late-pass-form__student-rows space-y-4">
              {students.map((row, index) => (
                <div
                  key={index}
                  className="late-pass-form__student-row panel-surface rounded-xl p-4 shadow-soft"
                  data-student-row-index={index}
                >
                  <div className="late-pass-form__student-row-header mb-2 flex items-center justify-between">
                    <span className="late-pass-form__student-row-title text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student {index + 1}
                    </span>
                    {students.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStudentRow(index)}
                        className="late-pass-form__button late-pass-form__button--remove-student text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="late-pass-form__student-row-fields grid gap-3 sm:grid-cols-3">
                    <div className="late-pass-form__field late-pass-form__field--nested late-pass-form__field--student-name">
                      <label
                        htmlFor={`al-student-name-${index}`}
                        className="late-pass-form__label late-pass-form__label--student-name mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                      >
                        Student name *
                      </label>
                      <input
                        id={`al-student-name-${index}`}
                        name={`latePassStudentName_${index}`}
                        type="text"
                        value={row.studentName}
                        onChange={(e) => setStudentRow(index, 'studentName', e.target.value)}
                        className={`late-pass-form__input late-pass-form__input--student-name ${inputClass}`}
                        aria-invalid={Boolean(fieldErrors[`student_${index}_studentName`])}
                      />
                      {fieldErrors[`student_${index}_studentName`] && (
                        <p className="late-pass-form__error late-pass-form__error--student-name mt-1 text-xs text-red-600" role="alert">
                          {fieldErrors[`student_${index}_studentName`]}
                        </p>
                      )}
                    </div>
                    <div className="late-pass-form__field late-pass-form__field--nested late-pass-form__field--student-id">
                      <label
                        htmlFor={`al-student-id-${index}`}
                        className="late-pass-form__label late-pass-form__label--student-id mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                      >
                        Student ID *
                      </label>
                      <input
                        id={`al-student-id-${index}`}
                        name={`latePassStudentId_${index}`}
                        type="text"
                        value={row.studentId}
                        onChange={(e) => setStudentRow(index, 'studentId', e.target.value)}
                        className={`late-pass-form__input late-pass-form__input--student-id ${inputClass}`}
                        aria-invalid={Boolean(fieldErrors[`student_${index}_studentId`])}
                      />
                      {fieldErrors[`student_${index}_studentId`] && (
                        <p className="late-pass-form__error late-pass-form__error--student-id mt-1 text-xs text-red-600" role="alert">
                          {fieldErrors[`student_${index}_studentId`]}
                        </p>
                      )}
                    </div>
                    <div className="late-pass-form__field late-pass-form__field--nested late-pass-form__field--student-room">
                      <label
                        htmlFor={`al-student-room-${index}`}
                        className="late-pass-form__label late-pass-form__label--student-room mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                      >
                        Room no. *
                      </label>
                      <input
                        id={`al-student-room-${index}`}
                        name={`latePassStudentRoom_${index}`}
                        type="text"
                        value={row.roomNo}
                        onChange={(e) => setStudentRow(index, 'roomNo', e.target.value)}
                        className={`late-pass-form__input late-pass-form__input--student-room ${inputClass}`}
                        aria-invalid={Boolean(fieldErrors[`student_${index}_roomNo`])}
                      />
                      {fieldErrors[`student_${index}_roomNo`] && (
                        <p className="late-pass-form__error late-pass-form__error--student-room mt-1 text-xs text-red-600" role="alert">
                          {fieldErrors[`student_${index}_roomNo`]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="late-pass-form__actions flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="late-pass-form__button late-pass-form__button--submit rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit late pass'}
            </button>
            <Link
              to="/student/latepass"
              className="late-pass-form__button late-pass-form__button--cancel inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
