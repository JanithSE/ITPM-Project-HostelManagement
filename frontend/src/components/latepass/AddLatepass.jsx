import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'
import {
  getPersonNameError,
  normalizePersonNameInput,
  PERSON_NAME_MAX,
  PERSON_NAME_MIN,
} from '../../shared/validation/personName.js'

const PROOF_MAX_BYTES = 5 * 1024 * 1024
const MAX_STUDENTS = 10
const REASON_MIN = 10
const REASON_MAX = 500
const ROOM_NO_MAX_LEN = 15
const ROOM_NO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9\-]{0,14})?$/
const STUDENT_ID_RE = /^[A-Za-z]{2}\d{5,12}$/
const LATE_PASS_CUTOFF_MINUTES = 20 * 60
const MAX_DAYS_AHEAD = 30

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-primary-400 dark:focus:bg-slate-900'
const textareaClass =
  'late-pass-form__textarea w-full min-h-[100px] resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-primary-400 dark:focus:bg-slate-900'
const fileInputClass =
  'late-pass-form__input--file block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100 dark:text-slate-400 dark:file:bg-primary-900/40 dark:file:text-primary-300'

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
  if (s.startsWith('94') && s.length >= 10) {
    s = `0${s.slice(2)}`
  }
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

function emptyStudentRow() {
  return { studentName: '', studentId: '', roomNo: '' }
}

const invalidInputRing =
  'border-red-500 dark:border-red-500/80 focus:border-red-500 focus:ring-red-500/30'

function inputClassWithError(base, hasError) {
  return hasError ? `${base} ${invalidInputRing}` : base
}

function liveValidateStudentId(raw, { blur = false } = {}) {
  const id = String(raw ?? '').trim()
  if (!id) return blur ? 'Student ID is required.' : undefined
  if (!STUDENT_ID_RE.test(id)) return 'Enter a valid student ID (e.g. IT23232323).'
  return undefined
}

function liveValidateStudentRoom(raw, { blur = false } = {}) {
  const room = String(raw ?? '').trim()
  if (!room) return blur ? 'Room number is required.' : undefined
  if (room.length > ROOM_NO_MAX_LEN) {
    return `Room number must be at most ${ROOM_NO_MAX_LEN} characters.`
  }
  if (!ROOM_NO_RE.test(room)) {
    return 'Use letters, digits, or a hyphen only (e.g. A101, B-12).'
  }
  return undefined
}

function liveValidateGuardian(raw, { blur = false } = {}) {
  const t = String(raw ?? '').trim()
  if (!t) return blur ? 'Guardian contact number is required.' : undefined
  if (!/^[\d\s+\-()]*$/.test(t)) {
    return 'Use digits, optional +, spaces or dashes only (no letters).'
  }
  const n = normalizeGuardianPhone(t)
  if (!isValidLkGuardianPhone(n)) return 'Enter a valid guardian contact number (e.g. 0771234567).'
  return undefined
}

function liveValidateReason(raw, { blur = false } = {}) {
  const reasonNorm = normalizePersonNameInput(raw)
  if (!reasonNorm) return blur ? 'Reason is required.' : undefined
  if (reasonNorm.length < REASON_MIN) {
    return `Reason must be at least ${REASON_MIN} characters.`
  }
  if (reasonNorm.length > REASON_MAX) {
    return `Reason must be at most ${REASON_MAX} characters.`
  }
  if (!/[\p{L}]/u.test(reasonNorm)) {
    return 'Enter a meaningful reason (letters required).'
  }
  return undefined
}

function liveValidateDocument(file, { blur = false } = {}) {
  if (!file) return blur ? 'Upload a valid document.' : undefined
  if (!documentLooksValid(file)) {
    return file.size > PROOF_MAX_BYTES
      ? 'File size must be less than 5MB.'
      : 'Only JPG, PNG, and PDF files are allowed.'
  }
  return undefined
}

function liveValidateDateField(value, todayYmd, maxYmd, { blur = false } = {}) {
  if (!value) return blur ? 'Date is required.' : undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Select a valid date.'
  const [y, m, d] = value.split('-').map(Number)
  const test = new Date(y, m - 1, d)
  if (test.getFullYear() !== y || test.getMonth() !== m - 1 || test.getDate() !== d) {
    return 'Select a valid date.'
  }
  if (value < todayYmd) return 'Date cannot be in the past.'
  if (value > maxYmd) return `Date cannot be more than ${MAX_DAYS_AHEAD} days in the future.`
  return undefined
}

