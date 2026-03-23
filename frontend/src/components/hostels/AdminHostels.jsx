import { useEffect, useMemo, useState } from 'react'
import { hostelApi } from '../../shared/api/client'

function formatPrice(n) {
  if (typeof n !== 'number') return '—'
  return `₹${n.toLocaleString('en-IN')}`
}

function amenitiesFromText(text) {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function AdminHostels() {
  const [hostels, setHostels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    location: '',
    description: '',
    totalRooms: '',
    availableRooms: '',
    pricePerBed: '',
    amenitiesText: '',
  })

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await hostelApi.listHostels()
      setHostels(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load hostels')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const selectedHostel = useMemo(() => {
    if (!selectedId) return null
    return hostels.find((h) => h._id === selectedId) || null
  }, [hostels, selectedId])

  const resetForm = () => {
    setSelectedId(null)
    setForm({
      name: '',
      location: '',
      description: '',
      totalRooms: '',
      availableRooms: '',
      pricePerBed: '',
      amenitiesText: '',
    })
  }

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleEdit = (hostel) => {
    setSelectedId(hostel._id)
    setForm({
      name: hostel.name || '',
      location: hostel.location || '',
      description: hostel.description || '',
      totalRooms: String(hostel.totalRooms ?? ''),
      availableRooms: String(hostel.availableRooms ?? ''),
      pricePerBed: String(hostel.pricePerBed ?? ''),
      amenitiesText: Array.isArray(hostel.amenities) ? hostel.amenities.join(', ') : '',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      totalRooms: Number(form.totalRooms),
      availableRooms: Number(form.availableRooms),
      pricePerBed: Number(form.pricePerBed),
      amenities: amenitiesFromText(form.amenitiesText),
    }

    try {
      if (!payload.name) throw new Error('Hostel name is required')
      if (!payload.location) throw new Error('Location is required')
      if (!Number.isFinite(payload.totalRooms)) throw new Error('Total rooms/beds must be a number')
      if (!Number.isFinite(payload.availableRooms)) throw new Error('Available rooms/beds must be a number')
      if (!Number.isFinite(payload.pricePerBed)) throw new Error('Price per bed must be a number')

      if (selectedId) {
        await hostelApi.updateHostel(selectedId, payload)
      } else {
        await hostelApi.createHostel(payload)
      }

      resetForm()
      await refresh()
    } catch (e2) {
      setError(e2.message || 'Failed to save hostel')
    }
  }

  const handleDelete = async (id) => {
    const hostel = hostels.find((h) => h._id === id)
    const ok = window.confirm(`Delete hostel "${hostel?.name || ''}"?`)
    if (!ok) return
    setError('')
    try {
      await hostelApi.deleteHostel(id)
      if (selectedId === id) resetForm()
      await refresh()
    } catch (e) {
      setError(e.message || 'Failed to delete')
    }
  }

  return (
    <div className="content-card">
      <h1 className="page-title mb-4">Hostels</h1>
      <p className="page-description">Admin CRUD for hostel listings.</p>

      {error && (
        <p className="page-description" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="table-wrap mb-6">
            <table className="table-admin">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Beds</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hostels.map((h) => (
                  <tr key={h._id}>
                    <td>{h.name}</td>
                    <td>{formatPrice(h.pricePerBed)}</td>
                    <td>{h.totalRooms}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="table-action-link"
                          onClick={() => handleEdit(h)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="table-action-link"
                          onClick={() => handleDelete(h._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td colSpan={4}>Loading...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Emerald Grove Residences"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Malabe – Near SLIIT & Horizon Campus"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Short description"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beds (totalRooms)</label>
                <input
                  value={form.totalRooms}
                  onChange={(e) => handleChange('totalRooms', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 180"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beds available (availableRooms)
                </label>
                <input
                  value={form.availableRooms}
                  onChange={(e) => handleChange('availableRooms', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 180"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price per bed</label>
              <input
                value={form.pricePerBed}
                onChange={(e) => handleChange('pricePerBed', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., 18000"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amenities (comma-separated)</label>
              <input
                value={form.amenitiesText}
                onChange={(e) => handleChange('amenitiesText', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Wi-Fi, Study rooms, Laundry"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-table-primary">
                {selectedHostel ? 'Update Hostel' : 'Add Hostel'}
              </button>
              <button
                type="button"
                className="btn-table-secondary"
                onClick={resetForm}
                disabled={!selectedHostel}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

