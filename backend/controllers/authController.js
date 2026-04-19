import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import User from '../models/User.js'
import { JWT_SECRET } from '../middleware/auth.js'

function signToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

const OTP_VALIDITY_MS = 5 * 60 * 1000
/** Window after OTP verification during which the user may submit a new password (opaque token, not email OTP). */
const PASSWORD_RESET_TOKEN_VALIDITY_MS = 15 * 60 * 1000

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000))
}

function hashOtp(otpCode) {
  return crypto.createHash('sha256').update(String(otpCode)).digest('hex')
}

function hashPasswordResetToken(rawToken) {
  // Store only the hash, never the raw token.
  return crypto.createHash('sha256').update(String(rawToken), 'utf8').digest('hex')
}

function generatePasswordResetToken() {
  // 32 bytes => 64 hex chars. Good enough as an opaque one-time secret.
  return crypto.randomBytes(32).toString('hex')
}

function isDevOtpConsoleEnabled() {
  const v = String(process.env.DEV_OTP_TO_CONSOLE || '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  })
}

async function sendOtpEmail({ to, otpCode, purpose }) {
  const emailUser = process.env.EMAIL_USER
  const emailPass = process.env.EMAIL_PASS

  if (!emailUser || !emailPass) {
    if (isDevOtpConsoleEnabled()) {
      console.warn(
        `[DEV_OTP_TO_CONSOLE] OTP for ${to} (${purpose}): ${otpCode} — no email sent (set EMAIL_USER + EMAIL_PASS for real mail).`
      )
      return
    }
    throw new Error(
      'Email is not configured. In backend/.env set EMAIL_USER (your Gmail) and EMAIL_PASS (Gmail App Password, not your normal password). For local testing only you can set DEV_OTP_TO_CONSOLE=1 to print the OTP in the server terminal.'
    )
  }

  const transporter = createTransport()
  const subject =
    purpose === 'password_reset' ? 'UniHostel Password Reset OTP' : 'UniHostel Email Verification OTP'
  const actionText = purpose === 'password_reset' ? 'reset your password' : 'verify your account'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2>UniHostel OTP Verification</h2>
      <p>Use the OTP below to ${actionText}.</p>
      <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700; margin: 16px 0;">${otpCode}</p>
      <p>This OTP expires in 5 minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `
  try {
    await transporter.sendMail({
      from: emailUser,
      to,
      subject,
      html,
    })
  } catch (err) {
    console.error('[sendOtpEmail]', err)
    const detail = err?.response || err?.message || 'send failed'
    throw new Error(
      `Failed to send email (${detail}). Use a Gmail App Password for EMAIL_PASS, enable 2-Step Verification on the Google account, and ensure EMAIL_USER matches that Gmail address.`
    )
  }
}

async function issueOtpForUser(user, purpose) {
  const otpCode = generateOtpCode()
  user.otpCode = hashOtp(otpCode)
  user.otpPurpose = purpose
  user.otpExpiresAt = new Date(Date.now() + OTP_VALIDITY_MS)
  if (purpose === 'password_reset') {
    // Invalidate any previous reset session for safety.
    user.passwordResetTokenHash = ''
    user.passwordResetExpiresAt = null
  }
  await user.save()
  await sendOtpEmail({ to: user.email, otpCode, purpose })
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
    const user = await User.create({
      name: name.trim(),
      email: emailNorm,
      password,
      role: 'student',
      isVerified: false,
    })

    await issueOtpForUser(user, 'registration')

    res.status(201).json({
      message: 'Registration successful. OTP sent to email.',
      requiresOtp: true,
      email: user.email,
    })
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
    console.error('[wardenLogin]', err)
    const msg =
      err?.name === 'MongoServerSelectionError' || err?.name === 'MongooseError'
        ? 'Database unavailable. Try again in a moment.'
        : err?.message || 'Sign in failed'
    res.status(500).json({ error: msg })
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
    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in' })
    }
    const token = signToken(user)
    res.json({ token, role: 'student', user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    console.error('[studentLogin] Full error:', err)
    const msg =
      err?.name === 'MongoServerSelectionError' || err?.name === 'MongooseError'
        ? 'Database unavailable. Try again in a moment.'
        : err?.message || 'Sign in failed'
    res.status(500).json({ error: msg })
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
    console.error('[adminLogin] Full error:', err)
    const msg =
      err?.name === 'MongoServerSelectionError' || err?.name === 'MongooseError'
        ? 'Database unavailable. Try again in a moment.'
        : err?.message || 'Sign in failed'
    res.status(500).json({ error: msg })
  }
}

export const register = async (req, res) => {
  return studentSignup(req, res)
}

export const login = async (req, res) => {
  return studentLogin(req, res)
}

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp, purpose } = req.body || {}
    const emailNorm = normalizeEmail(email)
    if (!emailNorm || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' })
    }

    const otpPurpose = purpose === 'password_reset' ? 'password_reset' : 'registration'
    const user = await User.findOne({ email: emailNorm, role: 'student' })
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (!user.otpCode || !user.otpExpiresAt || !user.otpPurpose) {
      return res.status(400).json({ error: 'No OTP request found' })
    }
    if (user.otpPurpose !== otpPurpose) {
      return res.status(400).json({ error: 'OTP purpose mismatch' })
    }
    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'OTP expired' })
    }

    const incomingHash = hashOtp(otp)
    if (incomingHash !== user.otpCode) {
      return res.status(400).json({ error: 'Invalid OTP' })
    }

    let resetToken = null
    if (otpPurpose === 'registration') {
      user.isVerified = true
      // Registration OTP is single-use: clear it immediately after verification.
      user.otpCode = ''
      user.otpPurpose = ''
      user.otpExpiresAt = null
    } else {
      // Password reset OTP: do NOT delete otpCode/otpExpiresAt here.
      // Instead, issue a separate one-time resetToken for the reset step.
      resetToken = generatePasswordResetToken()
      user.passwordResetTokenHash = hashPasswordResetToken(resetToken)
      user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_VALIDITY_MS)
    }

    await user.save()

    return res.json({
      message: otpPurpose === 'registration' ? 'Account verified successfully' : 'OTP verified successfully',
      ...(resetToken ? { resetToken } : {}),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'OTP verification failed' })
  }
}

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {}
    const emailNorm = normalizeEmail(email)
    if (!emailNorm) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const user = await User.findOne({ email: emailNorm, role: 'student' })
    if (user) {
      await issueOtpForUser(user, 'password_reset')
    }

    return res.json({ message: 'If the account exists, OTP has been sent to the email' })
  } catch (err) {
    const msg = err?.message || 'Failed to process forgot password request'
    const isEmail =
      msg.includes('Email is not configured') ||
      msg.includes('Failed to send email') ||
      msg.includes('Gmail App Password')
    return res.status(isEmail ? 503 : 500).json({ error: msg })
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, password } = req.body || {}
    const emailNorm = normalizeEmail(email)
    const tokenRaw = String(resetToken || '').trim()
    if (!emailNorm || !tokenRaw || !password) {
      return res.status(400).json({ error: 'Email, reset token and new password are required' })
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const user = await User.findOne({ email: emailNorm, role: 'student' })
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (!user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
      return res.status(400).json({ error: 'No valid password reset session. Verify OTP first.' })
    }
    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Reset session expired. Verify OTP again.' })
    }
    if (hashPasswordResetToken(tokenRaw) !== user.passwordResetTokenHash) {
      return res.status(400).json({ error: 'Invalid reset token' })
    }

    user.password = String(password)
    // Clear both the reset token and OTP (OTP is no longer needed once password is updated).
    user.passwordResetTokenHash = ''
    user.passwordResetExpiresAt = null
    user.otpCode = ''
    user.otpPurpose = ''
    user.otpExpiresAt = null
    await user.save()

    return res.json({ message: 'Password reset successful' })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Password reset failed' })
  }
}

/** Current user from JWT (any authenticated role). */
export const getMe = async (req, res) => {
  try {
    const u = req.user
    if (!u) return res.status(401).json({ error: 'Unauthorized' })
    return res.json({
      user: {
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        phoneNumber: u.phoneNumber || '',
        universityId: u.universityId || '',
      },
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load profile' })
  }
}

/** Update own display name / phone (stored on User). Email changes are not supported here. */
export const patchMe = async (req, res) => {
  try {
    const u = req.user
    if (!u) return res.status(401).json({ error: 'Unauthorized' })
    const { name, phoneNumber } = req.body || {}
    if (name != null) {
      const n = String(name).trim()
      if (!n) return res.status(400).json({ error: 'Name cannot be empty' })
      u.name = n
    }
    if (phoneNumber != null) u.phoneNumber = String(phoneNumber).trim()
    await u.save()
    return res.json({
      user: {
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        phoneNumber: u.phoneNumber || '',
        universityId: u.universityId || '',
      },
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update profile' })
  }
}
