import User from '../models/User.js'
import LatePassNotification from '../models/latePassNotificationModel.js'

function mapRoleToTarget(role) {
  const value = String(role || '').toLowerCase()
  if (value === 'admin') return 'ADMIN'
  if (value === 'warden') return 'WARDEN'
  if (value === 'student') return 'STUDENT'
  return null
}

export async function notifyAdminsAndWardens(message, latePassId, createdBy) {
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
        latePassId,
        createdBy,
        type: 'LATE_PASS',
      }
    })
    .filter(Boolean)

  if (!docs.length) return { inserted: 0 }
  const inserted = await LatePassNotification.insertMany(docs, { ordered: false })
  return { inserted: inserted.length }
}

export async function notifyStudent(userId, message, latePassId, createdBy) {
  if (!userId) return null
  return LatePassNotification.create({
    userId,
    message: String(message || '').trim(),
    roleTarget: 'STUDENT',
    latePassId,
    createdBy,
    type: 'LATE_PASS',
  })
}

export { mapRoleToTarget }
