import LatePass from '../models/LatePass.js'

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

const PHONE_RE = /^[0-9+\s\-()]{8,22}$/
const STUDENT_ID_RE = /^[A-Za-z]{2}\d{8}$/

function parseStudentsJson(raw) {
  if (raw == null) return null
  let parsed
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null
  return parsed.map((row) => ({
    studentName: String(row.studentName ?? '').trim(),
    studentId: String(row.studentId ?? '').trim(),
    roomNo: String(row.roomNo ?? '').trim(),
  }))
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
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Document upload is required (image or PDF)' })
    }

    const students = parseStudentsJson(req.body.students)
    if (!students || students.length < 1) {
      return res.status(400).json({ error: 'At least one student row is required' })
    }

    const errors = []
    students.forEach((row, i) => {
      if (!row.studentName) errors.push(`Student ${i + 1}: name is required`)
      if (!row.studentId) errors.push(`Student ${i + 1}: student ID is required`)
      else if (!STUDENT_ID_RE.test(row.studentId)) {
        errors.push(`Student ${i + 1}: student ID must be 2 letters followed by 8 numbers`)
      }
      if (!row.roomNo) errors.push(`Student ${i + 1}: room number is required`)
    })

    const reason = String(req.body.reason ?? '').trim()
    const guardianContactNo = String(req.body.guardianContactNo ?? '').trim()
    const arrivingTime = String(req.body.arrivingTime ?? '').trim()

    if (!req.body.date) errors.push('Date is required')
    else if (Number.isNaN(new Date(req.body.date).getTime())) errors.push('Invalid date')
    if (!arrivingTime) errors.push('Arriving time is required')
    if (!reason) errors.push('Reason is required')
    if (!guardianContactNo) errors.push('Guardian contact number is required')
    else if (!PHONE_RE.test(guardianContactNo)) {
      errors.push('Guardian contact: use 8–22 digits/plus/spaces/dashes/parentheses only')
    }

    if (errors.length) {
      return res.status(400).json({ error: errors.join('. ') })
    }

    const documentFile = documentPathFromFile(req.file)

    const pass = await LatePass.create({
      createdBy: req.user._id,
      date: req.body.date,
      arrivingTime,
      reason,
      guardianContactNo,
      documentFile,
      students,
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

    // Use $set only — avoids full-document validation on legacy rows missing newer required fields
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
