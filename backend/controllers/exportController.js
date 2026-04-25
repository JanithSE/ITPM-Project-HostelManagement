import Booking from '../models/Booking.js'
import { buildBookingsExcelBuffer } from '../utils/export/bookingExcel.js'
import { buildBookingsPdfBuffer } from '../utils/export/bookingPdf.js'

const ALLOWED_TYPES = new Set(['excel', 'pdf'])
const ALLOWED_RANGES = new Set(['day', 'week', 'month', 'custom'])
const ALLOWED_DATE_FIELDS = new Set(['createdAt', 'fromDate'])

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function getDateBounds(range, fromRaw, toRaw) {
  const now = new Date()
  if (range === 'day') {
    return { from: new Date(now.getTime() - 24 * 60 * 60 * 1000), to: now }
  }
  if (range === 'week') {
    return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now }
  }
  if (range === 'month') {
    return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now }
  }

  if (!fromRaw || !toRaw) {
    throw new Error('from and to are required for custom range')
  }

  const from = startOfDay(fromRaw)
  const to = endOfDay(toRaw)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error('Invalid from/to date')
  }
  if (from > to) {
    throw new Error('from date cannot be after to date')
  }
  return { from, to }
}

function mapBookingRow(booking) {
  return {
    bookingId: String(booking._id || '').slice(-6).toUpperCase(),
    studentName: booking.student?.name || booking.studentName || '-',
    studentEmail: booking.student?.email || booking.email || '-',
    hostel: booking.hostel?.name || '-',
    room: booking.roomNumber || '-',
    bed: booking.bedNumber || '-',
    fromDate: booking.fromDate || null,
    toDate: booking.toDate || null,
    status: booking.status || '-',
    note: String(booking.note || booking.specialRequests || '').trim(),
    createdAt: booking.createdAt || null,
  }
}

export async function exportBookings(req, res, next) {
  try {
    const type = String(req.query.type || '').toLowerCase()
    const range = String(req.query.range || '').toLowerCase()
    const dateField = String(req.query.dateField || '').trim()
    const fromRaw = req.query.from
    const toRaw = req.query.to

    if (!ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ error: 'type must be excel or pdf' })
    }
    if (!ALLOWED_RANGES.has(range)) {
      return res.status(400).json({ error: 'range must be day, week, month, or custom' })
    }
    if (!ALLOWED_DATE_FIELDS.has(dateField)) {
      return res.status(400).json({ error: 'dateField must be createdAt or fromDate' })
    }

    let bounds
    try {
      bounds = getDateBounds(range, fromRaw, toRaw)
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Invalid date range' })
    }

    const query = {
      [dateField]: { $gte: bounds.from, $lte: bounds.to },
    }

    const bookings = await Booking.find(query)
      .populate('student', 'name email')
      .populate('hostel', 'name')
      .sort({ createdAt: -1 })
      .lean()

    const rows = bookings.map(mapBookingRow)
    const fileDate = new Date().toISOString().slice(0, 10)
    const baseName = `bookings-${dateField}-${range}-${fileDate}`
    const meta = { dateField, range, from: bounds.from, to: bounds.to }

    if (type === 'excel') {
      const buffer = await buildBookingsExcelBuffer(rows, meta)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.xlsx"`)
      res.send(Buffer.from(buffer))
      return
    }

    const pdfBuffer = await buildBookingsPdfBuffer(rows, meta)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`)
    res.send(pdfBuffer)
  } catch (err) {
    next(err)
  }
}
