/**
 * VIVA: Inquiry — backend (Express controllers)
 * - Mounted at `app.use('/api/inquiry', inquiryRoutes)` in server.js.
 * - Student: create/list own/update/delete only when open and no admin reply yet; admin: list all + reply.
 * - Validation: Campus ID format, required subject/message; reply flow sets status to `replied`.
 * - Image: optional multer upload; `imageUrl` under `uploads/inquiries/`; cleanup on replace/delete.
 */
import Inquiry from '../models/Inquiry.js'
import Notification from '../models/Notification.js'
import User from '../models/User.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsRoot = path.join(__dirname, '..', 'uploads')

function uploadedImageUrl(reqFile) {
  if (!reqFile?.filename) return ''
  return `/uploads/inquiries/${reqFile.filename}`
}

async function removeImageByUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return
  if (!imageUrl.startsWith('/uploads/')) return
  const relPath = imageUrl.replace('/uploads/', '')
  const absPath = path.normalize(path.join(uploadsRoot, relPath))
  if (!absPath.startsWith(uploadsRoot)) return
  try {
    await fs.promises.unlink(absPath)
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      console.error('Failed to remove uploaded image:', err.message)
    }
  }
}

/** Avoids long quoted subjects (e.g. "Inquiry from Name (email)") in push-style notifications. */
function inquiryReplyNotificationMessage(inquiry) {
  const subject = String(inquiry.subject || '').trim()
  const fromTemplate = subject.match(/^Inquiry from\s+(.+?)\s+\(([^)]+)\)\s*$/i)
  if (fromTemplate) {
    return `An admin replied to your inquiry — ${fromTemplate[1].trim()}`
  }
  if (subject.length > 0 && subject.length <= 48) {
    return `An admin replied — “${subject}”`
  }
  if (subject.length > 48) {
    return `An admin replied — “${subject.slice(0, 45)}…”`
  }
  return 'An admin replied to your inquiry.'
}

function newInquiryNotificationMessage(inquiry, studentName) {
  const name = String(studentName || '').trim() || 'A student'
  const subject = String(inquiry?.subject || '').trim()
  if (subject.length > 0 && subject.length <= 48) {
    return `${name} sent a new inquiry — "${subject}"`
  }
  if (subject.length > 48) {
    return `${name} sent a new inquiry — "${subject.slice(0, 45)}..."`
  }
  return `${name} sent a new inquiry.`
}

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
    const { campusId, subject, message } = req.body
    const newImageUrl = uploadedImageUrl(req.file)
    const campusIdTrim = String(campusId || '').trim().toUpperCase()
    if (!/^[A-Z]{2}\d{8}$/.test(campusIdTrim)) {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Campus ID must be 2 uppercase letters + 8 digits (example: AB12345678)' })
    }
    if (!subject || !String(subject).trim()) {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Subject is required' })
    }
    if (!message || !String(message).trim()) {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Message is required' })
    }
    const inquiry = await Inquiry.create({
      from: req.user._id,
      campusId: campusIdTrim,
      subject: String(subject).trim(),
      message: String(message).trim(),
      imageUrl: newImageUrl,
      status: 'open',
      comments: [
        {
          author: req.user._id,
          role: req.user.role,
          text: String(message).trim(),
        },
      ],
    })

    try {
      const admins = await User.find({ role: 'admin' }).select('_id').lean()
      if (admins.length > 0) {
        const notifyDocs = admins.map((admin) => ({
          userId: admin._id,
          message: newInquiryNotificationMessage(inquiry, req.user?.name),
          type: 'inquiry_new',
          isRead: false,
          inquiryId: inquiry._id,
        }))
        await Notification.insertMany(notifyDocs, { ordered: false })
      }
    } catch (notifyErr) {
      console.error('Failed to create new inquiry notifications:', notifyErr?.message || notifyErr)
    }

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

    const notifMessage = inquiryReplyNotificationMessage(inquiry)
    try {
      if (inquiry.from) {
        await Notification.create({
          userId: inquiry.from,
          message: notifMessage,
          type: 'inquiry_reply',
          isRead: false,
          inquiryId: inquiry._id,
        })
      }
    } catch (notifyErr) {
      console.error('Failed to create inquiry reply notification:', notifyErr?.message || notifyErr)
    }

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

export const updateMyInquiry = async (req, res) => {
  try {
    const { campusId, subject, message } = req.body || {}
    const newImageUrl = uploadedImageUrl(req.file)
    const campusIdTrim = String(campusId || '').trim().toUpperCase()
    const inquiry = await Inquiry.findById(req.params.id)
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' })

    if (String(inquiry.from) !== String(req.user._id)) {
      await removeImageByUrl(newImageUrl)
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (inquiry.status !== 'open' || inquiry.reply) {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Only open inquiries without replies can be updated' })
    }

    if (!subject || !String(subject).trim()) {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Subject is required' })
    }
    if (!/^[A-Z]{2}\d{8}$/.test(campusIdTrim)) {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Campus ID must be 2 uppercase letters + 8 digits (example: AB12345678)' })
    }
    if (!message || !String(message).trim()) {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Message is required' })
    }

    inquiry.campusId = campusIdTrim
    inquiry.subject = String(subject).trim()
    inquiry.message = String(message).trim()
    if (req.file) {
      await removeImageByUrl(inquiry.imageUrl)
      inquiry.imageUrl = newImageUrl
    }
    await inquiry.save()

    const populated = await inquiryPopulate(Inquiry.findById(inquiry._id))
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const deleteMyInquiry = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' })

    if (String(inquiry.from) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (inquiry.status !== 'open' || inquiry.reply) {
      return res.status(400).json({ error: 'Only open inquiries without replies can be deleted' })
    }

    await removeImageByUrl(inquiry.imageUrl)
    await inquiry.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
