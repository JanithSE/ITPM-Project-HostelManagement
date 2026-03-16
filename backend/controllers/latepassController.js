import LatePass from '../models/LatePass.js'

export const listLatepasses = async (req, res) => {
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
    const pass = await LatePass.create({ student: req.user._id, ...req.body })
    const populated = await LatePass.findById(pass._id).populate('student', 'name email')
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const updateLatepass = async (req, res) => {
  try {
    const pass = await LatePass.findById(req.params.id)
    if (!pass) return res.status(404).json({ error: 'Late pass not found' })
    if (req.body.status) {
      pass.status = req.body.status
      if (['approved', 'rejected'].includes(req.body.status)) {
        pass.approvedBy = req.user._id
        pass.approvedAt = new Date()
      }
    }
    await pass.save()
    const populated = await LatePass.findById(pass._id).populate('student', 'name email')
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

