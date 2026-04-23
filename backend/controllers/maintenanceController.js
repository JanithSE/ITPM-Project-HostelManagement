import MaintenanceRequest from '../models/MaintenanceRequest.js'

const PRIORITIES = ['low', 'medium', 'high']
const STATUSES = ['open', 'in_progress', 'resolved']

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

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Title is required' })
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: 'Description is required' })
    }
    if (!priority || !PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Priority is required (low, medium, or high)' })
    }

    const item = await MaintenanceRequest.create({
      title: String(title).trim(),
      description: String(description).trim(),
      location: location != null ? String(location).trim() : '',
      priority,
      status: 'open',
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

    const item = await MaintenanceRequest.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Request not found' })
    if (String(item.reportedBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (item.status !== 'open') {
      return res.status(400).json({ error: 'Only open requests can be updated' })
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Title is required' })
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: 'Description is required' })
    }
    if (!priority || !PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Priority is required (low, medium, or high)' })
    }

    item.title = String(title).trim()
    item.description = String(description).trim()
    item.location = location != null ? String(location).trim() : ''
    item.priority = priority
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

    await item.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
