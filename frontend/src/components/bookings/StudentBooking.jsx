import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { bookingApi, roomApi } from '../../shared/api/client'
import BookingChatWidget from './BookingChatWidget'

function formatRoomLabel(room) {
  const rn = String(room.roomNumber || '').trim()
  if (/^[A-Za-z]/.test(rn)) return rn.toUpperCase()
  const block = String(room.block || 'A').toUpperCase()
  return `${block}${rn}`
}

function getBlock(room) {
  const rn = String(room.roomNumber || '').trim()
  const letter = rn.match(/^[A-Za-z]/)?.[0]
  if (letter) return letter.toUpperCase()
  const n = Number(rn.replace(/\D+/g, ''))
  if (Number.isFinite(n) && n > 0) {
    const blocks = ['A', 'B', 'C']
    return blocks[(n - 1) % 3]
  }
  const hostelName = String(room.hostel?.name || '')
  return hostelName.match(/[A-Za-z]/)?.[0]?.toUpperCase() || 'A'
}

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function getStudentEmailFromSession() {
  const direct = localStorage.getItem('studentEmail')
  if (direct) return direct
  try {
    const profile = JSON.parse(localStorage.getItem('studentProfile') || '{}')
    return profile?.email || ''
  } catch {
    return ''
  }
}

const INSTITUTE_OPTIONS = ['SLIIT Malabe', 'SLIIT Kandy', 'Northern Uni']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LETTERS_SPACES_RE = /^[A-Za-z\s]+$/
const MIN_ADDRESS_LEN = 10
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

const FILE_LABELS = {
  nic: 'NIC',
  studentId: 'Student ID',
  medicalReport: 'Medical Report',
  policeReport: 'Police Report',
  guardianLetter: 'Parent/Guardian Letter',
  recommendationLetter: 'Recommendation Letter',
}

const MISSING_DOC_LABELS = {
  nic: 'NIC',
  studentId: 'Student ID',
  medicalReport: 'Medical Report',
  policeReport: 'Police Report',
  guardianLetter: 'Parent/Guardian Letter',
  recommendationLetter: 'Recommendation Letter',
}
const REQUIRED_DOC_KEYS = ['nic', 'studentId', 'medicalReport', 'policeReport', 'guardianLetter']
const ALL_DOC_FIELDS = [
  ['nic', 'NIC (required)'],
  ['studentId', 'Student ID (required)'],
  ['medicalReport', 'Medical Report (required)'],
  ['policeReport', 'Police Report (required)'],
  ['guardianLetter', 'Parent/Guardian Letter (required)'],
  ['recommendationLetter', 'Recommendation Letter (optional)'],
]

