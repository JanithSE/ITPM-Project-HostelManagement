import express from 'express'
import { studentSignup, studentLogin, adminLogin, wardenSignup, wardenLogin } from '../controllers/authController.js'

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

export default router
