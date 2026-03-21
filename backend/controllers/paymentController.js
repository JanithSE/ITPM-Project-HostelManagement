import Payment from '../models/Payment.js'

function normalizePaymentStatus(input) {
  if (!input) return null
  const s = String(input).toLowerCase()

  // Backward compatible mappings
  if (s === 'paid') return 'completed'
  if (s === 'failed') return 'rejected'

  if (['pending', 'processing', 'completed', 'rejected'].includes(s)) return s
  return null
}

export const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ student: req.user._id })
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
    res.json(payments)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getAllPayments = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { student: req.user._id }
    const payments = await Payment.find(query)
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
    res.json(payments)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const createPayment = async (req, res) => {
  try {
    const studentId = req.user._id

    if (!req.file) {
      return res.status(400).json({ error: 'Payment proof file is required (PDF or image)' })
    }

    const proofFromFile = `/uploads/${req.file.filename}`
    const proofUrl = proofFromFile || req.body.proofUrl || null

    const amountRaw = req.body.amount
    const amountNum = typeof amountRaw === 'string' ? Number.parseFloat(amountRaw) : Number(amountRaw)
    const roomNoTrim = String(req.body.roomNo ?? '').trim() || undefined

    if (Number.isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' })
    }

    const payment = await Payment.create({
      student: studentId,
      month: req.body.month,
      amount: amountNum,
      ...(roomNoTrim ? { roomNo: roomNoTrim } : {}),
      roomType: req.body.roomType,
      facilityType: req.body.facilityType,
      transactionReference: req.body.transactionReference,
      proofUrl,
      status: 'pending',
      // adminRemarks can only be saved by admin during workflow update
    })
    const populated = await Payment.findById(payment._id).populate('student', 'name email')
    res.status(201).json(populated)
  } catch (err) {
    const code = err?.name === 'ValidationError' ? 400 : 500
    res.status(code).json({ error: err.message })
  }
}

export const updatePaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('student', 'name email')
    if (!payment) return res.status(404).json({ error: 'Payment not found' })

    const nextStatus = normalizePaymentStatus(req.body.status)
    if (!nextStatus) return res.status(400).json({ error: 'Invalid status' })

    // Admin-only workflow update rules
    const hasRemarks = req.body.adminRemarks !== undefined
    if (nextStatus !== 'rejected' && hasRemarks) {
      return res.status(400).json({ error: 'adminRemarks allowed only when status is rejected' })
    }

    payment.status = nextStatus
    if (nextStatus === 'rejected') payment.adminRemarks = req.body.adminRemarks

    await payment.save()
    res.json(payment)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Backward-compatible exports (older route names)
export const listPayments = getAllPayments
export const updatePayment = updatePaymentStatus

