/**
 * VIVA: Maintenance — backend (Express controllers)
 * - Mounted at `app.use('/api/maintenance', maintenanceRoutes)` in server.js.
 * - Student: create/list own/update/delete when status is `open`; admin: list all + update status workflow.
 * - Validation: required fields, allowed priority/status; never trust frontend alone.
 * - Image: optional file from multer (`req.file`); `imageUrl` stores public path; file on disk under `uploads/maintenance/`.
 *   Replace deletes old file; delete request removes file (see `removeImageByUrl`).
 */
import MaintenanceRequest from '../models/MaintenanceRequest.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PRIORITIES = ['low', 'medium', 'high']
const STATUSES = ['open', 'in_progress', 'resolved']
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsRoot = path.join(__dirname, '..', 'uploads')

function uploadedImageUrl(reqFile) {
  if (!reqFile?.filename) return ''
  return `/uploads/maintenance/${reqFile.filename}`
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

function nextStatusAllowed(current, next) {
  if (next === current) return true
  if (current === 'open' && next === 'in_progress') return true
  if (current === 'in_progress' && next === 'resolved') return true
  return false
}
export const listMaintenance = async (req, res) => {
  try {
    const list = await MaintenanceRequest.find()
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
    res.json(list)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const listMyMaintenance = async (req, res) => {
  try {
    const list = await MaintenanceRequest.find({ reportedBy: req.user._id })
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
    res.json(list)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const createMaintenance = async (req, res) => {
  try {
    const { title, description, location, priority } = req.body
    const newImageUrl = uploadedImageUrl(req.file)

    if (!title || !String(title).trim()) {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Title is required' })
    }
    if (!description || !String(description).trim()) {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Description is required' })
    }
    if (!priority || !PRIORITIES.includes(priority)) {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Priority is required (low, medium, or high)' })
    }

    const item = await MaintenanceRequest.create({
      title: String(title).trim(),
      description: String(description).trim(),
      location: location != null ? String(location).trim() : '',
      priority,
      status: 'open',
      imageUrl: newImageUrl,
      reportedBy: req.user._id,
    })
    const populated = await MaintenanceRequest.findById(item._id).populate('reportedBy', 'name email')
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const updateMaintenanceStatus = async (req, res) => {
  try {
    const { status } = req.body
    if (status == null || !STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Valid status required (open, in_progress, or resolved)' })
    }

    const item = await MaintenanceRequest.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Request not found' })

    if (!nextStatusAllowed(item.status, status)) {
      return res.status(400).json({
        error: 'Invalid status transition (allowed: open → in_progress → resolved)',
      })
    }

    item.status = status
    await item.save()
    const populated = await MaintenanceRequest.findById(item._id).populate('reportedBy', 'name email')
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const updateMyMaintenance = async (req, res) => {
  try {
    const { title, description, location, priority } = req.body || {}
    const newImageUrl = uploadedImageUrl(req.file)

    const item = await MaintenanceRequest.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Request not found' })
    if (String(item.reportedBy) !== String(req.user._id)) {
      await removeImageByUrl(newImageUrl)
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (item.status !== 'open') {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Only open requests can be updated' })
    }

    if (!title || !String(title).trim()) {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Title is required' })
    }
    if (!description || !String(description).trim()) {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Description is required' })
    }
    if (!priority || !PRIORITIES.includes(priority)) {
      await removeImageByUrl(newImageUrl)
      return res.status(400).json({ error: 'Priority is required (low, medium, or high)' })
    }

    item.title = String(title).trim()
    item.description = String(description).trim()
    item.location = location != null ? String(location).trim() : ''
    item.priority = priority
    if (req.file) {
      await removeImageByUrl(item.imageUrl)
      item.imageUrl = newImageUrl
    }
    await item.save()

    const populated = await MaintenanceRequest.findById(item._id).populate('reportedBy', 'name email')
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const deleteMyMaintenance = async (req, res) => {
  try {
    const item = await MaintenanceRequest.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Request not found' })
    if (String(item.reportedBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (item.status !== 'open') {
      return res.status(400).json({ error: 'Only open requests can be deleted' })
    }

    await removeImageByUrl(item.imageUrl)
    await item.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
