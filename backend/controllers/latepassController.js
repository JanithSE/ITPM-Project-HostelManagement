import LatePass from '../models/LatePass.js'
import User from '../models/User.js'
import { validatePersonNameNormalized } from '../utils/personNameValidation.js'

function normalizeLatepassStatus(input) {
  if (!input) return null
  const s = String(input).toLowerCase()

  if (s === 'approved') return 'completed'

  if (['pending', 'processing', 'completed', 'rejected'].includes(s)) return s
  return null
}

function documentPathFromFile(file) {
  if (!file) return null
  return `/uploads/latepass/${file.filename}`
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** YYYY-MM-DD in server local timezone */
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

/** Accept YYYY-MM-DD or parseable ISO; returns { ok, ymd, message } */
function parseLatepassDateInput(raw) {
  const s = String(raw ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    if (m < 1 || m > 12 || d < 1 || d > 31) return { ok: false, message: 'Select a valid date.' }
    const test = new Date(y, m - 1, d)
    if (test.getFullYear() !== y || test.getMonth() !== m - 1 || test.getDate() !== d) {
      return { ok: false, message: 'Select a valid date.' }
    }
    return { ok: true, ymd: s }
  }
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return { ok: false, message: 'Select a valid date.' }
  return { ok: true, ymd: localYmd(d) }
}

function parseTimeToMinutes(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? '').trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

const LATE_PASS_CUTOFF_MINUTES = 20 * 60 // 8:00 PM inclusive
const MAX_STUDENTS_PER_REQUEST = 10
const REASON_MIN = 10
const REASON_MAX = 500
const ROOM_NO_MAX_LEN = 15
const ROOM_NO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9\-]{0,14})?$/
/** e.g. IT23232323, ST12345 */
const STUDENT_ID_RE = /^[A-Za-z]{2}\d{8}$/
const MAX_DAYS_AHEAD = 30

