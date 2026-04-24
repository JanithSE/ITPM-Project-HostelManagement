import Booking from '../models/Booking.js'
import Hostel from '../models/Hostel.js'
import Room from '../models/RoomSchema.js'
import User from '../models/User.js'
import { listSharingRoomSummaries, searchSharingRoommatesByAcademic } from './roommateSearchService.js'

const ACTION_INTENT_RE = /\b(create|submit|approve|cancel|delete|update|edit|pay|book)\b/i
const INJECTION_RE = /(ignore previous|system prompt|developer message|reveal prompt|jailbreak|bypass)/i
const DOC_NAME_MAP = {
  nic: 'NIC',
  studentId: 'Student ID',
  medicalReport: 'Medical Report',
  policeReport: 'Police Report',
  guardianLetter: 'Parent/Guardian Letter',
  recommendationLetter: 'Recommendation Letter',
}

function summarizeBooking(booking) {
  if (!booking) return null
  const missingDocs = Array.isArray(booking.missingDocuments)
    ? booking.missingDocuments.map((k) => DOC_NAME_MAP[k] || k)
    : []
  return {
    id: String(booking._id),
    status: String(booking.status || 'unknown'),
    hostelName: booking.hostel?.name || 'Unknown hostel',
    roomNumber: String(booking.roomNumber || 'N/A'),
    fromDate: booking.fromDate || null,
    toDate: booking.toDate || null,
    rejectionReason: String(booking.rejectionReason || ''),
    missingDocuments: missingDocs,
  }
}

export async function buildBookingContext(userId) {
  const bookings = await Booking.find({ student: userId })
    .populate('hostel', 'name location pricePerBed')
    .sort({ createdAt: -1 })
    .limit(3)

  const latestBooking = bookings[0] || null
  let roomMeta = null
  if (latestBooking?.hostel && latestBooking?.roomNumber) {
    roomMeta = await Room.findOne({
      hostel: latestBooking.hostel._id,
      roomNumber: String(latestBooking.roomNumber),
    }).select('roomType acType hasBalcony hasAttachedBath hasKitchen capacity')
  }

  let hostelMeta = null
  if (latestBooking?.hostel?._id) {
    hostelMeta = await Hostel.findById(latestBooking.hostel._id).select('name location pricePerBed amenities')
  }

  const me = await User.findById(userId).select('academicYear academicSemester')

  return {
    latestBooking: summarizeBooking(latestBooking),
    recentBookings: bookings.map((b) => summarizeBooking(b)),
    myAcademic: {
      year: me?.academicYear != null ? me.academicYear : null,
      semester: me?.academicSemester != null ? me.academicSemester : null,
    },
    roomMeta: roomMeta
      ? {
          roomType: roomMeta.roomType || null,
          acType: roomMeta.acType || null,
          hasBalcony: Boolean(roomMeta.hasBalcony),
          hasAttachedBath: Boolean(roomMeta.hasAttachedBath),
          hasKitchen: Boolean(roomMeta.hasKitchen),
          capacity: Number(roomMeta.capacity || 0),
        }
      : null,
    hostelMeta: hostelMeta
      ? {
          name: hostelMeta.name || '',
          location: hostelMeta.location || '',
          pricePerBed: Number(hostelMeta.pricePerBed || 0),
          amenities: Array.isArray(hostelMeta.amenities) ? hostelMeta.amenities.slice(0, 8) : [],
        }
      : null,
  }
}

