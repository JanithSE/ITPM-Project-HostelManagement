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

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

export default function AdminHostels() {
  const imageInputRef = useRef(null)
  const [hostels, setHostels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

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

  const filteredHostels = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return hostels
    return hostels.filter((h) => {
      const fields = [
        h?.name,
        h?.location,
        h?.description,
        h?.pricePerBed,
        h?.totalRooms,
        h?.availableRooms,
        ...(Array.isArray(h?.amenities) ? h.amenities : []),
      ]
      return fields
        .filter((x) => x !== undefined && x !== null)
        .map((x) => String(x).toLowerCase())
        .some((v) => v.includes(q))
    })
  }, [hostels, query])

  const totalBeds = hostels.reduce((s, h) => s + (Number(h?.totalRooms) || 0), 0)
  const availableBeds = hostels.reduce((s, h) => s + (Number(h?.availableRooms) || 0), 0)
  const occupiedBeds = Math.max(0, totalBeds - availableBeds)

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
    if (key === 'totalRooms' || key === 'pricePerBed') {
      setForm((prev) => ({ ...prev, [key]: digitsOnly(value) }))
      return
    }
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
    const isTotalRoomsValid = /^\d+$/.test(String(form.totalRooms || ''))
    const isPricePerBedValid = /^\d+$/.test(String(form.pricePerBed || ''))

    try {
      if (!form.name.trim()) throw new Error('Hostel name is required')
      if (!form.location.trim()) throw new Error('Location is required')
      if (!isTotalRoomsValid) throw new Error('Beds must contain numbers only')
      if (!isPricePerBedValid) throw new Error('Price per bed must contain numbers only')
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
    <div className="mb-6 overflow-hidden rounded-2xl border border-indigo-200/70 bg-white/80 shadow-sm dark:border-indigo-900/50 dark:bg-slate-950/40">
      <div className="table-wrap mb-0">
      <table className="table-admin">
        <thead>
          <tr className="bg-indigo-50/90 dark:bg-indigo-950/40">
            <th>Photo</th>
            <th>Name</th>
            <th>Location</th>
            <th>Amenities</th>
            <th>Price</th>
            <th>Beds</th>
            <th>Availability</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredHostels.map((h) => (
            <tr key={h._id} className="transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20">
              <td>
                <div className="h-12 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  <img
                    src={hostelPhotoSrc(h?.imageUrl) || ''}
                    alt={h?.name || 'Hostel'}
                    className="h-full w-full object-cover"
                  />
                </div>
              </td>
              <td>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{h.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[22rem]">{h.description || '—'}</div>
              </td>
              <td>{h.location || '—'}</td>
              <td>
                <span className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {Array.isArray(h?.amenities) ? h.amenities.length : 0} items
                </span>
              </td>
              <td>{formatPrice(h.pricePerBed)}</td>
              <td>{h.totalRooms ?? '—'}</td>
              <td>
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                  Number(h?.availableRooms) > 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                }`}>
                  {h.availableRooms ?? 0} available
                </span>
              </td>
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
              <td colSpan={8}>Loading...</td>
            </tr>
          )}
          {!loading && filteredHostels.length === 0 && (
            <tr>
              <td colSpan={8}>No hostels match your search.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  )

  return (
    <div className="content-card">
      <div className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-5 py-4 dark:border-slate-700 dark:from-slate-900/70 dark:via-slate-900 dark:to-indigo-900/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="page-title mb-1">Hostels</h1>
            <p className="page-description m-0">Manage hostel listings, capacity, and pricing.</p>
          </div>
          <div className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300">
            {hostels.length} total hostels
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div />
        {!showForm && (
          <button
            type="button"
            className="shrink-0 self-start rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-violet-700"
            onClick={openAddForm}
          >
            Add hostel
          </button>
        )}
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 dark:border-indigo-900/70 dark:bg-indigo-950/30">
          <div className="text-xs uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Total Hostels</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{hostels.length}</div>
        </div>
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 dark:border-cyan-900/70 dark:bg-cyan-950/30">
          <div className="text-xs uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Total Beds</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{totalBeds}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 dark:border-rose-900/70 dark:bg-rose-950/30">
          <div className="text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">Occupied Beds</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{occupiedBeds}</div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          className="auth-input max-w-xl border-indigo-200 bg-white/90 dark:border-indigo-800/70 dark:bg-slate-900/70"
          style={{ minWidth: 280 }}
          placeholder="Search hostels by name, location, amenities..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query ? (
          <button type="button" className="btn-table-secondary" onClick={() => setQuery('')}>
            Clear
          </button>
        ) : null}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300" role="alert">
          {error}
        </div>
      )}

      {showForm ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>{hostelTable}</div>

          <div className="rounded-2xl border border-indigo-300/80 bg-gradient-to-br from-white via-indigo-50/60 to-violet-100/60 p-4 shadow-md shadow-indigo-200/40 dark:border-indigo-800/70 dark:from-slate-900 dark:via-indigo-950/35 dark:to-violet-950/35 sm:p-6">
          <div className="mb-5 rounded-xl border border-indigo-300/80 bg-indigo-50/70 px-4 py-3 dark:border-indigo-800/60 dark:bg-indigo-950/35">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {selectedHostel ? 'Edit hostel' : 'Add hostel'}
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Fill hostel details, capacity, and pricing information.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 dark:border-sky-900/60 dark:bg-sky-950/20">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
              <input
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
                placeholder="e.g., Emerald Grove Residences"
                required
              />
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 dark:border-sky-900/60 dark:bg-sky-950/20">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Location</label>
              <input
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
                placeholder="e.g., Malabe – Near SLIIT & Horizon Campus"
                required
              />
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 dark:border-sky-900/60 dark:bg-sky-950/20">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
                placeholder="Short description"
                rows={3}
              />
            </div>

            <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/50 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/20">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Capacity</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Beds (totalRooms)
                </label>
                <input
                  value={form.totalRooms}
                  onChange={(e) => handleChange('totalRooms', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
                  placeholder="e.g., 180"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Beds available (availableRooms)
                </label>
                <input
                  value={form.availableRooms}
                  onChange={(e) => handleChange('availableRooms', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
                  placeholder="e.g., 180"
                  inputMode="numeric"
                />
              </div>
            </div>
            </div>

            <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <label className="mb-1 block text-sm font-medium text-emerald-800 dark:text-emerald-300">Price per bed</label>
              <input
                value={form.pricePerBed}
                onChange={(e) => handleChange('pricePerBed', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40"
                placeholder="e.g., 18000"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-900/60 dark:bg-violet-950/20">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Amenities (comma-separated)
              </label>
              <input
                value={form.amenitiesText}
                onChange={(e) => handleChange('amenitiesText', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
                placeholder="Wi-Fi, Study rooms, Laundry"
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Hostel image</label>
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

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-blue-700"
              >
                {selectedHostel ? 'Update Hostel' : 'Add Hostel'}
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={closeForm}
              >
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