function todayYmd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Latest date of birth so the person is at least `minAge` years old (local calendar). */
function maxDobForMinAge(minAge = 18) {
  const d = new Date()
  d.setFullYear(d.getFullYear() - minAge)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function onlyLettersSpaces(value) {
  return value.replace(/[^A-Za-z\s]/g, '')
}

function onlyDigits(value, maxLen = 10) {
  return value.replace(/\D/g, '').slice(0, maxLen)
}

function ageFromDobYmd(ymd) {
  if (!ymd) return null
  const born = new Date(`${ymd}T12:00:00`)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const m = now.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1
  return age
}

function validateUploadedFile(file, required) {
  if (!file) return required ? 'is required' : ''
  if (file.size > MAX_FILE_BYTES) return 'must be 5 MB or smaller'
  const t = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  const extOk = /\.(pdf|jpe?g|png|webp)$/.test(name)
  const typeOk = !t || ALLOWED_FILE_TYPES.has(t)
  if (!typeOk && !extOk) return 'must be PDF or image (JPG, PNG, WebP)'
  return ''
}

function toUiRooms(details) {
  return (Array.isArray(details) ? details : []).map((r) => {
    const roomNum = Number(String(r.roomNumber || '').replace(/\D+/g, ''))
    const seed = Number.isFinite(roomNum) && roomNum > 0 ? roomNum : 1
    const capacity = Array.isArray(r.beds) ? r.beds.length : 0
    const occupied = Array.isArray(r.beds)
      ? r.beds.filter((b) => String(b.status).toLowerCase() === 'occupied').length
      : 0
    const generatedBalcony = seed % 2 === 0
    const generatedBath = seed % 3 !== 0
    const generatedKitchen = seed % 5 === 0
    const generatedRoomType = capacity <= 1 ? 'single' : seed % 4 === 0 ? 'single' : 'sharing'
    const generatedAcType = seed % 2 === 0 ? 'ac' : 'non-ac'

    return {
      ...r,
      block: r.block || getBlock(r),
      roomType: r.roomType || generatedRoomType,
      acType: r.acType || generatedAcType,
      hasBalcony: r.hasBalcony != null ? Boolean(r.hasBalcony) : generatedBalcony,
      hasAttachedBath: r.hasAttachedBath != null ? Boolean(r.hasAttachedBath) : generatedBath,
      hasKitchen: r.hasKitchen != null ? Boolean(r.hasKitchen) : generatedKitchen,
      capacity,
      occupied,
      available: occupied < capacity,
      status: occupied < capacity ? 'Available' : 'Full',
    }
  })
}

export default function StudentBooking() {
  const location = useLocation()
  const navigate = useNavigate()
  const [hostelScopeId, setHostelScopeId] = useState('')

  const [rooms, setRooms] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState('')
  const [error, setError] = useState('')
  const [selectedRoom, setSelectedRoom] = useState(null)

  const [blockFilter, setBlockFilter] = useState('all')
  const [capacityFilter, setCapacityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('Available')
  const [roomTypeFilter, setRoomTypeFilter] = useState('all')
  const [acTypeFilter, setAcTypeFilter] = useState('all')
  const [balconyFilter, setBalconyFilter] = useState('all')
  const [bathFilter, setBathFilter] = useState('all')
  const [kitchenFilter, setKitchenFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const roomListRef = useRef(null)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [note, setNote] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [form, setForm] = useState({
    studentName: localStorage.getItem('studentName') || '',
    email: getStudentEmailFromSession(),
    contactNumber: '',
    address: '',
    gender: 'male',
    dateOfBirth: '',
    instituteName: '',
    courseProgram: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    occupantsCount: '1',
    specialRequests: '',
  })
  const [files, setFiles] = useState({
    nic: null,
    studentId: null,
    medicalReport: null,
    policeReport: null,
    guardianLetter: null,
    recommendationLetter: null,
  })
  const [previewUrls, setPreviewUrls] = useState({})
  const [reuploadDocKeys, setReuploadDocKeys] = useState([])
  const [reuploadSourceBookingId, setReuploadSourceBookingId] = useState('')

  const studentName = localStorage.getItem('studentName') || 'Current Student'

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const details = await roomApi.listDetails({ statusesToCount: 'pending,confirmed' })
      setRooms(toUiRooms(details))
    } catch (e) {
      const msg = e.message || 'Failed to load rooms'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMyBookings = useCallback(async () => {
    try {
      setLoadingBookings(true)
      const data = await bookingApi.list()
      setMyBookings(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error(e.message || 'Failed to load your bookings')
    } finally {
      setLoadingBookings(false)
    }
  }, [])

  useEffect(() => {
    loadRooms()
    loadMyBookings()
  }, [loadRooms, loadMyBookings])

  useEffect(() => {
    let id = location.state?.hostelId != null ? String(location.state.hostelId) : ''
    const nameFromState = typeof location.state?.hostelName === 'string' ? location.state.hostelName.trim() : ''
    if (!id && nameFromState && rooms.length) {
      const n = nameFromState.toLowerCase()
      const match = rooms.find((r) => String(r.hostel?.name || '').toLowerCase() === n)
      if (match?.hostel?._id) id = String(match.hostel._id)
    }
    setHostelScopeId(id)
  }, [location.key, location.state?.hostelId, location.state?.hostelName, rooms])

  useEffect(() => {
    const next = {}
    Object.entries(files).forEach(([k, f]) => {
      if (f) next[k] = URL.createObjectURL(f)
    })
    setPreviewUrls(next)
    return () => {
      Object.values(next).forEach((u) => URL.revokeObjectURL(u))
    }
  }, [files])

  const blocks = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.block))).sort(),
    [rooms],
  )

  const capacities = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.capacity))).sort((a, b) => a - b),
    [rooms],
  )

  const categoryCards = useMemo(() => {
    const defs = [
      { id: 'single', label: 'Single rooms', test: (r) => r.roomType === 'single' },
      { id: 'sharing', label: 'Sharing rooms', test: (r) => r.roomType === 'sharing' },
      { id: 'ac', label: 'A/C rooms', test: (r) => r.acType === 'ac' },
      { id: 'non-ac', label: 'Non A/C rooms', test: (r) => r.acType === 'non-ac' },
      { id: 'balcony', label: 'Balcony rooms', test: (r) => r.hasBalcony },
      { id: 'bath', label: 'Attached bath', test: (r) => r.hasAttachedBath },
      { id: 'kitchen', label: 'Kitchen facility', test: (r) => r.hasKitchen },
    ]

    return defs.map((d) => {
      const matched = rooms.filter(d.test)
      const available = matched.filter((r) => r.available).length
      return { ...d, total: matched.length, available }
    })
  }, [rooms])

  const scopedHostelName = useMemo(() => {
    if (typeof location.state?.hostelName === 'string' && location.state.hostelName.trim()) {
      return location.state.hostelName.trim()
    }
    const match = rooms.find((r) => String(r.hostel?._id) === hostelScopeId)
    return match?.hostel?.name || ''
  }, [location.state?.hostelName, rooms, hostelScopeId])

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rooms.filter((r) => {
      if (hostelScopeId && String(r.hostel?._id) !== hostelScopeId) return false
      if (blockFilter !== 'all' && r.block !== blockFilter) return false
      if (capacityFilter !== 'all' && String(r.capacity) !== capacityFilter) return false
      if (statusFilter === 'Available' && !r.available) return false
      if (statusFilter === 'Full' && r.available) return false
      if (roomTypeFilter !== 'all' && r.roomType !== roomTypeFilter) return false
      if (acTypeFilter !== 'all' && r.acType !== acTypeFilter) return false
      if (balconyFilter === 'yes' && !r.hasBalcony) return false
      if (balconyFilter === 'no' && r.hasBalcony) return false
      if (bathFilter === 'yes' && !r.hasAttachedBath) return false
      if (bathFilter === 'no' && r.hasAttachedBath) return false
      if (kitchenFilter === 'yes' && !r.hasKitchen) return false
      if (kitchenFilter === 'no' && r.hasKitchen) return false
      if (q) {
        const label = formatRoomLabel(r).toLowerCase()
        const hostel = String(r.hostel?.name || '').toLowerCase()
        if (!label.includes(q) && !hostel.includes(q)) return false
      }
      return true
    })
  }, [rooms, hostelScopeId, blockFilter, capacityFilter, statusFilter, roomTypeFilter, acTypeFilter, balconyFilter, bathFilter, kitchenFilter, search])

  const roomStats = useMemo(() => {
    const total = filteredRooms.length
    const available = filteredRooms.filter((r) => r.available).length
    const full = Math.max(0, total - available)
    return { total, available, full }
  }, [filteredRooms])

  const activeBooking = useMemo(
    () => myBookings.find((b) => b.status === 'pending' || b.status === 'confirmed'),
    [myBookings],
  )

  const hasConfirmedBooking = useMemo(
    () => myBookings.some((b) => String(b.status || '').toLowerCase() === 'confirmed' || String(b.status || '').toLowerCase() === 'approved'),
    [myBookings],
  )

  const visibleBookings = useMemo(() => {
    if (!hasConfirmedBooking) return myBookings
    return myBookings.filter((b) => {
      const s = String(b.status || '').toLowerCase()
      return s === 'confirmed' || s === 'approved'
    })
  }, [myBookings, hasConfirmedBooking])

  const visibleDocFields = useMemo(() => {
    if (!reuploadDocKeys.length) return ALL_DOC_FIELDS
    return ALL_DOC_FIELDS.filter(([key]) => reuploadDocKeys.includes(key))
  }, [reuploadDocKeys])

  function validateBookingForm() {
    const requiredText = [
      ['studentName', 'Student Name'],
      ['email', 'Email'],
      ['contactNumber', 'Contact Number'],
      ['address', 'Address'],
      ['dateOfBirth', 'Date of Birth'],
      ['instituteName', 'University/Institute'],
      ['courseProgram', 'Course/Program'],
      ['emergencyContactName', 'Emergency Contact Name'],
      ['emergencyContactNumber', 'Emergency Contact Number'],
    ]
    for (const [k, label] of requiredText) {
      if (!String(form[k] || '').trim()) return `${label} is required`
    }

    const name = String(form.studentName || '').trim()
    if (!LETTERS_SPACES_RE.test(name) || name.length < 2) {
      return 'Student name must contain only letters and spaces (at least 2 characters)'
    }

    const email = String(form.email || '').trim()
    if (!EMAIL_RE.test(email)) return 'Enter a valid email address'

    const contact = String(form.contactNumber || '').trim()
    if (!/^\d{10}$/.test(contact)) return 'Contact number must be exactly 10 digits'

    const institute = String(form.instituteName || '').trim()
    if (!INSTITUTE_OPTIONS.includes(institute)) return 'Please select a valid university / institute'

    const course = String(form.courseProgram || '').trim()
    if (!LETTERS_SPACES_RE.test(course) || course.length < 2) {
      return 'Course / Program must contain only letters and spaces (at least 2 characters)'
    }

    const ecName = String(form.emergencyContactName || '').trim()
    if (!LETTERS_SPACES_RE.test(ecName) || ecName.length < 2) {
      return 'Emergency contact name must contain only letters and spaces (at least 2 characters)'
    }

    const ecPhone = String(form.emergencyContactNumber || '').trim()
    if (!/^\d{10}$/.test(ecPhone)) return 'Emergency contact number must be exactly 10 digits'

    const addr = String(form.address || '').trim()
    if (addr.length < MIN_ADDRESS_LEN) return `Address must be at least ${MIN_ADDRESS_LEN} characters`

    const genderOk = ['male', 'female', 'other'].includes(String(form.gender || '').toLowerCase())
    if (!genderOk) return 'Please select a valid gender'

    const dob = String(form.dateOfBirth || '').trim()
    const dobDate = new Date(`${dob}T12:00:00`)
    if (Number.isNaN(dobDate.getTime())) return 'Date of birth is invalid'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (dobDate > today) return 'Date of birth cannot be in the future'
    const age = ageFromDobYmd(dob)
    if (age == null || age < 18) return 'You must be at least 18 years old'

    if (!fromDate || !toDate) return 'Check-in and check-out dates are required'
    const from = new Date(`${fromDate}T12:00:00`)
    const to = new Date(`${toDate}T12:00:00`)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 'Stay dates are invalid'
    const todayStay = new Date(`${todayYmd()}T12:00:00`)
    if (from < todayStay) return 'Check-in date cannot be before today'
    if (to < from) return 'Check-out must be on or after check-in'

    const cap = Number(selectedRoom?.capacity) || 0
    const occ = Number.parseInt(String(form.occupantsCount || '1'), 10)
    if (!Number.isFinite(occ) || occ < 1) return 'Number of occupants must be at least 1'
    if (cap > 0 && occ > cap) return `This room allows at most ${cap} occupant(s)`

    const requiredFiles = reuploadDocKeys.length
      ? reuploadDocKeys.filter((k) => REQUIRED_DOC_KEYS.includes(k))
      : REQUIRED_DOC_KEYS
    for (const k of requiredFiles) {
      const err = validateUploadedFile(files[k], true)
      if (err) return `${FILE_LABELS[k] || k} ${err}`
    }
    if (!reuploadDocKeys.length && files.recommendationLetter) {
      const err = validateUploadedFile(files.recommendationLetter, false)
      if (err) return `${FILE_LABELS.recommendationLetter} ${err}`
    }

    return ''
  }

  function handleBookingFileChange(key, fileList) {
    const file = fileList?.[0] ?? null
    if (!file) {
      setFiles((p) => ({ ...p, [key]: null }))
      return
    }
    const required = key !== 'recommendationLetter'
    const err = validateUploadedFile(file, required)
    if (err) {
      toast.error(`${FILE_LABELS[key] || key} ${err}`)
      return
    }
    setFiles((p) => ({ ...p, [key]: file }))
  }

  async function handleConfirmBooking(e) {
    e.preventDefault()
    if (!selectedRoom) return
    const validationError = validateBookingForm()
    if (validationError) {
      toast.error(validationError)
      return
    }
    try {
      setSubmitting(true)
      setError('')
      const fd = new FormData()
      fd.append('hostel', selectedRoom.hostel?._id || '')
      fd.append('roomNumber', selectedRoom.roomNumber || '')
      fd.append('roomType', selectedRoom.roomType || '')
      fd.append('fromDate', fromDate)
      fd.append('toDate', toDate || fromDate)
      fd.append('note', note.trim())
      fd.append('studentName', form.studentName)
      fd.append('email', form.email)
      fd.append('contactNumber', form.contactNumber)
      fd.append('address', form.address)
      fd.append('gender', form.gender)
      fd.append('dateOfBirth', form.dateOfBirth)
      fd.append('instituteName', form.instituteName)
      fd.append('courseProgram', form.courseProgram)
      fd.append('emergencyContactName', form.emergencyContactName)
      fd.append('emergencyContactNumber', form.emergencyContactNumber)
      fd.append('occupantsCount', String(form.occupantsCount || '1'))
      fd.append('specialRequests', form.specialRequests || '')
      if (reuploadSourceBookingId) fd.append('previousBookingId', reuploadSourceBookingId)
      if (files.nic) fd.append('nic', files.nic)
      if (files.studentId) fd.append('studentId', files.studentId)
      if (files.medicalReport) fd.append('medicalReport', files.medicalReport)
      if (files.policeReport) fd.append('policeReport', files.policeReport)
      if (files.guardianLetter) fd.append('guardianLetter', files.guardianLetter)
      if (files.recommendationLetter) fd.append('recommendationLetter', files.recommendationLetter)

      await bookingApi.createDetailed(fd)
      toast.success('Booking request sent. A warden will review it.')
      setSelectedRoom(null)
      setFromDate('')
      setToDate('')
      setNote('')
      setShowSummary(false)
      setReuploadDocKeys([])
      setReuploadSourceBookingId('')
      setFiles({
        nic: null,
        studentId: null,
        medicalReport: null,
        policeReport: null,
        guardianLetter: null,
        recommendationLetter: null,
      })
      await loadRooms()
      await loadMyBookings()
    } catch (e2) {
      const msg = e2.message || 'Failed to create booking'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelBooking(id) {
    try {
      setCancellingId(id)
      await bookingApi.update(id, { status: 'cancelled' })
      toast.success('Booking cancelled')
      await loadRooms()
      await loadMyBookings()
    } catch (e) {
      toast.error(e.message || 'Could not cancel booking')
    } finally {
      setCancellingId('')
    }
  }

  function handleReupload(booking) {
    const room = rooms.find(
      (r) =>
        String(r.hostel?._id) === String(booking.hostel?._id) &&
        String(r.roomNumber) === String(booking.roomNumber),
    )
    if (!room) {
      toast.error('Original room is not currently available. Choose another room and re-upload documents.')
      return
    }

    const keys = Array.isArray(booking.missingDocuments)
      ? booking.missingDocuments.filter((k) => Object.hasOwn(MISSING_DOC_LABELS, k))
      : []

    setForm((prev) => ({
      ...prev,
      studentName: booking.studentName || prev.studentName,
      email: booking.email || prev.email,
      contactNumber: booking.contactNumber || prev.contactNumber,
      address: booking.address || prev.address,
      gender: booking.gender || prev.gender,
      dateOfBirth: booking.dateOfBirth ? String(booking.dateOfBirth).slice(0, 10) : prev.dateOfBirth,
      instituteName: booking.instituteName || prev.instituteName,
      courseProgram: booking.courseProgram || prev.courseProgram,
      emergencyContactName: booking.emergencyContactName || prev.emergencyContactName,
      emergencyContactNumber: booking.emergencyContactNumber || prev.emergencyContactNumber,
      occupantsCount: String(booking.occupantsCount || prev.occupantsCount || '1'),
      specialRequests: booking.specialRequests || prev.specialRequests,
    }))
    setFromDate(booking.fromDate ? String(booking.fromDate).slice(0, 10) : '')
    setToDate(booking.toDate ? String(booking.toDate).slice(0, 10) : '')
    setNote('')
    setReuploadDocKeys(keys.length ? keys : REQUIRED_DOC_KEYS)
    setReuploadSourceBookingId(booking._id || '')
    setFiles({
      nic: null,
      studentId: null,
      medicalReport: null,
      policeReport: null,
      guardianLetter: null,
      recommendationLetter: null,
    })
    openModal(room, { skipReuploadReset: true })
  }

  function openModal(room, options = {}) {
    if (activeBooking) {
      toast.error('You already have an active booking. Cancel it first to request another room.')
      return
    }
    if (!options.skipReuploadReset) {
      setReuploadDocKeys([])
      setReuploadSourceBookingId('')
    }
    setSelectedRoom(room)
    setShowSummary(false)
    const cap = Math.max(1, Number(room.capacity) || 1)
    setForm((prev) => {
      let occ = Number.parseInt(String(prev.occupantsCount || '1'), 10)
      if (!Number.isFinite(occ) || occ < 1) occ = 1
      if (occ > cap) occ = cap
      const inst = INSTITUTE_OPTIONS.includes(prev.instituteName) ? prev.instituteName : ''
      return {
        ...prev,
        studentName: prev.studentName || localStorage.getItem('studentName') || '',
        email: prev.email || getStudentEmailFromSession(),
        occupantsCount: String(occ),
        instituteName: inst,
      }
    })
  }

  function applyCategoryFilter(categoryId) {
    setSelectedCategory(categoryId)
    setStatusFilter('All')
    if (categoryId === 'single' || categoryId === 'sharing') {
      setRoomTypeFilter(categoryId)
      setAcTypeFilter('all')
      setBalconyFilter('all')
      setBathFilter('all')
      setKitchenFilter('all')
    } else if (categoryId === 'ac' || categoryId === 'non-ac') {
      setAcTypeFilter(categoryId)
      setRoomTypeFilter('all')
      setBalconyFilter('all')
      setBathFilter('all')
      setKitchenFilter('all')
    } else if (categoryId === 'balcony') {
      setBalconyFilter('yes')
      setRoomTypeFilter('all')
      setAcTypeFilter('all')
      setBathFilter('all')
      setKitchenFilter('all')
    } else if (categoryId === 'bath') {
      setBathFilter('yes')
      setRoomTypeFilter('all')
      setAcTypeFilter('all')
      setBalconyFilter('all')
      setKitchenFilter('all')
    } else if (categoryId === 'kitchen') {
      setKitchenFilter('yes')
      setRoomTypeFilter('all')
      setAcTypeFilter('all')
      setBalconyFilter('all')
      setBathFilter('all')
    }

    requestAnimationFrame(() => {
      roomListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-blue-50/60 p-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/70">
        <div className="mb-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="page-title mb-1">Student Room Booking</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">Browse rooms, submit request documents, and track approvals in one place.</p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  loadRooms()
                  loadMyBookings()
                }}
                className="btn-table-secondary shrink-0 self-start"
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white/90 p-2 dark:border-slate-700 dark:bg-slate-900/90">
              <div className="min-w-[100px] rounded-lg border border-slate-200/80 px-2 py-2 text-center dark:border-slate-700">
                <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-200 bg-blue-50 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">📅</div>
                <p className="text-xl font-bold leading-none text-slate-900 dark:text-slate-100">{roomStats.total}</p>
                <p className="mt-1 text-[10px] font-semibold leading-tight text-slate-500 dark:text-slate-400">Rooms in view</p>
              </div>
              <div className="min-w-[100px] rounded-lg border border-slate-200/80 px-2 py-2 text-center dark:border-slate-700">
                <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-200 bg-emerald-50 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">✓</div>
                <p className="text-xl font-bold leading-none text-slate-900 dark:text-slate-100">{roomStats.available}</p>
                <p className="mt-1 text-[10px] font-semibold leading-tight text-slate-500 dark:text-slate-400">Available now</p>
              </div>
              <div className="min-w-[100px] rounded-lg border border-slate-200/80 px-2 py-2 text-center dark:border-slate-700">
                <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-rose-200 bg-rose-50 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">✕</div>
                <p className="text-xl font-bold leading-none text-slate-900 dark:text-slate-100">{roomStats.full}</p>
                <p className="mt-1 text-[10px] font-semibold leading-tight text-slate-500 dark:text-slate-400">Currently full</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <p className="auth-error" role="alert">{error}</p>}

      <BookingChatWidget />

      {hostelScopeId ? (
        <div className="mb-6 flex flex-col gap-2 rounded-xl border border-primary-200 bg-primary-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-primary-900/50 dark:bg-primary-950/30">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Showing rooms for{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{scopedHostelName || 'this hostel'}</span>
          </p>
          <button
            type="button"
            onClick={() => navigate('/student/booking', { replace: true })}
            className="btn-table-secondary shrink-0 self-start sm:self-auto"
          >
            Show all hostels
          </button>
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Your bookings
        </h2>
        {loadingBookings ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading…</p>
        ) : visibleBookings.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No bookings yet. Choose a room below.</p>
        ) : (
          <ul className="space-y-3">
            {visibleBookings.map((b) => (
              <li
                key={b._id}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {b.hostel?.name || 'Hostel'} · Room {b.roomNumber || '—'}
                    {b.bedNumber != null && b.bedNumber !== '' ? ` · Bed ${b.bedNumber}` : ''}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {formatDate(b.fromDate)}
                    {b.toDate && formatDate(b.toDate) !== formatDate(b.fromDate)
                      ? ` → ${formatDate(b.toDate)}`
                      : ''}
                  </div>
                  {b.note ? (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">&quot;{b.note}&quot;</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${b.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : b.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : b.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                      }`}
                  >
                    {b.status}
                  </span>
                  {b.status === 'pending' ? (
                    <button
                      type="button"
                      disabled={cancellingId === b._id}
                      onClick={() => handleCancelBooking(b._id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      {cancellingId === b._id ? 'Cancelling…' : 'Cancel request'}
                    </button>
                  ) : null}
                  {String(b.status || '').toLowerCase() === 'confirmed' || String(b.status || '').toLowerCase() === 'approved' ? (
                    <div className="flex gap-2">
                      <Link
                        to="/student/payments/new"
                        state={{
                          studentName: b.studentName || b.student?.name || studentName,
                          roomNo: b.roomNumber,
                          roomType: String(b.roomType || '').toLowerCase(),
                          facilityType: (function () {
                            const r = rooms.find(
                              (rm) =>
                                String(rm.hostel?._id) === String(b.hostel?._id) &&
                                String(rm.roomNumber) === String(b.roomNumber)
                            )
                            return String(r?.acType || 'fan').toLowerCase()
                          })(),
                          hostelName: b.hostel?.name,
                          bookingId: b._id
                        }}
                        className="rounded-full border border-indigo-200 bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 dark:border-indigo-900/40"
                      >
                        Pay Now
                      </Link>
                      <Link
                        to="/student/latepass/new"
                        state={{
                          studentName: b.studentName || b.student?.name || studentName,
                          // Student ID might not be in the booking, but we can try to get it from profile
                          studentId: (function () {
                            try {
                              const p = JSON.parse(localStorage.getItem('studentProfile') || '{}')
                              return p?.studentId || ''
                            } catch { return '' }
                          })(),
                          roomNo: b.roomNumber,
                          hostelName: b.hostel?.name,
                        }}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-sm"
                      >
                        Late Pass
                      </Link>
                    </div>
                  ) : null}
                  {b.status === 'rejected' ? (
                    <button
                      type="button"
                      onClick={() => handleReupload(b)}
                      className="rounded-full border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-50 dark:border-primary-900/50 dark:text-primary-300 dark:hover:bg-primary-950/30"
                    >
                      Re-upload & Resubmit
                    </button>
                  ) : null}
                </div>
                {b.status === 'rejected' ? (
                  <div className="w-full rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                    <p><span className="font-semibold">Issue:</span> {b.rejectionReason || 'Document verification failed'}</p>
                    {Array.isArray(b.missingDocuments) && b.missingDocuments.length ? (
                      <p className="mt-1">
                        <span className="font-semibold">Re-upload:</span>{' '}
                        {b.missingDocuments.map((k) => MISSING_DOC_LABELS[k] || k).join(', ')}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {activeBooking && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            You can only have one active request at a time (pending or confirmed). Cancel to book a different room.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Full
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {categoryCards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => applyCategoryFilter(c.id)}
            className={`rounded-xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-sm dark:bg-slate-900 ${selectedCategory === c.id
                ? 'border-primary-400 ring-2 ring-primary-200 dark:border-primary-500 dark:ring-primary-900/50'
                : 'border-slate-200 dark:border-slate-700'
              }`}
          >
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{c.label}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {c.available} available / {c.total} total
            </p>
            <p className="mt-2 text-xs font-semibold text-primary-600 dark:text-primary-400">View category</p>
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            placeholder="Search room or hostel…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="auth-input lg:col-span-1"
            aria-label="Search rooms"
          />
          <select value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)} className="auth-input">
            <option value="all">All blocks</option>
            {blocks.map((bl) => (
              <option key={bl} value={bl}>
                Block {bl}
              </option>
            ))}
          </select>
          <select value={capacityFilter} onChange={(e) => setCapacityFilter(e.target.value)} className="auth-input">
            <option value="all">All capacities</option>
            {capacities.map((c) => (
              <option key={c} value={String(c)}>
                {c} beds
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="auth-input">
            <option value="Available">Available only</option>
            <option value="Full">Full only</option>
            <option value="All">All rooms</option>
          </select>
        </div>
        <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <select value={roomTypeFilter} onChange={(e) => setRoomTypeFilter(e.target.value)} className="auth-input">
            <option value="all">All room types</option>
            <option value="single">Single room</option>
            <option value="sharing">Sharing room</option>
          </select>
          <select value={acTypeFilter} onChange={(e) => setAcTypeFilter(e.target.value)} className="auth-input">
            <option value="all">A/C and Non A/C</option>
            <option value="ac">A/C room</option>
            <option value="non-ac">Non A/C room</option>
          </select>
          <select value={balconyFilter} onChange={(e) => setBalconyFilter(e.target.value)} className="auth-input">
            <option value="all">Balcony: all</option>
            <option value="yes">Balcony only</option>
            <option value="no">No balcony</option>
          </select>
          <select value={bathFilter} onChange={(e) => setBathFilter(e.target.value)} className="auth-input">
            <option value="all">Attached bath: all</option>
            <option value="yes">With attached bath</option>
            <option value="no">Without attached bath</option>
          </select>
          <select value={kitchenFilter} onChange={(e) => setKitchenFilter(e.target.value)} className="auth-input">
            <option value="all">Kitchen: all</option>
            <option value="yes">With kitchen</option>
            <option value="no">Without kitchen</option>
          </select>
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setRoomTypeFilter('single'); setAcTypeFilter('ac'); setBathFilter('yes') }} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            Single + A/C + Attached bath
          </button>
          <button type="button" onClick={() => { setRoomTypeFilter('sharing'); setKitchenFilter('yes') }} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            Sharing + Kitchen
          </button>
          <button type="button" onClick={() => { setBlockFilter('C'); setBalconyFilter('yes') }} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            Block C + Balcony
          </button>
        </div>
      </section>

      <section ref={roomListRef}>
        {loading ? (
          <p className="page-description">Loading rooms…</p>
        ) : filteredRooms.length === 0 ? (
          <p className="page-description">No rooms match your filters.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRooms.map((room) => (
              <article
                key={`${room.hostel?._id}-${room.roomNumber}`}
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Room {formatRoomLabel(room)}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${room.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}
                  >
                    {room.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {room.hostel?.name || 'Hostel'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">Block {room.block}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Type: {room.roomType === 'single' ? 'Single room' : 'Sharing room'} · {room.acType === 'ac' ? 'A/C' : 'Non A/C'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Occupancy: {room.occupied}/{room.capacity}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {room.hasBalcony ? <span className="hostel-amenity-tag">Balcony</span> : null}
                  {room.hasAttachedBath ? <span className="hostel-amenity-tag">Attached bath</span> : null}
                  {room.hasKitchen ? <span className="hostel-amenity-tag">Kitchen facility</span> : null}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Rs.{Number(room.hostel?.pricePerBed || 0).toLocaleString()} / bed
                </p>
                <button
                  type="button"
                  disabled={!room.available}
                  onClick={() => openModal(room)}
                  className={`mt-3 w-full rounded-full px-4 py-2 text-sm font-semibold transition ${room.available
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                >
                  {room.available ? 'Book now' : 'Full'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 py-6">
          <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {reuploadDocKeys.length ? 'Re-upload Rejected Documents' : 'Room Booking Form'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedRoom.hostel?.name || 'Hostel'} • Room {formatRoomLabel(selectedRoom)}
                </p>
              </div>
              <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${selectedRoom.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {selectedRoom.available ? 'Available' : 'Full'}
              </span>
            </div>
            <form onSubmit={handleConfirmBooking} className="max-h-[80vh] space-y-4 overflow-y-auto pr-1">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="auth-label">Student Name</label>
                  <input
                    className="auth-input"
                    value={form.studentName}
                    onChange={(e) => setForm((p) => ({ ...p, studentName: onlyLettersSpaces(e.target.value) }))}
                    placeholder="Letters and spaces only"
                    required
                  />
                </div>
                <div>
                  <label className="auth-label">Email</label>
                  <input type="email" className="auth-input" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="auth-label">Contact Number</label>
                  <input
                    className="auth-input"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    value={form.contactNumber}
                    onChange={(e) => setForm((p) => ({ ...p, contactNumber: onlyDigits(e.target.value) }))}
                    placeholder="10 digits"
                    required
                  />
                </div>
                <div>
                  <label className="auth-label">Gender</label>
                  <select className="auth-input" value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="auth-label">Date of Birth</label>
                  <input
                    className="auth-input"
                    type="date"
                    max={maxDobForMinAge(18)}
                    value={form.dateOfBirth}
                    onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">You must be at least 18 years old.</p>
                </div>
                <div>
                  <label className="auth-label">University / Institute</label>
                  <select
                    className="auth-input"
                    value={INSTITUTE_OPTIONS.includes(form.instituteName) ? form.instituteName : ''}
                    onChange={(e) => setForm((p) => ({ ...p, instituteName: e.target.value }))}
                    required
                  >
                    <option value="" disabled>
                      Select institute
                    </option>
                    {INSTITUTE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="auth-label">Course / Program</label>
                  <input
                    className="auth-input"
                    value={form.courseProgram}
                    onChange={(e) => setForm((p) => ({ ...p, courseProgram: onlyLettersSpaces(e.target.value) }))}
                    placeholder="Letters and spaces only"
                    required
                  />
                </div>
                <div>
                  <label className="auth-label">Emergency Contact Name</label>
                  <input
                    className="auth-input"
                    value={form.emergencyContactName}
                    onChange={(e) => setForm((p) => ({ ...p, emergencyContactName: onlyLettersSpaces(e.target.value) }))}
                    placeholder="Letters and spaces only"
                    required
                  />
                </div>
                <div>
                  <label className="auth-label">Emergency Contact Number</label>
                  <input
                    className="auth-input"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    value={form.emergencyContactNumber}
                    onChange={(e) => setForm((p) => ({ ...p, emergencyContactNumber: onlyDigits(e.target.value) }))}
                    placeholder="10 digits"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="auth-label">Address</label>
                  <textarea
                    className="auth-input"
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder={`At least ${MIN_ADDRESS_LEN} characters`}
                    required
                  />
                </div>
                <div>
                  <label className="auth-label">Room Number</label>
                  <input className="auth-input" readOnly value={formatRoomLabel(selectedRoom)} />
                </div>
                <div>
                  <label className="auth-label">Room Type</label>
                  <input className="auth-input" readOnly value={selectedRoom.roomType === 'single' ? 'Single Room' : 'Sharing Room'} />
                </div>
                <div>
                  <label className="auth-label">Check-in Date</label>
                  <input
                    className="auth-input"
                    type="date"
                    min={todayYmd()}
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="auth-label">Check-out Date</label>
                  <input
                    className="auth-input"
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => setToDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="auth-label">Duration (days)</label>
                  <input
                    className="auth-input"
                    readOnly
                    value={fromDate && (toDate || fromDate) ? String(Math.max(1, Math.ceil((new Date(toDate || fromDate) - new Date(fromDate)) / 86400000) + 1)) : '—'}
                  />
                </div>
                <div>
                  <label className="auth-label">Number of Occupants</label>
                  <select
                    className="auth-input"
                    value={form.occupantsCount}
                    onChange={(e) => setForm((p) => ({ ...p, occupantsCount: e.target.value }))}
                  >
                    {Array.from({ length: Math.max(1, Number(selectedRoom.capacity) || 1) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Max {Math.max(1, Number(selectedRoom.capacity) || 1)} for this room.</p>
                </div>
              </div>
              <div>
                <label className="auth-label">Special Requests</label>
                <textarea className="auth-input" rows={2} value={form.specialRequests} onChange={(e) => setForm((p) => ({ ...p, specialRequests: e.target.value }))} />
              </div>
              <div>
                <label className="auth-label">Additional Note</label>
                <textarea className="auth-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {visibleDocFields.map(([key, label]) => (
                  <div key={key}>
                    <label className="auth-label">{label}</label>
                    <input
                      className="auth-input"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => handleBookingFileChange(key, e.target.files)}
                    />
                    {files[key] ? (
                      <div className="mt-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{files[key].name}</p>
                        {String(files[key].type || '').startsWith('image/') ? (
                          <img src={previewUrls[key]} alt={`${label} preview`} className="mt-1 h-14 w-14 rounded object-cover" />
                        ) : (
                          <a href={previewUrls[key]} target="_blank" rel="noreferrer" className="text-xs text-primary-600 underline">
                            Preview file
                          </a>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              {reuploadDocKeys.length ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Only previously rejected documents are shown here. Other approved documents are reused automatically.
                </p>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/40">
                <p className="font-semibold text-slate-700 dark:text-slate-200">Booking Summary</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {form.studentName || studentName} | {selectedRoom.hostel?.name || 'Hostel'} | Room {formatRoomLabel(selectedRoom)} | {fromDate || '—'} to {toDate || fromDate || '—'}
                </p>
              </div>
              <div className="mt-2 flex gap-2">
                <button type="submit" disabled={submitting} className="btn-table-primary flex-1">
                  {submitting ? 'Submitting…' : 'Submit Booking'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoom(null)}
                  className="btn-table-secondary flex-1"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
