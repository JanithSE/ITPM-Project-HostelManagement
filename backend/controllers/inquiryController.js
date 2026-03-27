import Inquiry from '../models/Inquiry.js'

function inquiryPopulate(query) {
  return query
    .populate('from', 'name email')
    .populate('comments.author', 'name email role')
}

export const listAllInquiries = async (req, res) => {
  try {
    const inquiries = await inquiryPopulate(Inquiry.find())
      .sort({ createdAt: -1 })
    res.json(inquiries)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const listMyInquiries = async (req, res) => {
  try {
    const inquiries = await inquiryPopulate(Inquiry.find({ from: req.user._id }))
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
      comments: [
        {
          author: req.user._id,
          role: req.user.role,
          text: String(message).trim(),
        },
      ],
    })
    const populated = await inquiryPopulate(Inquiry.findById(inquiry._id))
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
    inquiry.comments.push({
      author: req.user._id,
      role: req.user.role,
      text: String(reply).trim(),
    })
    await inquiry.save()
    const populated = await inquiryPopulate(Inquiry.findById(inquiry._id))
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const addInquiryComment = async (req, res) => {
  try {
    const { text } = req.body || {}
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Comment is required' })
    }

    const inquiry = await Inquiry.findById(req.params.id)
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' })

    const isOwner = String(inquiry.from) === String(req.user._id)
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    inquiry.comments.push({
      author: req.user._id,
      role: req.user.role,
      text: String(text).trim(),
    })
    await inquiry.save()

    const populated = await inquiryPopulate(Inquiry.findById(inquiry._id))
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
