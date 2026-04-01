import Booking from '../models/Booking.js'
import Room from '../models/RoomSchema.js'
import Notification from '../models/Notification.js'
import { sendBookingRejectedEmail, sendDocumentRejectedEmail } from '../services/emailService.js'

const DOCUMENT_KEYS = ['nic', 'studentId', 'medicalReport', 'policeReport', 'guardianLetter', 'recommendationLetter']
const REQUIRED_DOCUMENT_KEYS = ['nic', 'studentId', 'medicalReport', 'policeReport', 'guardianLetter']
const DOCUMENT_LABELS = {
  nic: 'NIC',
  studentId: 'Student ID',
  medicalReport: 'Medical Report',
  policeReport: 'Police Report',
  guardianLetter: 'Guardian Letter',
  recommendationLetter: 'Recommendation Letter',
}

function evaluateBookingStatusFromDocuments(booking) {
  const reviews = booking.documentReviews || {}
  const rejected = REQUIRED_DOCUMENT_KEYS.filter((k) => reviews?.[k]?.status === 'rejected')
  if (rejected.length) return { status: 'rejected', rejectedKeys: rejected }

  const allApproved = REQUIRED_DOCUMENT_KEYS.every((k) => reviews?.[k]?.status === 'approved')
  if (allApproved) return { status: 'confirmed', rejectedKeys: [] }

  return { status: 'pending', rejectedKeys: [] }
}

function normalizeRoomNumber(roomNumber) {
  if (roomNumber === undefined || roomNumber === null) return null
  const s = String(roomNumber).trim()
  if (!s) return null
  const m = s.match(/(\d+)/)
  return m ? m[1] : s
}

function toDateOrNull(v) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd
}

async function getRoomWithActiveBookings(hostelId, roomNumber) {
  const room = await Room.findOne({ hostel: hostelId, roomNumber })
  if (!room) return { room: null, activeBookings: [] }

  const activeBookings = await Booking.find({
    hostel: hostelId,
    roomNumber,
    status: { $in: ['pending', 'confirmed'] },
  })
  return { room, activeBookings }
}

function getAvailableBedNumber(room, activeBookings) {
  const allBeds = (room?.beds || []).map((b) => String(b.bedNumber))
  if (!allBeds.length) return null

  const occupied = new Set(
    activeBookings
      .map((b) => (b.bedNumber != null ? String(b.bedNumber) : null))
      .filter(Boolean),
  )

  return allBeds.find((bedNo) => !occupied.has(bedNo)) || null
}

