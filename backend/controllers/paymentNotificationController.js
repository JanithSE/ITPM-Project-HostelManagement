/**
 * In-app payment notifications: list for current user, mark read, mark all read, delete one.
 * Each row is scoped by userId + roleTarget + type=PAYMENT.
 */
import PaymentNotification from '../models/paymentNotificationModel.js'
import { mapRoleToTarget } from '../services/paymentNotificationService.js'

/** Mongo filter so users only see their own payment-notification inbox. */
function buildViewerFilter(user) {
  const roleTarget = mapRoleToTarget(user?.role)
  if (!roleTarget) return null
  return { userId: user._id, roleTarget, type: 'PAYMENT' }
}

/** Count unread rows for the same viewer filter (bell badge). */
async function getUnreadCount(filter) {
  return PaymentNotification.countDocuments({ ...filter, read: false })
}

/** GET — paginated-ish list (100) + unread count for bell UI. */
export async function getMyPaymentNotifications(req, res) {
  try {
    const filter = buildViewerFilter(req.user)
    if (!filter) return res.status(403).json({ error: 'Forbidden' })

    const notifications = await PaymentNotification.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    const unreadCount = await getUnreadCount(filter)
    return res.json({ notifications, unreadCount })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load notifications' })
  }
}

/** PUT — mark one notification read; returns updated unread count. */
export async function markPaymentNotificationAsRead(req, res) {
  try {
    const filter = buildViewerFilter(req.user)
    if (!filter) return res.status(403).json({ error: 'Forbidden' })

    const notification = await PaymentNotification.findOneAndUpdate(
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

/** PUT — mark entire inbox read for this user/role. */
export async function markAllPaymentNotificationsAsRead(req, res) {
  try {
    const filter = buildViewerFilter(req.user)
    if (!filter) return res.status(403).json({ error: 'Forbidden' })

    await PaymentNotification.updateMany({ ...filter, read: false }, { $set: { read: true } })
    return res.json({ ok: true, unreadCount: 0 })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to mark all notifications as read' })
  }
}

/** DELETE — remove one row if it belongs to the caller. */
export async function deletePaymentNotification(req, res) {
  try {
    console.log('[Backend] Deleting notification:', req.params.id, 'for user:', req.user._id)
    const filter = buildViewerFilter(req.user)
    if (!filter) return res.status(403).json({ error: 'Forbidden' })

    const notification = await PaymentNotification.findOneAndDelete({
      ...filter,
      _id: req.params.id,
    })

    if (!notification) return res.status(404).json({ error: 'Notification not found' })

    const unreadCount = await getUnreadCount(filter)
    return res.json({ ok: true, unreadCount })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to delete notification' })
  }
}
