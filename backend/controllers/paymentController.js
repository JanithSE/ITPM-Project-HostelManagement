import Booking from '../models/Booking.js'
import Payment, {
  PAYMENT_FACILITY_TYPES,
  PAYMENT_ROOM_TYPES,
  PAYMENT_TRANSACTION_TYPES,
} from '../models/Payment.js'
import { PAYMENT_AMOUNT_LKR, getExpectedAmountLkr } from '../config/paymentPricing.js'
import { validatePersonNameNormalized } from '../utils/personNameValidation.js'

function normalizePaymentStatus(input) {
  if (!input) return null
  const s = String(input).toLowerCase()

  if (s === 'paid') return 'completed'
  if (s === 'failed') return 'rejected'

  if (['pending', 'processing', 'completed', 'rejected'].includes(s)) return s
  return null
}

function proofPathFromFile(file) {
  if (!file) return null
  return `/uploads/payments/${file.filename}`
}

const ROOM_NO_MAX_LEN = 15
/** Letter/digit start; rest alnum or hyphen; no other symbols */
const ROOM_NO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9\-]{0,14})?$/

function normalizeWhitespaceName(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeRoomNo(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
}

/** Previous, current, and next calendar month YYYY-MM (UTC) — payment allowed for these only. */
function getPaymentMonthBoundsUtc() {
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

function validateStudentNameField(raw) {
  const name = normalizeWhitespaceName(raw)
  return validatePersonNameNormalized(name)
}

function validateRoomNoField(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return { ok: false, message: 'Room number is required.', value: trimmed }
  if (trimmed.length > ROOM_NO_MAX_LEN) {
    return { ok: false, message: `Room number must be at most ${ROOM_NO_MAX_LEN} characters.`, value: trimmed }
  }
  if (!ROOM_NO_RE.test(trimmed)) {
    return { ok: false, message: 'Enter a valid room number (letters, digits, optional hyphen).', value: trimmed }
  }
  return { ok: true, value: trimmed }
}

function validateMonthField(raw) {
  const month = String(raw ?? '').trim()
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return { ok: false, message: 'Select a valid month.', value: month }
  }
  const [, mm] = month.split('-')
  const mNum = Number.parseInt(mm, 10)
  if (mNum < 1 || mNum > 12) return { ok: false, message: 'Select a valid month.', value: month }
  const { previous, current, next } = getPaymentMonthBoundsUtc()
  const allowed = new Set([previous, current, next])
  if (!allowed.has(month)) {
    return {
      ok: false,
      message: 'You can only pay for the previous month, the current month, or the next month.',
      value: month,
    }
  }
  return { ok: true, value: month }
}

function amountsMatch(expected, actual, eps = 0.005) {
  if (expected == null || !Number.isFinite(actual)) return false
  return Math.abs(Number(actual) - Number(expected)) < eps
}

export const getPaymentPricing = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Students only' })
    }
    res.json({ pricing: PAYMENT_AMOUNT_LKR })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getMyPayments = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Students only' })
    }
    const payments = await Payment.find({ student: req.user._id })
      .populate('student', 'name email universityId')
      .sort({ createdAt: -1 })
    res.json(payments.map(serializePayment))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getAdminPayments = async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate('student', 'name email universityId')
      .sort({ createdAt: -1 })
    res.json(payments.map(serializePayment))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

/** Merge legacy proofUrl into proofFile; expose studentId for API consumers */
function serializePayment(p) {
  const o = p.toObject ? p.toObject() : { ...p }
  o.proofFile = o.proofFile || o.proofUrl || ''
  const sid = o.student?._id ?? o.student
  o.studentId = sid != null ? String(sid) : undefined
  return o
}