function buildRuleReply(intent, context) {
  const latest = context.latestBooking
  if (intent === 'booking_status') {
    if (!latest) {
      return {
        reply: 'You do not have any booking records yet. Open the booking section, choose an available room, and submit your documents to create a request.',
        confidence: 0.98,
      }
    }
    const stay = latest.fromDate
      ? ` Stay: ${new Date(latest.fromDate).toLocaleDateString()} to ${latest.toDate ? new Date(latest.toDate).toLocaleDateString() : new Date(latest.fromDate).toLocaleDateString()}.`
      : ''
    return {
      reply: `Your latest booking is ${latest.status} for ${latest.hostelName}, room ${latest.roomNumber}.${stay}`,
      confidence: 0.98,
    }
  }

  if (intent === 'document_help') {
    if (latest?.status === 'rejected' && latest.missingDocuments?.length) {
      return {
        reply: `Your booking was rejected because some documents need correction: ${latest.missingDocuments.join(', ')}. Re-upload those files from "Your bookings" using "Re-upload & Resubmit".`,
        confidence: 0.98,
      }
    }
    return {
      reply: 'Required booking documents are NIC, Student ID, Medical Report, Police Report, and Parent/Guardian Letter. Recommendation Letter is optional.',
      confidence: 0.95,
    }
  }

  if (intent === 'payment_help') {
    if (latest?.status === 'confirmed') {
      return {
        reply: 'Your booking is confirmed. Use "Pay Now" in your booking card to submit your monthly payment proof.',
        confidence: 0.94,
      }
    }
    return {
      reply: 'Payment proof is available after a booking becomes confirmed. Once approved, use the "Pay Now" button in your booking card.',
      confidence: 0.88,
    }
  }

  if (intent === 'next_steps') {
    if (!latest) {
      return {
        reply: 'Next step: pick an available room, fill the booking form, and upload all required documents.',
        confidence: 0.91,
      }
    }
    if (latest.status === 'pending') {
      return {
        reply: 'Your request is pending review. Keep your document originals ready and check this page for updates.',
        confidence: 0.93,
      }
    }
    if (latest.status === 'rejected') {
      return {
        reply: 'Next step: re-upload the rejected documents, then resubmit your booking from the same room card.',
        confidence: 0.95,
      }
    }
    if (latest.status === 'confirmed') {
      return {
        reply: 'Next step: complete payment proof submission and use Late Pass/maintenance features from your dashboard as needed.',
        confidence: 0.92,
      }
    }
  }

  return { reply: '', confidence: 0.2 }
}

export function detectIntent(message) {
  const text = String(message || '').toLowerCase()
  if (!text.trim()) return 'unknown'
  if (/\b(status|approved|confirmed|rejected|pending|booking)\b/.test(text)) return 'booking_status'
  if (/\b(document|nic|student id|medical|police|guardian|letter|upload|re-upload)\b/.test(text)) return 'document_help'
  if (/\b(pay|payment|proof|rent|monthly)\b/.test(text)) return 'payment_help'
  if (/\b(next|what should i do|how to proceed|step)\b/.test(text)) return 'next_steps'
  if (/\b(price|cost|fee|amount)\b/.test(text)) return 'pricing'
  if (/\b(hostel|room|ac|balcony|kitchen|availability)\b/.test(text)) return 'room_help'
  return 'unknown'
}

export function enforceMessagePolicy(message) {
  const text = String(message || '').trim()
  if (!text) return { ok: false, error: 'Message is required' }
  if (text.length > 800) return { ok: false, error: 'Message is too long. Keep it under 800 characters.' }
  if (ACTION_INTENT_RE.test(text)) {
    return {
      ok: true,
      warning:
        'I can guide you, but I cannot create or change bookings directly. Please use the booking form buttons to perform actions.',
      restrictedAction: true,
    }
  }
  if (INJECTION_RE.test(text)) {
    return {
      ok: true,
      warning: 'I can only help with booking-related guidance and cannot follow unsafe prompt instructions.',
      flaggedInjection: true,
    }
  }
  return { ok: true }
}

export function redactSensitiveContent(text) {
  return String(text || '')
    .replace(/\b\d{12,19}\b/g, '[redacted-number]')
    .replace(/\b[A-Z]{5,}\d{2,}[A-Z0-9]*\b/g, '[redacted-id]')
    .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[redacted-email]')
}