export const listBookings = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { student: req.user._id }
    const bookings = await Booking.find(query)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
      .sort({ createdAt: -1 })
    res.json(bookings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const createBooking = async (req, res) => {
  try {
    const studentId = req.user.role === 'admin' ? req.body.student : req.user._id
    const hostelId = req.body?.hostel
    const roomNumber = normalizeRoomNumber(req.body?.roomNumber)
    const fromDate = toDateOrNull(req.body?.fromDate)
    const toDate = toDateOrNull(req.body?.toDate || req.body?.fromDate)

    if (!hostelId || !roomNumber || !fromDate || !toDate) {
      return res.status(400).json({ error: 'hostel, roomNumber, fromDate and toDate are required' })
    }
    if (fromDate > toDate) {
      return res.status(400).json({ error: 'toDate must be same or after fromDate' })
    }

    const files = req.files || {}
    const requiredDocs = ['nic', 'studentId', 'medicalReport', 'policeReport', 'guardianLetter']
    const previousBookingId = String(req.body?.previousBookingId || '').trim()
    let previousBooking = null
    if (previousBookingId) {
      previousBooking = await Booking.findOne({
        _id: previousBookingId,
        student: studentId,
        status: 'rejected',
      })
      if (!previousBooking) {
        return res.status(400).json({ error: 'Invalid previousBookingId for re-upload flow' })
      }
    }
    const missing = requiredDocs.filter((k) => !files[k]?.[0] && !previousBooking?.documents?.[k])
    if (missing.length) {
      return res.status(400).json({ error: `Missing required documents: ${missing.join(', ')}` })
    }

    // Prevent overlapping bookings by same student for the same date range.
    const existingByStudent = await Booking.find({
      student: studentId,
      status: { $in: ['pending', 'confirmed'] },
      fromDate: { $ne: null },
      toDate: { $ne: null },
    })
    const studentOverlap = existingByStudent.some((b) => rangesOverlap(fromDate, toDate, new Date(b.fromDate), new Date(b.toDate)))
    if (studentOverlap) return res.status(409).json({ error: 'You already have an overlapping active booking request' })

    // Prevent same room being booked for overlapping dates.
    const sameRoomActive = await Booking.find({
      hostel: hostelId,
      roomNumber,
      status: { $in: ['pending', 'confirmed'] },
      fromDate: { $ne: null },
      toDate: { $ne: null },
    })
    const roomOverlap = sameRoomActive.some((b) => rangesOverlap(fromDate, toDate, new Date(b.fromDate), new Date(b.toDate)))
    if (roomOverlap) return res.status(409).json({ error: 'This room is already booked for selected dates' })

    const { room, activeBookings } = await getRoomWithActiveBookings(hostelId, roomNumber)
    if (!room) return res.status(404).json({ error: 'Room not found' })

    const capacity = Array.isArray(room.beds) ? room.beds.length : 0
    if (activeBookings.length >= capacity) {
      return res.status(409).json({ error: 'Room Full' })
    }

    const bedNumber = getAvailableBedNumber(room, activeBookings)
    if (!bedNumber) return res.status(409).json({ error: 'Room Full' })

    const booking = await Booking.create({
      ...req.body,
      student: studentId,
      hostel: hostelId,
      roomNumber,
      bedNumber,
      status: 'pending',
      fromDate,
      toDate,
      documents: {
        nic: files.nic?.[0]
          ? `/uploads/bookings/${files.nic[0].filename}`
          : previousBooking?.documents?.nic || undefined,
        studentId: files.studentId?.[0]
          ? `/uploads/bookings/${files.studentId[0].filename}`
          : previousBooking?.documents?.studentId || undefined,
        medicalReport: files.medicalReport?.[0]
          ? `/uploads/bookings/${files.medicalReport[0].filename}`
          : previousBooking?.documents?.medicalReport || undefined,
        policeReport: files.policeReport?.[0]
          ? `/uploads/bookings/${files.policeReport[0].filename}`
          : previousBooking?.documents?.policeReport || undefined,
        guardianLetter: files.guardianLetter?.[0]
          ? `/uploads/bookings/${files.guardianLetter[0].filename}`
          : previousBooking?.documents?.guardianLetter || undefined,
        recommendationLetter: files.recommendationLetter?.[0]
          ? `/uploads/bookings/${files.recommendationLetter[0].filename}`
          : previousBooking?.documents?.recommendationLetter || undefined,
      },
      documentReviews: {
        nic: { status: 'pending' },
        studentId: { status: 'pending' },
        medicalReport: { status: 'pending' },
        policeReport: { status: 'pending' },
        guardianLetter: { status: 'pending' },
        recommendationLetter: { status: files.recommendationLetter?.[0] ? 'pending' : 'not_uploaded' },
      },
    })
    const populated = await Booking.findById(booking._id)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    const studentId = booking.student?._id || booking.student
    if (req.user.role === 'student' && studentId && !studentId.equals(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    res.json(booking)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    const studentId = booking.student?._id || booking.student
    if (req.user.role === 'student' && studentId && !studentId.equals(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (req.user.role === 'student') {
      // Students can only cancel their own booking request.
      if (req.body?.status && req.body.status !== 'cancelled') {
        return res.status(403).json({ error: 'Students can only cancel bookings' })
      }
      booking.status = 'cancelled'
    } else {
      Object.assign(booking, req.body)
    }
    await booking.save()
    const populated = await Booking.findById(booking._id)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const approveBooking = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })

    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    if (booking.status === 'confirmed') return res.json(booking)
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot approve a cancelled booking' })
    }
    if (booking.status === 'rejected') {
      return res.status(400).json({ error: 'Cannot approve a rejected booking. Ask student to resubmit.' })
    }

    const { room, activeBookings } = await getRoomWithActiveBookings(booking.hostel, booking.roomNumber)
    if (!room) return res.status(404).json({ error: 'Room not found' })

    const confirmedInRoom = activeBookings.filter((b) => b.status === 'confirmed')
    const capacity = Array.isArray(room.beds) ? room.beds.length : 0
    if (confirmedInRoom.length >= capacity) {
      return res.status(409).json({ error: 'Room Full' })
    }

    const bedTaken = confirmedInRoom.some((b) => String(b.bedNumber) === String(booking.bedNumber))
    if (bedTaken) {
      const freeBed = getAvailableBedNumber(room, confirmedInRoom)
      if (!freeBed) return res.status(409).json({ error: 'Room Full' })
      booking.bedNumber = freeBed
    }

    booking.status = 'confirmed'
    booking.rejectionReason = ''
    booking.missingDocuments = []
    booking.reviewedAt = new Date()
    booking.reviewedBy = req.user._id
    await booking.save()
    const populated = await Booking.findById(booking._id)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
    return res.json(populated)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const rejectBooking = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const booking = await Booking.findById(req.params.id)
      .populate('student', 'name email')
      .populate('hostel', 'name')
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    const rejectionReason = String(req.body?.rejectionReason || '').trim()
    const incomingMissing = Array.isArray(req.body?.missingDocuments) ? req.body.missingDocuments : []
    const missingDocuments = incomingMissing
      .map((d) => String(d || '').trim())
      .filter((d) => DOCUMENT_KEYS.includes(d))

    if (!rejectionReason) {
      return res.status(400).json({ error: 'rejectionReason is required' })
    }

    booking.status = 'rejected'
    booking.rejectionReason = rejectionReason
    booking.missingDocuments = missingDocuments
    booking.reviewedAt = new Date()
    booking.reviewedBy = req.user._id
    await booking.save()

    const studentId = booking.student?._id || booking.student
    if (studentId) {
      await Notification.create({
        user: studentId,
        type: 'booking_rejected',
        title: 'Booking needs document corrections',
        message: missingDocuments.length
          ? `Your booking was rejected. Please correct and re-upload: ${missingDocuments.join(', ')}`
          : `Your booking was rejected. Reason: ${rejectionReason}`,
        booking: booking._id,
        metadata: { rejectionReason, missingDocuments },
      })
    }

    try {
      await sendBookingRejectedEmail({
        to: booking.email || booking.student?.email || '',
        studentName: booking.studentName || booking.student?.name || '',
        hostelName: booking.hostel?.name || '',
        roomNumber: booking.roomNumber || '',
        rejectionReason,
        missingDocuments,
      })
    } catch (emailErr) {
      console.error('Booking rejection email failed:', emailErr.message)
    }

    const populated = await Booking.findById(booking._id)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
    return res.json(populated)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const reviewBookingDocument = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const bookingId = req.params.id
    const documentKey = String(req.params.documentKey || '').trim()
    const status = String(req.body?.status || '').trim().toLowerCase()
    const note = String(req.body?.note || '').trim()

    if (!DOCUMENT_KEYS.includes(documentKey)) {
      return res.status(400).json({ error: 'Invalid document key' })
    }
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' })
    }
    if (status === 'rejected' && !note) {
      return res.status(400).json({ error: 'Rejection note is required' })
    }

    const booking = await Booking.findById(bookingId)
      .populate('student', 'name email')
      .populate('hostel', 'name')
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    if (!booking.documents?.[documentKey]) {
      return res.status(400).json({ error: 'Document not uploaded for this booking' })
    }

    if (!booking.documentReviews) booking.documentReviews = {}
    booking.documentReviews[documentKey] = {
      ...(booking.documentReviews?.[documentKey] || {}),
      status,
      note: status === 'rejected' ? note : '',
      reviewedAt: new Date(),
      reviewedBy: req.user._id,
    }

    const evaluation = evaluateBookingStatusFromDocuments(booking)
    booking.status = evaluation.status
    booking.reviewedAt = new Date()
    booking.reviewedBy = req.user._id

    if (evaluation.status === 'rejected') {
      booking.missingDocuments = evaluation.rejectedKeys
      booking.rejectionReason = booking.documentReviews[evaluation.rejectedKeys[0]]?.note || 'Document corrections required'
    } else {
      booking.missingDocuments = []
      booking.rejectionReason = ''
    }

    await booking.save()

    if (status === 'rejected') {
      const documentLabel = DOCUMENT_LABELS[documentKey] || documentKey
      const studentId = booking.student?._id || booking.student
      if (studentId) {
        await Notification.create({
          user: studentId,
          type: 'booking_document_rejected',
          title: `${documentLabel} rejected`,
          message: `${documentLabel} was rejected. Reason: ${note}`,
          booking: booking._id,
          metadata: { documentKey, documentLabel, note },
        })
      }
      try {
        await sendDocumentRejectedEmail({
          to: booking.email || booking.student?.email || '',
          studentName: booking.studentName || booking.student?.name || '',
          documentName: documentLabel,
          note,
          hostelName: booking.hostel?.name || '',
          roomNumber: booking.roomNumber || '',
        })
      } catch (emailErr) {
        console.error('Document rejection email failed:', emailErr.message)
      }
    }

    const populated = await Booking.findById(booking._id)
      .populate('student', 'name email')
      .populate('hostel', 'name location')
    return res.json(populated)
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to review document' })
  }
}

export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    const studentId = booking.student?._id || booking.student
    if (req.user.role === 'student' && studentId && !studentId.equals(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    await Booking.findByIdAndDelete(req.params.id)
    res.json({ message: 'Booking deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

