import Booking from '../models/Booking.js'
import Room from '../models/RoomSchema.js'

function normalizeRoomNumber(roomNumber) {
  if (roomNumber === undefined || roomNumber === null) return null
  const s = String(roomNumber).trim()
  if (!s) return null
  const m = s.match(/(\d+)/)
  return m ? m[1] : s
}

/**
 * @param {object} options
 * @param {import('mongoose').Types.ObjectId} options.currentUserId
 * @param {number} options.academicYear
 * @param {number} [options.academicSemester] - if omitted, year-only match
 * @param {'names'|'counts'} options.privacy
 */
export async function searchSharingRoommatesByAcademic({
  currentUserId,
  academicYear,
  academicSemester,
  yearOnly = false,
  privacy = 'names',
}) {
  const yTarget = Number(academicYear)
  if (!Number.isInteger(yTarget) || yTarget < 1 || yTarget > 4) {
    return { matches: [], allSharing: [] }
  }

  const sharingRooms = await Room.find({ roomType: 'sharing' })
    .populate('hostel', 'name')
    .lean()

  const matches = []

  for (const room of sharingRooms) {
    const hostel = room.hostel
    if (!hostel) continue
    const roomNum = String(room.roomNumber ?? '').trim()
    if (!roomNum) continue
    const norm = normalizeRoomNumber(roomNum) || roomNum
    const roomKeyVariants = Array.from(
      new Set([roomNum, norm, String(room.roomNumber || '').trim()].filter(Boolean)),
    )

    const bookings = await Booking.find({
      hostel: hostel._id,
      roomNumber: { $in: roomKeyVariants },
      status: { $in: ['pending', 'confirmed'] },
    }).populate('student', 'name academicYear academicSemester')

    const others = bookings.filter(
      (b) => b.student && String(b.student._id) !== String(currentUserId),
    )

    const hitStudents = others.filter((b) => {
      const y = b.student?.academicYear
      const s = b.student?.academicSemester
      if (y == null) return false
      if (Number(y) !== yTarget) return false
      if (yearOnly || academicSemester == null) return true
      if (s == null) return false
      return Number(s) === Number(academicSemester)
    })

    if (hitStudents.length) {
      if (privacy === 'counts') {
        matches.push({
          hostelName: String(hostel.name || 'Hostel'),
          roomNumber: roomNum,
          matchCount: hitStudents.length,
          students: null,
        })
      } else {
        matches.push({
          hostelName: String(hostel.name || 'Hostel'),
          roomNumber: roomNum,
          matchCount: hitStudents.length,
          students: hitStudents.map((b) => ({
            name: String(b.student?.name || 'Student'),
            year: b.student?.academicYear,
            sem: b.student?.academicSemester,
          })),
        })
      }
    }
  }

  const allSharing = await listSharingRoomSummaries(14)
  return { matches, allSharing, query: { year: yTarget, semester: academicSemester, yearOnly } }
}

export async function listSharingRoomSummaries(limit = 12) {
  const sharingRooms = await Room.find({ roomType: 'sharing' })
    .populate('hostel', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
  return sharingRooms.map((r) => ({
    hostelName: r.hostel?.name || 'Hostel',
    roomNumber: String(r.roomNumber || ''),
  }))
}
