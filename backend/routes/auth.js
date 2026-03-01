import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { JWT_SECRET } from '../middleware/auth.js'

const router = express.Router()

function signToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// POST /api/auth/student-signup
router.post('/student-signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {}
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password required' })
    }
    const emailNorm = String(email).trim().toLowerCase()
    if (!emailNorm) {
      return res.status(400).json({ error: 'Valid email required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const existing = await User.findOne({ email: emailNorm })
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' })
    }
    const user = await User.create({ name: name.trim(), email: emailNorm, password, role: 'student' })
    const token = signToken(user)
    res.status(201).json({ token, role: 'student', user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' })
    }
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join('. ')
      return res.status(400).json({ error: msg || 'Validation failed' })
    }
    res.status(500).json({ error: err.message || 'Registration failed' })
  }
})

// POST /api/auth/student-login
router.post('/student-login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const emailNorm = String(email).trim().toLowerCase()
    const user = await User.findOne({ email: emailNorm, role: 'student' })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const valid = await user.comparePassword(password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const token = signToken(user)
    res.json({ token, role: 'student', user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Fixed admin login – only these credentials work
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'admin123'

// POST /api/auth/admin-login
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const username = (email || '').trim().toLowerCase()
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' })
    }
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }
    // Use or create an admin user in DB so JWT has a valid userId for auth middleware
    let user = await User.findOne({ role: 'admin' })
    if (!user) {
      user = await User.create({
        name: 'Admin',
        email: 'admin@unihostel.com',
        password: ADMIN_PASSWORD,
        role: 'admin',
      })
    }
    const token = signToken(user)
    res.json({ token, role: 'admin', user: { id: user._id, name: 'Admin', email: username } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
