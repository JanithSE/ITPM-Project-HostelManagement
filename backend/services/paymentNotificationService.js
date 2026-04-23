import User from '../models/User.js'
import PaymentNotification from '../models/paymentNotificationModel.js'

function mapRoleToTarget(role) {
  const value = String(role || '').toLowerCase()
  if (value === 'admin') return 'ADMIN'
  if (value === 'warden') return 'WARDEN'
  if (value === 'student') return 'STUDENT'
  return null
}

export async function notifyAdminsAndWardens(message, paymentId, month, createdBy) {
  const users = await User.find({ role: { $in: ['admin', 'warden'] } }, { _id: 1, role: 1 }).lean()
  if (!users.length) return { inserted: 0 }

  const docs = users
    .map((user) => {
      const roleTarget = mapRoleToTarget(user.role)
      if (!roleTarget) return null
      return {
        userId: user._id,
        message: String(message || '').trim(),
        roleTarget,
        paymentId,
        month: String(month || '').trim(),
        createdBy,
        type: 'PAYMENT',
      }
    })
    .filter(Boolean)

  if (!docs.length) return { inserted: 0 }
  const inserted = await PaymentNotification.insertMany(docs, { ordered: false })
  return { inserted: inserted.length }
}

export async function notifyStudent(userId, message, paymentId, month, createdBy) {
  if (!userId) return null
  return PaymentNotification.create({
    userId,
    message: String(message || '').trim(),
    roleTarget: 'STUDENT',
    paymentId,
    month: String(month || '').trim(),
    createdBy,
    type: 'PAYMENT',
  })
}

export { mapRoleToTarget }
