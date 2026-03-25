import Hostel from '../models/Hostel.js'

function parseAmenities(input) {
  if (Array.isArray(input)) {
    return input.map((s) => String(s).trim()).filter(Boolean)
  }
  if (typeof input === 'string') {
    const t = input.trim()
    if (!t) return []
    try {
      const parsed = JSON.parse(t)
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim()).filter(Boolean)
      }
    } catch {
      /* comma-separated */
    }
    return t.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function buildHostelFields(body, file) {
  const amenities = parseAmenities(body.amenities)
  const payload = {
    name: String(body.name || '').trim(),
    location: String(body.location || '').trim(),
    description: String(body.description || '').trim(),
    totalRooms: Number(body.totalRooms),
    availableRooms: Number(body.availableRooms),
    pricePerBed: Number(body.pricePerBed),
    amenities,
  }
  if (file?.filename) {
    payload.imageUrl = `/uploads/hostels/${file.filename}`
  }
  return payload
}

function validateHostelPayload(p) {
  if (!p.name) return 'Hostel name is required'
  if (!p.location) return 'Location is required'
  if (!Number.isFinite(p.totalRooms)) return 'Total rooms/beds must be a number'
  if (!Number.isFinite(p.availableRooms)) return 'Available rooms/beds must be a number'
  if (!Number.isFinite(p.pricePerBed)) return 'Price per bed must be a number'
  return null
}

export const getHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find().sort({ name: 1 })
    res.json(hostels)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const createHostel = async (req, res) => {
  try {
    const data = buildHostelFields(req.body, req.file)
    const invalid = validateHostelPayload(data)
    if (invalid) return res.status(400).json({ error: invalid })
    const hostel = await Hostel.create(data)
    res.status(201).json(hostel)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getHostelById = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id)
    if (!hostel) return res.status(404).json({ error: 'Hostel not found' })
    res.json(hostel)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const updateHostel = async (req, res) => {
  try {
    const data = buildHostelFields(req.body, req.file)
    const invalid = validateHostelPayload(data)
    if (invalid) return res.status(400).json({ error: invalid })

    const update = {
      name: data.name,
      location: data.location,
      description: data.description,
      totalRooms: data.totalRooms,
      availableRooms: data.availableRooms,
      pricePerBed: data.pricePerBed,
      amenities: data.amenities,
    }
    if (req.file?.filename) {
      update.imageUrl = data.imageUrl
    }

    const hostel = await Hostel.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    })
    if (!hostel) return res.status(404).json({ error: 'Hostel not found' })
    res.json(hostel)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const deleteHostel = async (req, res) => {
  try {
    const hostel = await Hostel.findByIdAndDelete(req.params.id)
    if (!hostel) return res.status(404).json({ error: 'Hostel not found' })
    res.json({ message: 'Hostel deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
