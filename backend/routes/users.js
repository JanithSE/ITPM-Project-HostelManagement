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
router.use(requireRole('admin'))

// GET /api/users
router.get('/', getUsers)

// POST /api/users
router.post('/', createUser)

// GET /api/users/:id
router.get('/:id', getUserById)

// PATCH /api/users/:id
router.patch('/:id', updateUser)

// DELETE /api/users/:id
router.delete('/:id', deleteUser)

export default router
