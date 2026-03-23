import Payment, {
  PAYMENT_FACILITY_TYPES,
  PAYMENT_ROOM_TYPES,
  PAYMENT_TRANSACTION_TYPES,
} from '../models/Payment.js'

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

export const createPayment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Upload slip / proof is required (image or PDF)' })
    }

    const studentName = String(req.body.studentName ?? '').trim()
    const roomNo = String(req.body.roomNo ?? '').trim()
    const month = String(req.body.month ?? '').trim()
    const roomType = String(req.body.roomType ?? '').trim()
    const facilityType = String(req.body.facilityType ?? '').trim()
    const transactionType = String(req.body.transactionType ?? '').trim()

    const amountRaw = req.body.amount
    const amountNum =
      typeof amountRaw === 'string' ? Number.parseFloat(amountRaw) : Number(amountRaw)
    const amount = Number.isFinite(amountNum) ? Math.round(amountNum * 100) / 100 : NaN

    const errors = []
    if (!studentName) errors.push('Student name is required')
    if (!roomNo) errors.push('Room number is required')
    if (!month || !/^\d{4}-\d{2}$/.test(month)) errors.push('Valid month (YYYY-MM) is required')
    if (!PAYMENT_ROOM_TYPES.includes(roomType)) errors.push('Invalid room type')
    if (!PAYMENT_FACILITY_TYPES.includes(facilityType)) errors.push('Invalid facility type')
    if (!Number.isFinite(amount) || amount <= 0) errors.push('Amount must be greater than zero')
    if (!PAYMENT_TRANSACTION_TYPES.includes(transactionType)) errors.push('Invalid transaction type')

    if (errors.length) {
      return res.status(400).json({ error: errors.join('. ') })
    }

    const proofFile = proofPathFromFile(req.file)

    const payment = await Payment.create({
      student: req.user._id,
      studentName,
      roomNo,
      month,
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
