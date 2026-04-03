import IssuedItem from '../models/IssuedItem.js'
import Hostel from '../models/Hostel.js'

function escapeRegex(s) {
  return String(s ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const listIssuedItems = async (req, res) => {
  try {
    let query = {}
    if (req.user.role === 'warden') {
      const name = String(req.user.assignedHostel || '').trim()
      if (!name) {
        return res.json([])
      }
      const hostel = await Hostel.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') })
      if (!hostel) {
        return res.json([])
      }
      query = { hostel: hostel._id }
    }

    const items = await IssuedItem.find(query)
      .populate('booking', 'status roomNumber bedNumber fromDate toDate')
      .populate('hostel', 'name location')
      .populate('student', 'name email')
      .sort({ issuedAt: -1 })
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getIssuedItemByBookingId = async (req, res) => {
  try {
    const doc = await IssuedItem.findOne({ booking: req.params.bookingId })
      .populate('booking', 'status roomNumber bedNumber fromDate toDate')
      .populate('hostel', 'name location')
      .populate('student', 'name email')
    if (!doc) return res.status(404).json({ error: 'No issuance record for this booking' })
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
