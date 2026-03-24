import Inquiry from '../models/Inquiry.js'

export const listAllInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find()
      .populate('from', 'name email')
      .sort({ createdAt: -1 })
    res.json(inquiries)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const listMyInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ from: req.user._id })
      .populate('from', 'name email')
      .sort({ createdAt: -1 })
    res.json(inquiries)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const createInquiry = async (req, res) => {
  try {
    const { subject, message } = req.body
    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ error: 'Subject is required' })
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message is required' })
    }
    const inquiry = await Inquiry.create({
      from: req.user._id,
      subject: String(subject).trim(),
      message: String(message).trim(),
      status: 'open',
    })
    const populated = await Inquiry.findById(inquiry._id).populate('from', 'name email')
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const replyToInquiry = async (req, res) => {
  try {
    const { reply } = req.body
    if (reply == null || !String(reply).trim()) {
      return res.status(400).json({ error: 'Reply is required' })
    }
    const inquiry = await Inquiry.findById(req.params.id)
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' })
    inquiry.reply = String(reply).trim()
    inquiry.repliedAt = new Date()
    inquiry.status = 'replied'
    await inquiry.save()
    const populated = await Inquiry.findById(inquiry._id).populate('from', 'name email')
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