export function resolveRulesResponse(message, context) {
  const intent = detectIntent(message)
  if (intent === 'pricing') {
    if (context.hostelMeta?.pricePerBed) {
      return {
        reply: `Current price per bed for your latest hostel (${context.hostelMeta.name}) is Rs.${Number(context.hostelMeta.pricePerBed).toLocaleString()}.`,
        source: 'rules',
        intent,
        confidence: 0.96,
      }
    }
    return {
      reply: 'Pricing depends on the hostel and room type. Select a hostel/room card to see current per-bed price.',
      source: 'rules',
      intent,
      confidence: 0.84,
    }
  }

  if (intent === 'room_help') {
    if (context.roomMeta) {
      const features = []
      if (context.roomMeta.acType) features.push(context.roomMeta.acType.toUpperCase())
      if (context.roomMeta.hasBalcony) features.push('balcony')
      if (context.roomMeta.hasAttachedBath) features.push('attached bath')
      if (context.roomMeta.hasKitchen) features.push('kitchen')
      return {
        reply: `Your latest room setup: ${context.roomMeta.roomType || 'room'}${features.length ? ` with ${features.join(', ')}` : ''}.`,
        source: 'rules',
        intent,
        confidence: 0.86,
      }
    }
    return {
      reply: 'To check room features and availability, use filters in the booking page (room type, A/C, balcony, attached bath, and kitchen).',
      source: 'rules',
      intent,
      confidence: 0.8,
    }
  }

  const response = buildRuleReply(intent, context)
  return {
    reply: response.reply,
    source: 'rules',
    intent,
    confidence: response.confidence,
  }
}

export function parseAcademicFromMessage(msg) {
  const t = String(msg || '').toLowerCase()
  let year = null
  let semester = null
  if (/\b(1|one|first|1st)\s*(st\s+)?(year|yr)\b|year\s*[:=]?\s*1|\by1\b|year-?1|1\s*(st\s+)?year\b|first(\s+)?year|undergraduate\s+1/.test(t)) {
    year = 1
  } else if (/\b(2|two|second|2nd)\s*(nd\s+)?(year|yr)\b|year\s*[:=]?\s*2|\by2\b|year-?2|2\s*(nd\s+)?year|second(\s+)?year\b/.test(t)) {
    year = 2
  } else if (/\b(3|third|3rd)\s*(rd\s+)?(year|yr)\b|year\s*[:=]?\s*3|\by3\b|year-?3|3\s*(rd\s+)?year|third(\s+)?year\b/.test(t)) {
    year = 3
  } else if (/\b(4|four|fourth|4th)\s*(th\s+)?(year|yr)\b|year\s*[:=]?\s*4|\by4\b|year-?4|4\s*(th\s+)?year|fourth(\s+)?year\b/.test(t)) {
    year = 4
  }
  if (/\b(1|one|first|1st)\s*(st\s+)?(sem(ester)?|term)\b|sem(ester)?\s*1|\bs1\b|sem-?1|1\s*sem/.test(t)) {
    semester = 1
  } else if (/\b(2|two|second|2nd)\s*(nd\s+)?(sem(ester)?|term)\b|sem(ester)?\s*2|\bs2\b|sem-?2|2\s*sem|second(\s+)?sem(ester)?\b/.test(t)) {
    semester = 2
  }
  return {
    year,
    semester,
    yearOnly: year != null && semester == null,
    parsed: year != null || semester != null,
  }
}

export function isRoommatePreferenceMessage(msg) {
  const t = String(msg || '').toLowerCase()
  if (!t.trim()) return false
  const p = parseAcademicFromMessage(msg)
  if (p.parsed && /\b(sharing|share|room|hostel|roommate|sem|semester|year|bed)\b/.test(t)) {
    return true
  }
  if (
    /\b(sharing|roommate|room mate|room-mate|double|twin)\b/.test(t) &&
    /\b(want|need|look|find|search|book|room|bed|hostel|with|for|any|where)\b/.test(t)
  ) {
    return true
  }
  if (/\b(sharing|roommate|share|double)\b/.test(t) && /\b(year|sem|semester|y[1-4]|[1-4]\s*(st|nd|rd|th))\b/.test(t)) {
    return true
  }
  return false
}

function formatSharingLines(rows) {
  if (!Array.isArray(rows) || !rows.length) return ''
  return rows.map((r) => `${r.hostelName} · Room ${r.roomNumber}`).join('; ')
}

