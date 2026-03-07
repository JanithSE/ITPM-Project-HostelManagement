import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getAllBookings,
  createBooking,
  getBookingById,
  updateBooking,
  deleteBooking,
} from '../controllers/bookingController.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/', getAllBookings)
router.post('/', createBooking)
router.get('/:id', getBookingById)
router.patch('/:id', updateBooking)
router.delete('/:id', deleteBooking)

export default router
