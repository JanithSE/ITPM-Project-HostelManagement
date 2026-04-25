/**
 * Late pass in-app notifications: list, mark one read, mark all read (no delete route).
 */
import LatePassNotification from '../models/latePassNotificationModel.js'
import { mapRoleToTarget } from '../services/latePassNotificationService.js'

/** Thin alias so buildViewerFilter reads clearly. */
function getRoleTargetOrNull(role) {
  return mapRoleToTarget(role)
}

/** Scoped inbox filter: current user + role + LATE_PASS type. */
function buildViewerFilter(user) {
  const roleTarget = getRoleTargetOrNull(user?.role)
  if (!roleTarget) return null
  return {
    userId: user._id,
    roleTarget,
    type: 'LATE_PASS',
  }
}

/** Unread badge count for the current viewer filter. */
async function getUnreadCount(filter) {
  return LatePassNotification.countDocuments({ ...filter, read: false })
}

/** GET — bell payload: recent notifications + unread count. */
export async function getMyLatePassNotifications(req, res) {
  try {
    const filter = buildViewerFilter(req.user)
    if (!filter) return res.status(403).json({ error: 'Forbidden' })

    const notifications = await LatePassNotification.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    const unreadCount = await getUnreadCount(filter)
    return res.json({ notifications, unreadCount })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load notifications' })
  }
}

/** PUT — mark single notification read by id (must belong to viewer). */
export async function markLatePassNotificationAsRead(req, res) {
  try {
    const filter = buildViewerFilter(req.user)
    if (!filter) return res.status(403).json({ error: 'Forbidden' })

    const notification = await LatePassNotification.findOneAndUpdate(
      { ...filter, _id: req.params.id },
      { $set: { read: true } },
      { new: true }
    ).lean()

    if (!notification) return res.status(404).json({ error: 'Notification not found' })
    const unreadCount = await getUnreadCount(filter)
    return res.json({ notification, unreadCount })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to mark notification as read' })
  }
}

/** PUT — mark all unread in viewer inbox as read. */
export async function markAllLatePassNotificationsAsRead(req, res) {
  try {
    const filter = buildViewerFilter(req.user)
    if (!filter) return res.status(403).json({ error: 'Forbidden' })

    await LatePassNotification.updateMany({ ...filter, read: false }, { $set: { read: true } })
    return res.json({ ok: true, unreadCount: 0 })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to mark all notifications as read' })
  }
}
