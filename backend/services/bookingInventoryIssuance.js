import Booking from '../models/Booking.js'
import IssuedItem from '../models/IssuedItem.js'
import InventoryItem from '../models/InventoryItem.js'

export async function getIssueSpecLines() {
  return InventoryItem.find({}).sort({ category: 1 })
}

/**
 * @returns {{ ok: true } | { ok: false, missing: Array<{ category: string, name: string, need: number, have: number }> }}
 */
export async function assertInventoryIssuanceAvailable() {
  const lines = await getIssueSpecLines()
  if (!lines.length) return { ok: true }

  const missing = []
  for (const row of lines) {
    const need = 1
    const have = Number(row.quantity) || 0
    if (have < need) {
      missing.push({
        category: row.category || '',
        name: row.name || row.category || 'Item',
        need,
        have,
      })
    }
  }
  if (missing.length) return { ok: false, missing }
  return { ok: true }
}

function displayStudentName(booking) {
  return String(
    booking.studentName || booking.student?.name || booking.student?.email || 'Student',
  ).trim()
}

/**
 * Create IssuedItem and decrement stock. Idempotent per booking.
 * @param {import('mongoose').Types.ObjectId|string} bookingId
 * @param {import('mongoose').Types.ObjectId|null} issuedByUserId
 */
export async function applyInventoryIssuanceForConfirmedBooking(bookingId, issuedByUserId = null) {
  const booking = await Booking.findById(bookingId)
    .populate('hostel', 'name')
    .populate('student', 'name email')
  if (!booking || booking.status !== 'confirmed') return { created: false, reason: 'not_confirmed' }

  const existing = await IssuedItem.findOne({ booking: booking._id })
  if (existing) return { created: false, reason: 'already_issued', issuedItem: existing }

  const specLines = await getIssueSpecLines()
  const issuedLines = []
  const decremented = []

  try {
    for (const row of specLines) {
      const qty = 1

      const updated = await InventoryItem.findOneAndUpdate(
        { _id: row._id, quantity: { $gte: qty } },
        { $inc: { quantity: -qty } },
        { new: true },
      )
      if (!updated) {
        throw new Error(
          `Insufficient stock for ${row.category || row.name}: need ${qty}. Re-check inventory and try again.`,
        )
      }

      decremented.push({ _id: row._id, qty })
      issuedLines.push({
        inventoryItem: row._id,
        category: row.category || '',
        name: row.name || row.category || '',
        quantity: qty,
      })
    }

    const hostelId = booking.hostel?._id || booking.hostel
    const studentId = booking.student?._id || booking.student

    const doc = await IssuedItem.create({
      booking: booking._id,
      hostel: hostelId,
      hostelName: String(booking.hostel?.name || '').trim(),
      roomNumber: String(booking.roomNumber || '').trim(),
      bedNumber: String(booking.bedNumber ?? '').trim(),
      student: studentId,
      studentName: displayStudentName(booking),
      issuedBy: issuedByUserId || null,
      items: issuedLines,
    })

    return { created: true, issuedItem: doc }
  } catch (err) {
    for (const d of decremented.reverse()) {
      await InventoryItem.findByIdAndUpdate(d._id, { $inc: { quantity: d.qty } })
    }
    throw err
  }
}
