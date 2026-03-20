import LatePass from '../models/LatePass.js'

function normalizeLatepassStatus(input) {
  if (!input) return null
  const s = String(input).toLowerCase()

  // Backward compatible mapping
  if (s === 'approved') return 'completed'

  if (['pending', 'processing', 'completed', 'rejected'].includes(s)) return s
  return null
}

export const getMyLatepass = async (req, res) => {
  try {
    const passes = await LatePass.find({ student: req.user._id })
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
    res.json(passes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getAllLatepass = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { student: req.user._id }
    const passes = await LatePass.find(query)
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
    res.json(passes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const createLatepass = async (req, res) => {
  try {
    const pass = await LatePass.create({
      student: req.user._id,
      date: req.body.date,
      returnTime: req.body.returnTime,
      reason: req.body.reason,
      status: 'pending',
      // adminRemarks can only be saved by admin during workflow update
    })
    const populated = await LatePass.findById(pass._id).populate('student', 'name email')
    res.status(201).json(populated)
  } catch (err) {
    const code = err?.name === 'ValidationError' ? 400 : 500
    res.status(code).json({ error: err.message })
  }
}

export const updateLatepassStatus = async (req, res) => {
  try {
    const pass = await LatePass.findById(req.params.id)
    if (!pass) return res.status(404).json({ error: 'Late pass not found' })

    const nextStatus = normalizeLatepassStatus(req.body.status)
    if (!nextStatus) return res.status(400).json({ error: 'Invalid status' })

    // Admin-only workflow update rules
    const hasRemarks = req.body.adminRemarks !== undefined
    if (nextStatus !== 'rejected' && hasRemarks) {
      return res.status(400).json({ error: 'adminRemarks allowed only when status is rejected' })
    }

    pass.status = nextStatus
    if (nextStatus === 'rejected') pass.adminRemarks = req.body.adminRemarks

    await pass.save()
    const populated = await LatePass.findById(pass._id).populate('student', 'name email')
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Backward-compatible exports (older route names)
export const listLatepasses = getAllLatepass
export const updateLatepass = updateLatepassStatus

