import express from 'express'
import {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/users
router.get('/', requireRole('admin', 'warden'), getUsers)

// POST /api/users
router.post('/', requireRole('admin'), createUser)

// GET /api/users/:id
router.get('/:id', requireRole('admin', 'warden'), getUserById)

// PATCH /api/users/:id
router.patch('/:id', requireRole('admin'), updateUser)

// DELETE /api/users/:id
router.delete('/:id', requireRole('admin'), deleteUser)

export default router
