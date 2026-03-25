import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { JWT_SECRET } from '../middleware/auth.js'

function signToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export const studentSignup = async (req, res) => {
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
}

export const wardenSignup = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      nic,
      address,
      gender,
      assignedHostel,
      password,
    } = req.body || {}

    if (!fullName || !email || !phoneNumber || !nic || !address || !gender || !assignedHostel || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    const emailNorm = String(email).trim().toLowerCase()
    if (!emailNorm) {
      return res.status(400).json({ error: 'Valid email required' })
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const existing = await User.findOne({ email: emailNorm })
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const user = await User.create({
      name: String(fullName).trim(),
      email: emailNorm,
      password,
      role: 'warden',
      phoneNumber: String(phoneNumber).trim(),
      nic: String(nic).trim(),
      address: String(address).trim(),
      gender: String(gender).trim().toLowerCase(),
      assignedHostel: String(assignedHostel).trim(),
    })

    const token = signToken(user)
    res.status(201).json({
      token,
      role: 'warden',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        nic: user.nic,
        address: user.address,
        gender: user.gender,
        assignedHostel: user.assignedHostel,
      },
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' })
    }
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join('. ')
      return res.status(400).json({ error: msg || 'Validation failed' })
    }
    res.status(500).json({ error: err.message || 'Warden registration failed' })
  }
}

export const wardenLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const emailNorm = String(email).trim().toLowerCase()
    const user = await User.findOne({ email: emailNorm, role: 'warden' })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const valid = await user.comparePassword(password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const token = signToken(user)
    res.json({
      token,
      role: 'warden',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        nic: user.nic,
        address: user.address,
        gender: user.gender,
        assignedHostel: user.assignedHostel,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const studentLogin = async (req, res) => {
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
}

const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'admin123'

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body || {}
    const usernameNorm = (username || '').trim().toLowerCase()
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' })
    }
    if (usernameNorm !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }
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
    res.json({ token, role: 'admin', user: { id: user._id, name: 'Admin', email: usernameNorm } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

