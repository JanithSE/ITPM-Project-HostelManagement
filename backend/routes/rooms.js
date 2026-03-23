import express from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { createRoom, deleteRoom, listRoomDetails, listRooms, updateRoom } from '../controllers/roomController.js'

const router = express.Router()

router.use(authMiddleware)

// Warden/Admin can manage room definitions
router.get('/', requireRole('warden'), listRooms)
router.post('/', requireRole('warden'), createRoom)
router.patch('/:id', requireRole('warden'), updateRoom)
router.delete('/:id', requireRole('warden'), deleteRoom)

// Warden can fetch computed occupancy details
router.get('/details', requireRole('warden'), listRoomDetails)

export default router

