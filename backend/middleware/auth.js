import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: no token' })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    User.findById(decoded.userId)
      .then((user) => {
        if (!user) return res.status(401).json({ error: 'User not found' })
        req.user = user
        next()
      })
      .catch(() => res.status(401).json({ error: 'Unauthorized' }))
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

export { JWT_SECRET }
