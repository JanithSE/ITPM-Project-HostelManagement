import express from 'express'
import {
  studentSignup,
  studentLogin,
  adminLogin,
  wardenSignup,
  wardenLogin,
  register,
  verifyOtp,
  login,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js'

const router = express.Router()

// POST /api/auth/student-signup
router.post('/student-signup', studentSignup)

// POST /api/auth/student-login
router.post('/student-login', studentLogin)

// POST /api/auth/admin-login
router.post('/admin-login', adminLogin)

// POST /api/auth/warden-signup
router.post('/warden-signup', wardenSignup)

// POST /api/auth/warden-login
router.post('/warden-login', wardenLogin)

// Required OTP auth routes (student)
router.post('/register', register)
router.post('/verify-otp', verifyOtp)
router.post('/login', login)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

export default router
