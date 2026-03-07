import express from 'express'
import { studentSignup, studentLogin, adminLogin } from '../controllers/authController.js'

const router = express.Router()

router.post('/student-signup', studentSignup)
router.post('/student-login', studentLogin)
router.post('/admin-login', adminLogin)

export default router