export const getPaymentById = async (req, res) => {
  try {
    if (!['student', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const payment = await Payment.findById(req.params.id).populate('student', 'name email universityId')
    if (!payment) return res.status(404).json({ error: 'Payment not found' })

    if (req.user.role === 'admin') {
      return res.json(serializePayment(payment))
    }
    const ownerId = payment.student?._id ?? payment.student
    if (String(ownerId) === String(req.user._id)) {
      return res.json(serializePayment(payment))
    }
    return res.status(403).json({ error: 'Forbidden' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

function sendValidationError(res, fieldErrors) {
  const first = Object.values(fieldErrors).find(Boolean)
  return res.status(400).json({
    error: first || 'Please correct the errors below.',
    fieldErrors,
  })
}

export const createPayment = async (req, res) => {
  const fieldErrors = {}

  if (!req.file) {
    fieldErrors.proof = 'Upload a payment slip or proof.'
    return sendValidationError(res, fieldErrors)
  }

  try {
    const sn = validateStudentNameField(req.body.studentName)
    if (!sn.ok) fieldErrors.studentName = sn.message

    const rn = validateRoomNoField(req.body.roomNo)
    if (!rn.ok) fieldErrors.roomNo = rn.message

    const mo = validateMonthField(req.body.month)
    if (!mo.ok) fieldErrors.month = mo.message

    const roomType = String(req.body.roomType ?? '').trim()
    const facilityType = String(req.body.facilityType ?? '').trim()
    const transactionType = String(req.body.transactionType ?? '').trim()

    if (!PAYMENT_ROOM_TYPES.includes(roomType)) {
      fieldErrors.roomType = 'Select a room type.'
    }
    if (!PAYMENT_FACILITY_TYPES.includes(facilityType)) {
      fieldErrors.facilityType = 'Select a facility type.'
    }
    if (!PAYMENT_TRANSACTION_TYPES.includes(transactionType)) {
      fieldErrors.transactionType = 'Select a transaction type.'
    }

    const amountRaw = req.body.amount
    const amountNum =
      typeof amountRaw === 'string' ? Number.parseFloat(String(amountRaw).replace(/,/g, '')) : Number(amountRaw)
    const amount = Number.isFinite(amountNum) ? Math.round(amountNum * 100) / 100 : NaN

    const amountStr = String(amountRaw ?? '').replace(/,/g, '').trim()
    if (amountRaw === '' || amountRaw === undefined || amountRaw === null) {
      fieldErrors.amount = 'Amount is required.'
    } else if (!Number.isFinite(amount)) {
      fieldErrors.amount = 'Enter a valid amount in LKR.'
    } else if (amount <= 0) {
      fieldErrors.amount = 'Amount must be greater than 0.'
    } else if (amountStr.includes('.')) {
      const dec = amountStr.split('.')[1] || ''
      if (dec.length > 2) {
        fieldErrors.amount = 'Enter a valid amount in LKR (up to 2 decimal places).'
      }
    }

    const expected = getExpectedAmountLkr(roomType, facilityType)
    if (
      PAYMENT_ROOM_TYPES.includes(roomType) &&
      PAYMENT_FACILITY_TYPES.includes(facilityType) &&
      expected != null &&
      Number.isFinite(amount) &&
      !fieldErrors.amount &&
      !amountsMatch(expected, amount)
    ) {
      fieldErrors.amount = 'Amount does not match the selected room and facility type.'
    }

    const syncKeys = [
      'studentName',
      'roomNo',
      'month',
      'roomType',
      'facilityType',
      'amount',
      'transactionType',
    ]
    const hasSyncErrors = syncKeys.some((k) => Boolean(fieldErrors[k]))

    if (!hasSyncErrors) {
      const dup = await Payment.findOne({
        student: req.user._id,
        month: mo.value,
        status: { $nin: ['rejected', 'failed'] },
      }).lean()
      if (dup) {
        fieldErrors.month = 'Payment for this month already exists.'
      }
    }

    if (!hasSyncErrors && !fieldErrors.month) {
      const booking = await Booking.findOne({
        student: req.user._id,
        status: { $in: ['pending', 'confirmed'] },
      })
        .sort({ updatedAt: -1 })
        .lean()

      if (!booking) {
        fieldErrors.roomNo = 'No active room booking found for your account. Use your assigned room number.'
      } else if (normalizeRoomNo(booking.roomNumber) !== normalizeRoomNo(rn.value)) {
        fieldErrors.roomNo = 'Room number does not match your assigned room.'
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return sendValidationError(res, fieldErrors)
    }

    const proofFile = proofPathFromFile(req.file)

    const payment = await Payment.create({
      student: req.user._id,
      studentName: sn.value,
      roomNo: rn.value,
      month: mo.value,
      roomType,
      facilityType,
      amount,
      transactionType,
      proofFile,
      status: 'pending',
    })
    const populated = await Payment.findById(payment._id).populate('student', 'name email universityId')
    res.status(201).json(serializePayment(populated))
  } catch (err) {
    const code = err?.name === 'ValidationError' ? 400 : 500
    res.status(code).json({ error: err.message })
  }
}

export const patchPaymentStatus = async (req, res) => {
  try {
    const exists = await Payment.exists({ _id: req.params.id })
    if (!exists) return res.status(404).json({ error: 'Payment not found' })

    const nextStatus = normalizePaymentStatus(req.body.status)
    if (!nextStatus) return res.status(400).json({ error: 'Invalid status' })

    const hasRemarks = req.body.adminRemarks !== undefined
    if (nextStatus !== 'rejected' && hasRemarks) {
      return res.status(400).json({ error: 'adminRemarks allowed only when status is rejected' })
    }

    const $set = { status: nextStatus }
    if (nextStatus === 'rejected') $set.adminRemarks = req.body.adminRemarks

    await Payment.updateOne({ _id: req.params.id }, { $set }, { runValidators: true })

    const payment = await Payment.findById(req.params.id).populate('student', 'name email universityId')
    res.json(serializePayment(payment))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

/** @deprecated */
export const getAllPayments = getAdminPayments
export const updatePaymentStatus = patchPaymentStatus
export const listPayments = getAdminPayments
export const updatePayment = patchPaymentStatus