function liveValidateArrivingTimeField(time, date, todayYmd, maxYmd, { blur = false } = {}) {
  if (!time.trim()) return blur ? 'Arriving time is required.' : undefined
  const mins = parseTimeToMinutes(time)
  if (mins == null) return 'Select a valid arrival time.'
  if (mins < LATE_PASS_CUTOFF_MINUTES) {
    return 'Late pass is only needed for arrivals after 8:00 PM.'
  }
  if (date && !liveValidateDateField(date, todayYmd, maxYmd) && date === todayYmd) {
    const [y, mo, d] = date.split('-').map(Number)
    const [hh, minute] = time.split(':').map(Number)
    const arrivalDt = new Date(y, mo - 1, d, hh, minute, 0, 0)
    if (arrivalDt.getTime() <= Date.now()) {
      return 'For today, choose a time later than the current time.'
    }
  }
  return undefined
}

function computeStudentRowsLiveErrors(students) {
  const err = {}

  students.forEach((row, i) => {
    const name = normalizePersonNameInput(row.studentName)
    const idTrim = row.studentId.trim()
    const roomTrim = row.roomNo.trim()
    const any = name || idTrim || roomTrim
    const all = name && idTrim && roomTrim

    if (row.studentName) {
      const m = getPersonNameError(row.studentName)
      if (m) err[`student_${i}_studentName`] = m
    }
    if (row.studentId.trim()) {
      const m = liveValidateStudentId(row.studentId)
      if (m) err[`student_${i}_studentId`] = m
    }
    if (row.roomNo.trim()) {
      const m = liveValidateStudentRoom(row.roomNo)
      if (m) err[`student_${i}_roomNo`] = m
    }

    if (any && !all) {
      if (!name) err[`student_${i}_studentName`] = 'Student name is required.'
      if (!idTrim) err[`student_${i}_studentId`] = 'Student ID is required.'
      if (!roomTrim) err[`student_${i}_roomNo`] = 'Room number is required.'
    }
    if (!any && students.length > 1) {
      err[`student_${i}_studentName`] = 'Fill all fields for this student or remove the row.'
    }
  })

  const filled = students
    .map((row, i) => ({
      i,
      name: normalizePersonNameInput(row.studentName),
      id: row.studentId.trim(),
      room: row.roomNo.trim(),
    }))
    .filter((x) => x.name && x.id && x.room)

  const idGroups = new Map()
  for (const x of filled) {
    const key = x.id.toUpperCase()
    if (!idGroups.has(key)) idGroups.set(key, [])
    idGroups.get(key).push(x.i)
  }
  for (const indices of idGroups.values()) {
    if (indices.length > 1) {
      for (const idx of indices) {
        err[`student_${idx}_studentId`] = 'Duplicate student ID is not allowed.'
      }
    }
  }

  if (filled.length === 0 && students.some((r) => r.studentName || r.studentId || r.roomNo)) {
    err.students = 'Complete at least one full student row (name, ID, and room).'
  }

  return err
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

  const todayYmd = localYmd()
  const maxDateYmd = addDaysToYmd(todayYmd, MAX_DAYS_AHEAD)

  function setStudentRow(index, key, value) {
    setStudents((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  function addStudentRow() {
    if (students.length >= MAX_STUDENTS) {
      toast.error(`You can add at most ${MAX_STUDENTS} students per request.`)
      return
    }
    setStudents((prev) => [...prev, emptyStudentRow()])
  }

  function removeStudentRow(index) {
    if (students.length <= 1) {
      toast.error('At least one student row is required.')
      return
    }
    setStudents((prev) => prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    setFieldErrors((e) => {
      const nextE = { ...e }
      Object.keys(nextE).forEach((k) => {
        if (k.startsWith('student_') || k === 'students') delete nextE[k]
      })
      return { ...nextE, ...computeStudentRowsLiveErrors(students) }
    })
  }, [students])

  function validate() {
    const err = {}

    if (!date) {
      err.date = 'Date is required.'
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      err.date = 'Select a valid date.'
    } else {
      const [y, m, d] = date.split('-').map(Number)
      const test = new Date(y, m - 1, d)
      if (test.getFullYear() !== y || test.getMonth() !== m - 1 || test.getDate() !== d) {
        err.date = 'Select a valid date.'
      } else if (date < todayYmd) {
        err.date = 'Date cannot be in the past.'
      } else if (date > maxDateYmd) {
        err.date = `Date cannot be more than ${MAX_DAYS_AHEAD} days in the future.`
      }
    }

    if (!arrivingTime.trim()) {
      err.arrivingTime = 'Arriving time is required.'
    } else {
      const mins = parseTimeToMinutes(arrivingTime)
      if (mins == null) {
        err.arrivingTime = 'Select a valid arrival time.'
      } else if (mins < LATE_PASS_CUTOFF_MINUTES) {
        err.arrivingTime = 'Late pass is only needed for arrivals after 8:00 PM.'
      } else if (!err.date && date === todayYmd) {
        const [y, mo, d] = date.split('-').map(Number)
        const [hh, mm] = arrivingTime.split(':').map(Number)
        const arrivalDt = new Date(y, mo - 1, d, hh, mm, 0, 0)
        if (arrivalDt.getTime() <= Date.now()) {
          err.arrivingTime = 'For today, choose an arrival time later than the current time.'
        }
      }
    }

    const reasonNorm = normalizePersonNameInput(reason)
    if (!reasonNorm) {
      err.reason = 'Reason is required.'
    } else if (reasonNorm.length < REASON_MIN) {
      err.reason = `Reason must be at least ${REASON_MIN} characters.`
    } else if (reasonNorm.length > REASON_MAX) {
      err.reason = `Reason must be at most ${REASON_MAX} characters.`
    } else if (!/[\p{L}]/u.test(reasonNorm)) {
      err.reason = 'Enter a meaningful reason (letters required).'
    }

    const gTrim = guardianContactNo.trim()
    if (!gTrim) {
      err.guardianContactNo = 'Guardian contact number is required.'
    } else if (!isValidLkGuardianPhone(normalizeGuardianPhone(gTrim))) {
      err.guardianContactNo = 'Enter a valid guardian contact number.'
    }

    if (!documentFile) {
      err.document = 'Upload a valid document.'
    } else if (!documentLooksValid(documentFile)) {
      err.document =
        documentFile.size > PROOF_MAX_BYTES
          ? 'File size must be less than 5MB.'
          : 'Only JPG, PNG, and PDF files are allowed.'
    }

    students.forEach((row, i) => {
      const name = normalizePersonNameInput(row.studentName)
      const idTrim = row.studentId.trim()
      const roomTrim = row.roomNo.trim()
      const any = name || idTrim || roomTrim
      const all = name && idTrim && roomTrim

      if (any && !all) {
        if (!name) err[`student_${i}_studentName`] = 'Student name is required.'
        if (!idTrim) err[`student_${i}_studentId`] = 'Student ID is required.'
        if (!roomTrim) err[`student_${i}_roomNo`] = 'Room number is required.'
      }
      if (!any && students.length > 1) {
        err[`student_${i}_studentName`] = 'Fill all fields for this student or remove the row.'
      }
    })

    const filled = students
      .map((row, i) => ({ i, row, name: normalizePersonNameInput(row.studentName), id: row.studentId.trim(), room: row.roomNo.trim() }))
      .filter((x) => x.name && x.id && x.room)

    if (filled.length === 0) {
      err.students = 'At least one student is required.'
    }

    const idGroups = new Map()
    for (const x of filled) {
      const key = x.id.toUpperCase()
      if (!idGroups.has(key)) idGroups.set(key, [])
      idGroups.get(key).push(x.i)
    }
    for (const indices of idGroups.values()) {
      if (indices.length > 1) {
        for (const idx of indices) {
          err[`student_${idx}_studentId`] = 'Duplicate student ID is not allowed.'
        }
      }
    }

    for (const x of filled) {
      const { i, row, id, room } = x
      const nameErr = getPersonNameError(row.studentName, { blur: true })
      if (nameErr) err[`student_${i}_studentName`] = nameErr

      if (!STUDENT_ID_RE.test(id)) {
        err[`student_${i}_studentId`] = 'Enter a valid student ID.'
      }

      if (room.length > ROOM_NO_MAX_LEN) {
        err[`student_${i}_roomNo`] = `Room number must be at most ${ROOM_NO_MAX_LEN} characters.`
      } else if (!ROOM_NO_RE.test(room)) {
        err[`student_${i}_roomNo`] = 'Enter a valid room number (letters, digits, optional hyphen).'
      }
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

    const filledRows = students
      .map((s) => ({
        studentName: normalizePersonNameInput(s.studentName),
        studentId: s.studentId.trim(),
        roomNo: s.roomNo.trim(),
      }))
      .filter((r) => r.studentName && r.studentId && r.roomNo)

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('date', date)
      fd.append('arrivingTime', arrivingTime.trim())
      fd.append('reason', normalizePersonNameInput(reason))
      fd.append('guardianContactNo', guardianContactNo.trim())
      fd.append('students', JSON.stringify(filledRows))
      fd.append('document', documentFile)

      await axiosClient.post('/latepass', fd)
      toast.success('Late pass submitted successfully')
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

  return (
    <div className="late-pass-form late-pass-form--page mx-auto w-full max-w-3xl">
      <div className="late-pass-form__page-header mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="late-pass-form__intro">
          <h1 id="late-pass-form-title" className="late-pass-form__title text-2xl font-bold text-slate-900 dark:text-slate-50">
            Add late pass
          </h1>
          <p className="late-pass-form__subtitle mt-1 text-sm text-slate-600 dark:text-slate-400">
            Late arrival must be after 8:00 PM. All fields marked * are required.
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
              required
              min={todayYmd}
              max={maxDateYmd}
              value={date}
              onChange={(e) => {
                const v = e.target.value
                setDate(v)
                setFieldErrors((f) => ({
                  ...f,
                  date: liveValidateDateField(v, todayYmd, maxDateYmd),
                  arrivingTime: arrivingTime
                    ? liveValidateArrivingTimeField(arrivingTime, v, todayYmd, maxDateYmd)
                    : f.arrivingTime,
                }))
              }}
              onBlur={() =>
                setFieldErrors((f) => ({
                  ...f,
                  date: liveValidateDateField(date, todayYmd, maxDateYmd, { blur: true }),
                }))
              }
              className={`late-pass-form__input late-pass-form__input--date ${inputClassWithError(inputClass, !!fieldErrors.date)}`}
              aria-invalid={Boolean(fieldErrors.date)}
              aria-describedby={fieldErrors.date ? 'al-date-error' : undefined}
            />
            {fieldErrors.date && (
              <p id="al-date-error" className="late-pass-form__error late-pass-form__error--date mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
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
              required
              min="20:00"
              value={arrivingTime}
              onChange={(e) => {
                const v = e.target.value
                setArrivingTime(v)
                setFieldErrors((f) => ({
                  ...f,
                  arrivingTime: liveValidateArrivingTimeField(v, date, todayYmd, maxDateYmd),
                }))
              }}
              onBlur={() =>
                setFieldErrors((f) => ({
                  ...f,
                  arrivingTime: liveValidateArrivingTimeField(
                    arrivingTime,
                    date,
                    todayYmd,
                    maxDateYmd,
                    { blur: true }
                  ),
                }))
              }
              className={`late-pass-form__input late-pass-form__input--time ${inputClassWithError(inputClass, !!fieldErrors.arrivingTime)}`}
              aria-invalid={Boolean(fieldErrors.arrivingTime)}
              aria-describedby={fieldErrors.arrivingTime ? 'al-time-error' : undefined}
            />
            {fieldErrors.arrivingTime && (
              <p id="al-time-error" className="late-pass-form__error late-pass-form__error--arriving-time mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
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
              required
              minLength={REASON_MIN}
              maxLength={REASON_MAX}
              value={reason}
              onChange={(e) => {
                const v = e.target.value
                setReason(v)
                setFieldErrors((f) => ({ ...f, reason: liveValidateReason(v) }))
              }}
              onBlur={() =>
                setFieldErrors((f) => ({
                  ...f,
                  reason: liveValidateReason(reason, { blur: true }),
                }))
              }
              rows={4}
              className={`late-pass-form__input late-pass-form__input--reason ${inputClassWithError(textareaClass, !!fieldErrors.reason)}`}
              aria-invalid={Boolean(fieldErrors.reason)}
              aria-describedby={fieldErrors.reason ? 'al-reason-error' : undefined}
            />
            {fieldErrors.reason && (
              <p id="al-reason-error" className="late-pass-form__error late-pass-form__error--reason mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
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
              required
              inputMode="tel"
              autoComplete="tel"
              value={guardianContactNo}
              onChange={(e) => {
                const v = e.target.value
                setGuardianContactNo(v)
                setFieldErrors((f) => ({
                  ...f,
                  guardianContactNo: liveValidateGuardian(v),
                }))
              }}
              onBlur={() =>
                setFieldErrors((f) => ({
                  ...f,
                  guardianContactNo: liveValidateGuardian(guardianContactNo, { blur: true }),
                }))
              }
              className={`late-pass-form__input late-pass-form__input--guardian-phone ${inputClassWithError(inputClass, !!fieldErrors.guardianContactNo)}`}
              placeholder="e.g. 0771234567 or +94771234567"
              aria-invalid={Boolean(fieldErrors.guardianContactNo)}
              aria-describedby={fieldErrors.guardianContactNo ? 'al-guardian-error' : undefined}
            />
            {fieldErrors.guardianContactNo && (
              <p id="al-guardian-error" className="late-pass-form__error late-pass-form__error--guardian mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
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
              required
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setDocumentFile(f)
                setDocumentName(f?.name || '')
                setFieldErrors((fe) => ({ ...fe, document: liveValidateDocument(f) }))
              }}
              onBlur={() =>
                setFieldErrors((fe) => ({
                  ...fe,
                  document: liveValidateDocument(documentFile, { blur: true }),
                }))
              }
              className={`late-pass-form__input ${fileInputClass} ${fieldErrors.document ? invalidInputRing : ''}`}
              aria-invalid={Boolean(fieldErrors.document)}
              aria-describedby={fieldErrors.document ? 'al-doc-error' : undefined}
            />
            {documentName && (
              <p className="late-pass-form__file-name late-pass-form__selected-file mt-1 text-sm text-slate-600 dark:text-slate-400">
                Selected:{' '}
                <span className="late-pass-form__file-name-text font-medium text-slate-800 dark:text-slate-200">{documentName}</span>
              </p>
            )}
            {fieldErrors.document && (
              <p id="al-doc-error" className="late-pass-form__error late-pass-form__error--document mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
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
                disabled={students.length >= MAX_STUDENTS}
                className="late-pass-form__button late-pass-form__button--add-student rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add another student
              </button>
            </div>
            <p className="late-pass-form__students-hint mb-4 text-xs text-slate-600 dark:text-slate-400">
              At least one complete row. Up to {MAX_STUDENTS} students. No duplicate student IDs in one request.
            </p>
            {fieldErrors.students && (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
                {fieldErrors.students}
              </p>
            )}

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
                        className="late-pass-form__button late-pass-form__button--remove-student text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
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
                        required
                        minLength={PERSON_NAME_MIN}
                        maxLength={PERSON_NAME_MAX}
                        value={row.studentName}
                        onChange={(e) => setStudentRow(index, 'studentName', e.target.value)}
                        className={`late-pass-form__input late-pass-form__input--student-name ${inputClassWithError(inputClass, !!fieldErrors[`student_${index}_studentName`])}`}
                        aria-invalid={Boolean(fieldErrors[`student_${index}_studentName`])}
                      />
                      {fieldErrors[`student_${index}_studentName`] && (
                        <p className="late-pass-form__error late-pass-form__error--student-name mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
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
                        required
                        value={row.studentId}
                        onChange={(e) => setStudentRow(index, 'studentId', e.target.value)}
                        className={`late-pass-form__input late-pass-form__input--student-id ${inputClassWithError(inputClass, !!fieldErrors[`student_${index}_studentId`])}`}
                        placeholder="e.g. IT23232323"
                        aria-invalid={Boolean(fieldErrors[`student_${index}_studentId`])}
                      />
                      {fieldErrors[`student_${index}_studentId`] && (
                        <p className="late-pass-form__error late-pass-form__error--student-id mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
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
                        required
                        maxLength={ROOM_NO_MAX_LEN}
                        value={row.roomNo}
                        onChange={(e) => setStudentRow(index, 'roomNo', e.target.value)}
                        className={`late-pass-form__input late-pass-form__input--student-room ${inputClassWithError(inputClass, !!fieldErrors[`student_${index}_roomNo`])}`}
                        aria-invalid={Boolean(fieldErrors[`student_${index}_roomNo`])}
                      />
                      {fieldErrors[`student_${index}_roomNo`] && (
                        <p className="late-pass-form__error late-pass-form__error--student-room mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
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
