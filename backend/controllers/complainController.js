import Complain from '../models/Complain.js'

export const listComplains = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { student: req.user._id }
    const complains = await Complain.find(query)
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
    res.json(complains)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const createComplain = async (req, res) => {
  try {
    const { subject, description } = req.body
    if (!subject || !description) return res.status(400).json({ error: 'Subject and description required' })
    const complain = await Complain.create({ student: req.user._id, subject, description })
    const populated = await Complain.findById(complain._id).populate('student', 'name email')
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const updateComplain = async (req, res) => {
  try {
    const complain = await Complain.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate('student', 'name email')
    if (!complain) return res.status(404).json({ error: 'Complain not found' })
    res.json(complain)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