function normalizeWhitespaceName(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
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

function parseStudentsJson(raw) {
  if (raw == null) return null
  let parsed
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null
  return parsed
}

function sendValidationError(res, fieldErrors) {
  const first =
    Object.values(fieldErrors).find(Boolean) || 'Please correct the errors below.'
  return res.status(400).json({
    error: typeof first === 'string' ? first : 'Validation failed',
    fieldErrors,
  })
}

export const getMyLatepass = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Students only' })
    }

    const uid = req.user._id
    const regId = String(req.user.universityId || '').trim()
    const regEscaped = regId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const or = [{ createdBy: uid }, { student: uid }]
    if (regId) {
      or.push({
        students: {
          $elemMatch: { studentId: { $regex: new RegExp(`^${regEscaped}$`, 'i') } },
        },
      })
    }

    const passes = await LatePass.find({ $or: or })
      .populate('createdBy', 'name email universityId')
      .populate('student', 'name email universityId')
      .sort({ createdAt: -1 })

    res.json(passes.map(serializeLatepass))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getAdminLatepass = async (req, res) => {
  try {
    const passes = await LatePass.find({})
      .populate('createdBy', 'name email universityId')
      .populate('student', 'name email universityId')
      .sort({ createdAt: -1 })
    res.json(passes.map(serializeLatepass))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

function serializeLatepass(doc) {
  const o = doc.toObject ? doc.toObject() : { ...doc }
  o.documentFile = o.documentFile || ''
  if (!o.arrivingTime && o.returnTime) o.arrivingTime = o.returnTime
  if (!o.students || o.students.length === 0) {
    o.students = []
  }
  return o
}

export const getLatepassById = async (req, res) => {
  try {
    const pass = await LatePass.findById(req.params.id)
      .populate('createdBy', 'name email universityId')
      .populate('student', 'name email universityId')

    if (!pass) return res.status(404).json({ error: 'Late pass not found' })

    if (req.user.role === 'admin') {
      return res.json(serializeLatepass(pass))
    }

    if (req.user.role === 'student') {
      const uid = String(req.user._id)
      const regId = String(req.user.universityId || '').trim()
      const createdBy = pass.createdBy?._id ? String(pass.createdBy._id) : String(pass.createdBy || '')
      const legacyStudent = pass.student?._id ? String(pass.student._id) : String(pass.student || '')

      const inStudents = (pass.students || []).some((s) => s.studentId && regId && s.studentId === regId)

      if (createdBy === uid || legacyStudent === uid || inStudents) {
        return res.json(serializeLatepass(pass))
      }
    }

    return res.status(403).json({ error: 'Forbidden' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const createLatepass = async (req, res) => {
  const fieldErrors = {}

  if (!req.file) {
    fieldErrors.document = 'Upload a valid document.'
    return sendValidationError(res, fieldErrors)
  }

  const rawStudents = parseStudentsJson(req.body.students)
  if (!rawStudents) {
    fieldErrors.students = 'At least one student is required.'
    return sendValidationError(res, fieldErrors)
  }

  if (rawStudents.length > MAX_STUDENTS_PER_REQUEST) {
    fieldErrors.students = `You can add at most ${MAX_STUDENTS_PER_REQUEST} students per request.`
    return sendValidationError(res, fieldErrors)
  }

  const rows = rawStudents.map((row, i) => ({
    i,
    studentName: normalizeWhitespaceName(row.studentName),
    studentId: String(row.studentId ?? '').trim(),
    roomNo: String(row.roomNo ?? '').trim(),
  }))

  for (const r of rows) {
    const any = r.studentName || r.studentId || r.roomNo
    const all = r.studentName && r.studentId && r.roomNo
    if (any && !all) {
      if (!r.studentName) fieldErrors[`student_${r.i}_studentName`] = 'Student name is required.'
      if (!r.studentId) fieldErrors[`student_${r.i}_studentId`] = 'Student ID is required.'
      if (!r.roomNo) fieldErrors[`student_${r.i}_roomNo`] = 'Room number is required.'
    }
    if (!any && rows.length > 1) {
      fieldErrors[`student_${r.i}_studentName`] =
        'Fill all fields for this student or remove the row.'
    }
  }

  const finalRows = rows.filter((r) => r.studentName && r.studentId && r.roomNo)
  if (finalRows.length === 0 && !fieldErrors.students) {
    fieldErrors.students = 'At least one student is required.'
  }

  const idGroups = new Map()
  for (const r of finalRows) {
    const key = r.studentId.toUpperCase()
    if (!idGroups.has(key)) idGroups.set(key, [])
    idGroups.get(key).push(r.i)
  }
  for (const indices of idGroups.values()) {
    if (indices.length > 1) {
      for (const idx of indices) {
        fieldErrors[`student_${idx}_studentId`] = 'Duplicate student ID is not allowed.'
      }
    }
  }

  for (const r of finalRows) {
    const pn = validatePersonNameNormalized(normalizeWhitespaceName(r.studentName))
    if (!pn.ok) {
      fieldErrors[`student_${r.i}_studentName`] = pn.message
    }

    if (!STUDENT_ID_RE.test(r.studentId)) {
      fieldErrors[`student_${r.i}_studentId`] =
        'Enter a valid student ID (2 letters + 8 digits, e.g. IT23631515).'
    }

    if (r.roomNo.length > ROOM_NO_MAX_LEN) {
      fieldErrors[`student_${r.i}_roomNo`] = `Room number must be at most ${ROOM_NO_MAX_LEN} characters.`
    } else if (!ROOM_NO_RE.test(r.roomNo)) {
      fieldErrors[`student_${r.i}_roomNo`] =
        'Enter a valid room number (letters, digits, optional hyphen).'
    }
  }

  const rawDate = String(req.body.date ?? '').trim()
  let dateParsed = { ok: false, ymd: '', message: 'Date is required.' }
  if (!rawDate) {
    fieldErrors.date = 'Date is required.'
  } else {
    dateParsed = parseLatepassDateInput(rawDate)
    if (!dateParsed.ok) {
      fieldErrors.date = dateParsed.message
    } else {
      const { ymd } = dateParsed
      const today = localYmd()
      if (ymd < today) {
        fieldErrors.date = 'Date cannot be in the past.'
      } else if (ymd > addDaysToYmd(today, MAX_DAYS_AHEAD)) {
        fieldErrors.date = `Date cannot be more than ${MAX_DAYS_AHEAD} days in the future.`
      }
    }
  }

  const arrivingTime = String(req.body.arrivingTime ?? '').trim()
  if (!arrivingTime) {
    fieldErrors.arrivingTime = 'Arriving time is required.'
  } else {
    const mins = parseTimeToMinutes(arrivingTime)
    if (mins == null) {
      fieldErrors.arrivingTime = 'Select a valid arrival time.'
    } else if (mins < LATE_PASS_CUTOFF_MINUTES) {
      fieldErrors.arrivingTime = 'Late pass is only needed for arrivals after 8:00 PM.'
    } else if (dateParsed.ok && !fieldErrors.date) {
      const { ymd } = dateParsed
      const today = localYmd()
      if (ymd === today) {
        const [y, mo, d] = ymd.split('-').map(Number)
        const [hh, mm] = arrivingTime.split(':').map(Number)
        const arrivalDt = new Date(y, mo - 1, d, hh, mm, 0, 0)
        if (arrivalDt.getTime() <= Date.now()) {
          fieldErrors.arrivingTime = 'For today, choose an arrival time later than the current time.'
        }
      }
    }
  }

  const reason = normalizeWhitespaceName(req.body.reason)
  if (!reason) {
    fieldErrors.reason = 'Reason is required.'
  } else if (reason.length < REASON_MIN) {
    fieldErrors.reason = `Reason must be at least ${REASON_MIN} characters.`
  } else if (reason.length > REASON_MAX) {
    fieldErrors.reason = `Reason must be at most ${REASON_MAX} characters.`
  } else if (!/[\p{L}]/u.test(reason)) {
    fieldErrors.reason = 'Enter a meaningful reason (letters required).'
  }

  const guardianRaw = String(req.body.guardianContactNo ?? '').trim()
  if (!guardianRaw) {
    fieldErrors.guardianContactNo = 'Guardian contact number is required.'
  } else {
    const gNorm = normalizeGuardianPhone(guardianRaw)
    if (!isValidLkGuardianPhone(gNorm)) {
      fieldErrors.guardianContactNo = 'Enter a valid guardian contact number.'
    }
  }

  const syncBlocking = Object.keys(fieldErrors).length > 0

  let dateForDb = null
  let dayStart = null
  let dayEnd = null
  if (dateParsed.ok && !fieldErrors.date) {
    const [y, mo, d] = dateParsed.ymd.split('-').map(Number)
    dateForDb = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0, 0))
    dayStart = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0))
    dayEnd = new Date(Date.UTC(y, mo - 1, d + 1, 0, 0, 0, 0))
  }

  if (!syncBlocking && dateForDb && dayStart && dayEnd) {
    for (const r of finalRows) {
      const dup = await LatePass.findOne({
        students: {
          $elemMatch: {
            studentId: new RegExp(`^${escapeRegex(r.studentId)}$`, 'i'),
          },
        },
        date: { $gte: dayStart, $lt: dayEnd },
        status: { $nin: ['rejected'] },
      }).lean()

      if (dup) {
        fieldErrors[`student_${r.i}_studentId`] =
          'A late pass already exists for this student on this date.'
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return sendValidationError(res, fieldErrors)
  }

  try {
    const documentFile = documentPathFromFile(req.file)
    const guardianStored = normalizeGuardianPhone(guardianRaw)

    const pass = await LatePass.create({
      createdBy: req.user._id,
      date: dateForDb,
      arrivingTime,
      reason,
      guardianContactNo: guardianStored,
      documentFile,
      students: finalRows.map((r) => ({
        studentName: r.studentName,
        studentId: r.studentId,
        roomNo: r.roomNo,
      })),
      status: 'pending',
    })

    const populated = await LatePass.findById(pass._id)
      .populate('createdBy', 'name email universityId')
      .populate('student', 'name email universityId')

    res.status(201).json(serializeLatepass(populated))
  } catch (err) {
    const code = err?.name === 'ValidationError' ? 400 : 500
    res.status(code).json({ error: err.message })
  }
}

export const patchLatepassStatus = async (req, res) => {
  try {
    const exists = await LatePass.exists({ _id: req.params.id })
    if (!exists) return res.status(404).json({ error: 'Late pass not found' })

    const nextStatus = normalizeLatepassStatus(req.body.status)
    if (!nextStatus) return res.status(400).json({ error: 'Invalid status' })

    const hasRemarks = req.body.adminRemarks !== undefined
    if (nextStatus !== 'rejected' && hasRemarks) {
      return res.status(400).json({ error: 'adminRemarks allowed only when status is rejected' })
    }

    const $set = { status: nextStatus }
    if (nextStatus === 'rejected') $set.adminRemarks = req.body.adminRemarks

    await LatePass.updateOne({ _id: req.params.id }, { $set }, { runValidators: true })

    const populated = await LatePass.findById(req.params.id)
      .populate('createdBy', 'name email universityId')
      .populate('student', 'name email universityId')
    res.json(serializeLatepass(populated))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getAllLatepass = getAdminLatepass
export const updateLatepassStatus = patchLatepassStatus
export const listLatepasses = getAdminLatepass
export const updateLatepass = patchLatepassStatus
