import express from 'express'
import { studentSignup, studentLogin, adminLogin } from '../controllers/authController.js'

const router = express.Router()

// POST /api/auth/student-signup
router.post('/student-signup', studentSignup)

// POST /api/auth/student-login
router.post('/student-login', studentLogin)

// POST /api/auth/admin-login
router.post('/admin-login', adminLogin)

export default router