export async function tryResolveRoommatePreference(userId, userMessage) {
  if (!isRoommatePreferenceMessage(userMessage)) return null

  const privacy = String(process.env.CHAT_ROOMMATE_DETAIL || 'names').toLowerCase() === 'counts' ? 'counts' : 'names'
  const p = parseAcademicFromMessage(userMessage)
  const sharingSnip = await listSharingRoomSummaries(10)
  const listText = formatSharingLines(sharingSnip)

  if (!p.parsed) {
    return {
      reply: `I can help you pick a sharing room and match a study year/semester. Please say the year and semester (for example: "Year 1 Semester 2").

Other students only appear in this search if they saved their year/semester in Edit Profile on the student dashboard.

Browse sharing rooms: open Booking and set the room type filter to Sharing. You can also consider: ${listText || 'any sharing room on the list'}.`,
      source: 'rules',
      confidence: 0.93,
      intent: 'roommate_preference',
    }
  }
  if (p.year == null && p.semester != null) {
    return {
      reply: `Please add your year of study (1–4) as well (e.g. "Year 2 Semester ${p.semester}").\n\nSharing room examples: ${listText || 'use the booking page'}.`,
      source: 'rules',
      confidence: 0.9,
      intent: 'roommate_preference',
    }
  }
  if (p.year == null) {
    return {
      reply: 'Please mention which year and semester you mean (1–4, semester 1 or 2).',
      source: 'rules',
      confidence: 0.88,
      intent: 'roommate_preference',
    }
  }

  if (p.semester == null) {
    const { matches, allSharing } = await searchSharingRoommatesByAcademic({
      currentUserId: userId,
      academicYear: p.year,
      yearOnly: true,
      privacy,
    })
    if (matches.length) {
      const parts = matches.map((m) => {
        if (privacy === 'counts' || !m.students) {
          return `• ${m.hostelName}, Room ${m.roomNumber} — ${m.matchCount} active roommate(s) in Year ${p.year} (any semester, data from profiles)`
        }
        const names = m.students
          .map((s) => `${s.name} (Y${s.year}, Sem ${s.sem})`)
          .join(', ')
        return `• ${m.hostelName}, Room ${m.roomNumber} — ${names}`
      })
      return {
        reply: `Sharing room(s) with at least one roommate in Year ${p.year} (any semester):\n${parts.join('\n')}

This uses ongoing booking data and year/semester in each student’s profile. It does not reserve a bed. Use the Booking page to request a room.`,
        source: 'rules',
        confidence: 0.95,
        intent: 'roommate_preference',
      }
    }
    return {
      reply: `No current sharing room booking in our data shows a roommate with Year ${p.year} in their profile. Ask friends to set year/semester in Edit Profile, or try another year/semester.

You can still pick a sharing room: ${listText || formatSharingLines(allSharing) || 'see Booking'}. If you want a more specific match, say the semester too (e.g. "Year ${p.year} Semester 1").`,
      source: 'rules',
      confidence: 0.9,
      intent: 'roommate_preference',
    }
  }

  const { matches, allSharing } = await searchSharingRoommatesByAcademic({
    currentUserId: userId,
    academicYear: p.year,
    academicSemester: p.semester,
    yearOnly: false,
    privacy,
  })
  if (matches.length) {
    const parts = matches.map((m) => {
      if (privacy === 'counts' || !m.students) {
        return `• ${m.hostelName}, Room ${m.roomNumber} — ${m.matchCount} match(es) (Year ${p.year} · Sem ${p.semester})`
      }
      const names = m.students
        .map((s) => `${s.name} (Y${s.year}, Sem ${s.sem})`)
        .join(', ')
      return `• ${m.hostelName}, Room ${m.roomNumber} — ${names}`
    })
    return {
      reply: `Sharing room(s) with a roommate in Year ${p.year} / Semester ${p.semester}:\n${parts.join('\n')}

Profile year/semester is required for others to appear here. Continue on the Booking page; this chat does not create bookings.`,
      source: 'rules',
      confidence: 0.96,
      intent: 'roommate_preference',
    }
  }
  return {
    reply: `I did not find a sharing room in our data where another active booking has Year ${p.year} / Semester ${p.semester} saved. Other students can add this under Edit Profile.

Sharing rooms you can look at for booking: ${listText || formatSharingLines(allSharing) || 'open Booking and filter to Sharing'}. Tell me a different year/semester, or use filters on the booking page to choose a room.`,
    source: 'rules',
    confidence: 0.92,
    intent: 'roommate_preference',
  }
}
