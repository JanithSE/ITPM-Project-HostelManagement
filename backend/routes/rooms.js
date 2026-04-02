import express from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { createRoom, deleteRoom, listRoomDetails, listRooms, updateRoom } from '../controllers/roomController.js'

const router = express.Router()

router.use(authMiddleware)

// Warden/Admin can manage room definitions
router.get('/', requireRole('warden', 'admin'), listRooms)
router.post('/', requireRole('warden', 'admin'), createRoom)
router.patch('/:id', requireRole('warden', 'admin'), updateRoom)
router.delete('/:id', requireRole('warden', 'admin'), deleteRoom)

// Student/Admin/Warden can fetch computed occupancy details
router.get('/details', requireRole('student', 'admin', 'warden'), listRoomDetails)

export default router

