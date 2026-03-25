import { useEffect, useMemo, useRef, useState } from 'react'
import { hostelApi } from '../../shared/api/client'
import { hostelPhotoSrc } from '../../shared/components/HostelCardMedia'

function formatPrice(n) {
  if (typeof n !== 'number') return '—'
  return `LKR ${n.toLocaleString('en-LK', { maximumFractionDigits: 0 })}`
}

function amenitiesFromText(text) {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function AdminHostels() {
  const imageInputRef = useRef(null)
  const [hostels, setHostels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [imageFile, setImageFile] = useState(null)
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
    setImageFile(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
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

  const openAddForm = () => {
    resetForm()
    setShowForm(true)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleEdit = (hostel) => {
    setShowForm(true)
    setSelectedId(hostel._id)
    setImageFile(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
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

    const amenities = amenitiesFromText(form.amenitiesText)
    const totalRooms = Number(form.totalRooms)
    const availableRooms = Number(form.availableRooms)
    const pricePerBed = Number(form.pricePerBed)

    try {
      if (!form.name.trim()) throw new Error('Hostel name is required')
      if (!form.location.trim()) throw new Error('Location is required')
      if (!Number.isFinite(totalRooms)) throw new Error('Total rooms/beds must be a number')
      if (!Number.isFinite(availableRooms)) throw new Error('Available rooms/beds must be a number')
      if (!Number.isFinite(pricePerBed)) throw new Error('Price per bed must be a number')

      const fd = new FormData()
      fd.append('name', form.name.trim())
      fd.append('location', form.location.trim())
      fd.append('description', form.description.trim())
      fd.append('totalRooms', String(totalRooms))
      fd.append('availableRooms', String(availableRooms))
      fd.append('pricePerBed', String(pricePerBed))
      fd.append('amenities', JSON.stringify(amenities))
      if (imageFile) fd.append('image', imageFile)

      if (selectedId) {
        await hostelApi.updateHostel(selectedId, fd)
      } else {
        await hostelApi.createHostel(fd)
      }

      resetForm()
      setShowForm(false)
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
      if (selectedId === id) {
        resetForm()
        setShowForm(false)
      }
      await refresh()
    } catch (e) {
      setError(e.message || 'Failed to delete')
    }
  }

  const hostelTable = (
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
                  <button type="button" className="table-action-link" onClick={() => handleEdit(h)}>
                    Edit
                  </button>
                  <button type="button" className="table-action-link" onClick={() => handleDelete(h._id)}>
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
  )

  return (
    <div className="content-card">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title mb-1">Hostels</h1>
          <p className="page-description">Admin CRUD for hostel listings.</p>
        </div>
        {!showForm && (
          <button type="button" className="btn-table-primary shrink-0 self-start" onClick={openAddForm}>
            Add hostel
          </button>
        )}
      </div>

      {error && (
        <p className="page-description" role="alert">
          {error}
        </p>
      )}

      {showForm ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>{hostelTable}</div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/40 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {selectedHostel ? 'Edit hostel' : 'Add hostel'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Name</label>
              <input
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="e.g., Emerald Grove Residences"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Location</label>
              <input
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="e.g., Malabe – Near SLIIT & Horizon Campus"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Short description"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                  Beds (totalRooms)
                </label>
                <input
                  value={form.totalRooms}
                  onChange={(e) => handleChange('totalRooms', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Price per bed</label>
              <input
                value={form.pricePerBed}
                onChange={(e) => handleChange('pricePerBed', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="e.g., 18000"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                Amenities (comma-separated)
              </label>
              <input
                value={form.amenitiesText}
                onChange={(e) => handleChange('amenitiesText', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Wi-Fi, Study rooms, Laundry"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Hostel image</label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100 dark:text-slate-300 dark:file:bg-primary-900/40 dark:file:text-primary-200"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setImageFile(f || null)
                }}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                JPEG, PNG, or WebP, up to 8 MB. Optional when adding; when editing, leave empty to keep the current
                photo.
              </p>
              {selectedHostel?.imageUrl && !imageFile && (
                <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-600">
                  <img
                    src={hostelPhotoSrc(selectedHostel.imageUrl) || ''}
                    alt="Current hostel"
                    className="h-32 w-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-table-primary">
                {selectedHostel ? 'Update Hostel' : 'Add Hostel'}
              </button>
              <button type="button" className="btn-table-secondary" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
      ) : (
        hostelTable
      )}
    </div>
  )
}

