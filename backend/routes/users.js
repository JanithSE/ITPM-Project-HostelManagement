import express from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController.js'

const router = express.Router()

router.use(authMiddleware)
router.use(requireRole('admin'))

router.get('/', getAllUsers)
router.post('/', createUser)
router.get('/:id', getUserById)
router.patch('/:id', updateUser)
router.delete('/:id', deleteUser)

export default router
