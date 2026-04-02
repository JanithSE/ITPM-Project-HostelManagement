import Notification from '../models/Notification.js'

export const listMyNotifications = async (req, res) => {
  try {
    const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50)
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load notifications' })
  }
}

export const markNotificationRead = async (req, res) => {
  try {
    const item = await Notification.findOne({ _id: req.params.id, user: req.user._id })
    if (!item) return res.status(404).json({ error: 'Notification not found' })
    item.isRead = true
    item.readAt = new Date()
    await item.save()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to mark notification as read' })
  }
}
