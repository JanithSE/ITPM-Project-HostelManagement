import Notification from '../models/Notification.js'

const studentFilter = (userId) => ({ userId })

async function getUnreadCount(userId) {
  return Notification.countDocuments({ ...studentFilter(userId), isRead: false })
}

export async function getMyNotifications(req, res) {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const filter = studentFilter(req.user._id)
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
    const unreadCount = await getUnreadCount(req.user._id)
    return res.json({ notifications, unreadCount })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load notifications' })
  }
}

export async function markNotificationAsRead(req, res) {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const filter = { ...studentFilter(req.user._id), _id: req.params.id }
    const notification = await Notification.findOneAndUpdate(
      filter,
      { $set: { isRead: true } },
      { new: true }
    ).lean()
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }
    const unreadCount = await getUnreadCount(req.user._id)
    return res.json({ notification, unreadCount })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to mark notification as read' })
  }
}
