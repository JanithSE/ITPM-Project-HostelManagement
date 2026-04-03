import express from 'express'
import { listIssuedItems, getIssuedItemByBookingId } from '../controllers/issuedItemsController.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/', requireRole('admin', 'warden'), listIssuedItems)
router.get('/by-booking/:bookingId', requireRole('admin', 'warden'), getIssuedItemByBookingId)

export default router
