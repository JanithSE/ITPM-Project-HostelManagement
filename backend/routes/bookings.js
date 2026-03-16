import express from 'express'
import {
  listBookings,
  createBooking,
  getBookingById,
  updateBooking,
  deleteBooking,
} from '../controllers/bookingController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/bookings – admin: all; student: own
router.get('/', listBookings)

// POST /api/bookings – student or admin
router.post('/', createBooking)

// GET /api/bookings/:id
router.get('/:id', getBookingById)

// PATCH /api/bookings/:id – admin or own
router.patch('/:id', updateBooking)

// DELETE /api/bookings/:id
router.delete('/:id', deleteBooking)

export default router
