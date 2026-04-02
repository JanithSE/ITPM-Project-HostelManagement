import express from 'express'
import {
  listBookings,
  createBooking,
  getBookingById,
  updateBooking,
  deleteBooking,
  approveBooking,
  rejectBooking,
  reviewBookingDocument,
} from '../controllers/bookingController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { bookingDocumentsUploadMiddleware } from '../middleware/upload.js'

const router = express.Router()

router.use(authMiddleware)

// GET /api/bookings – admin: all; student: own
router.get('/', listBookings)

// POST /api/bookings – student or admin
router.post('/', requireRole('student', 'admin'), bookingDocumentsUploadMiddleware, createBooking)

// GET /api/bookings/:id
router.get('/:id', getBookingById)

// PATCH /api/bookings/:id – admin or own
router.patch('/:id', updateBooking)

// PUT /api/bookings/:id/approve – admin only
router.put('/:id/approve', requireRole('admin'), approveBooking)

// PUT /api/bookings/:id/reject – admin only
router.put('/:id/reject', requireRole('admin'), rejectBooking)

// PUT /api/bookings/:id/documents/:documentKey/review – admin only
router.put('/:id/documents/:documentKey/review', requireRole('admin'), reviewBookingDocument)

// DELETE /api/bookings/:id
router.delete('/:id', deleteBooking)

export default router
