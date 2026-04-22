import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { hostelApi, roomApi } from '../../shared/api/client'

const EMPTY_FORM = {
  hostelId: '',
  roomNumber: '',
  block: 'A',
  floor: '0',
  capacity: '2',
  price: '',
  acType: 'non-ac',
  bathType: 'common',
  hasBalcony: false,
  hasKitchen: false,
  furnishedLevel: 'semi',
  securityDeposit: '',
  status: 'available',
}

export default function AdminRooms() {
  const [rooms, setRooms] = useState([])
  const [hostels, setHostels] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [blockFilter, setBlockFilter] = useState('all')
  const [roomTypeFilter, setRoomTypeFilter] = useState('all')
  const [acTypeFilter, setAcTypeFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function getRoomCategories(room) {
    const cap = Number(room?.capacity || (Array.isArray(room?.beds) ? room.beds.length : 0))
    const categories = []
    if (room?.acType === 'ac') categories.push('A/C Room')
    if (room?.bathType === 'attached' || room?.hasAttachedBath) categories.push('Attached Bathroom Room')
    if (room?.hasBalcony) categories.push('Balcony Room')
    if (room?.hasKitchen) categories.push('Room with Kitchen')
    if (cap === 1) categories.push('Single Room')
    else if (cap === 2) categories.push('2-sharing Room')
    else if (cap >= 3) categories.push('3-sharing Room')
    if (!categories.length) categories.push('General Room')
    return categories
  }

  async function loadData() {
    try {
      setLoading(true)
      const [hostelData, roomData] = await Promise.all([hostelApi.listHostels(), roomApi.list()])
      const hostelsSafe = Array.isArray(hostelData) ? hostelData : []
      const roomsSafe = Array.isArray(roomData) ? roomData : []
      setHostels(hostelsSafe)
      setRooms(roomsSafe)
      setForm((prev) => ({ ...prev, hostelId: prev.hostelId || hostelsSafe[0]?._id || '' }))
    } catch (e) {
      toast.error(e.message || 'Failed to load rooms')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rooms.filter((r) => {
      if (statusFilter !== 'all' && String(r.status || 'available') !== statusFilter) return false
      if (blockFilter !== 'all' && String(r.block || '').toUpperCase() !== blockFilter) return false
      if (acTypeFilter !== 'all' && String(r.acType || 'non-ac') !== acTypeFilter) return false
      if (roomTypeFilter !== 'all') {
        const cap = Number(r.capacity || (Array.isArray(r.beds) ? r.beds.length : 0))
        if (roomTypeFilter === 'single' && cap !== 1) return false
        if (roomTypeFilter === 'two' && cap !== 2) return false
        if (roomTypeFilter === 'threePlus' && cap < 3) return false
      }
      if (!q) return true
      const roomNo = String(r.roomNumber || '').toLowerCase()
      const hostelName = String(r.hostel?.name || hostels.find((h) => h._id === r.hostel)?.name || '').toLowerCase()
      const floor = String(r.floor ?? '')
      const acLabel = String(r.acType === 'ac' ? 'ac' : 'non ac').toLowerCase()
      const capLabel = String(r.capacity || (Array.isArray(r.beds) ? r.beds.length : '')).toLowerCase()
      return roomNo.includes(q) || hostelName.includes(q) || floor.includes(q) || acLabel.includes(q) || capLabel.includes(q)
    })
  }, [rooms, search, statusFilter, blockFilter, roomTypeFilter, acTypeFilter, hostels])

  const stats = useMemo(() => {
    const total = rooms.length
    const available = rooms.filter((r) => r.status === 'available').length
    const reserved = rooms.filter((r) => r.status === 'reserved').length
    const occupied = rooms.filter((r) => r.status === 'occupied').length
    return { total, available, reserved, occupied }
  }, [rooms])

  function openAddModal() {
    setEditingId('')
    setForm({ ...EMPTY_FORM, hostelId: hostels[0]?._id || '' })
    setModalOpen(true)
  }

  function openEditModal(room) {
    setEditingId(room._id)
    setForm({
      hostelId: String(room.hostel?._id || room.hostel || ''),
      roomNumber: String(room.roomNumber || ''),
      block: String(room.block || 'A'),
      floor: String(room.floor ?? 0),
      capacity: String(room.capacity || (Array.isArray(room.beds) ? room.beds.length : 2)),
      price: String(room.price ?? ''),
      acType: String(room.acType || 'non-ac'),
      bathType: String(room.bathType || (room.hasAttachedBath ? 'attached' : 'common')),
      hasBalcony: Boolean(room.hasBalcony),
      hasKitchen: Boolean(room.hasKitchen),
      furnishedLevel: String(room.furnishedLevel || 'semi'),
      securityDeposit: String(room.securityDeposit ?? ''),
      status: String(room.status || 'available'),
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    try {
      setSaving(true)
      const capacity = Number(form.capacity)
      const payload = {
        hostel: form.hostelId,
        roomNumber: form.roomNumber.trim(),
        block: form.block,
        floor: Number(form.floor),
        capacity,
        price: Number(form.price || 0),
        acType: form.acType,
        bathType: form.bathType,
        hasBalcony: Boolean(form.hasBalcony),
        hasAttachedBath: form.bathType === 'attached',
        hasKitchen: Boolean(form.hasKitchen),
        furnishedLevel: form.furnishedLevel,
        securityDeposit: Number(form.securityDeposit || 0),
        status: form.status,
        roomType: capacity <= 1 ? 'single' : 'sharing',
        beds: Array.from({ length: capacity }, (_, i) => ({ bedNumber: String(i + 1) })),
      }
      if (!payload.hostel) throw new Error('Please select a hostel')
      if (!payload.roomNumber) throw new Error('Room number is required')
      if (!Number.isFinite(payload.floor) || payload.floor < 0) throw new Error('Floor must be 0 or higher')
      if (!Number.isFinite(payload.capacity) || payload.capacity < 1) throw new Error('Capacity must be 1 or more')
      if (!Number.isFinite(payload.price) || payload.price < 0) throw new Error('Price must be 0 or more')
      if (!Number.isFinite(payload.securityDeposit) || payload.securityDeposit < 0) {
        throw new Error('Security deposit must be 0 or more')
      }

      if (editingId) {
        await roomApi.update(editingId, payload)
        toast.success('Room updated')
      } else {
        await roomApi.create(payload)
        toast.success('Room created')
      }
      setModalOpen(false)
      await loadData()
    } catch (e2) {
      toast.error(e2.message || 'Failed to save room')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(roomId) {
    if (!window.confirm('Delete this room? Active bookings for this room will be cancelled.')) return
    try {
      await roomApi.delete(roomId)
      toast.success('Room deleted')
      await loadData()
    } catch (e) {
      toast.error(e.message || 'Failed to delete room')
    }
  }

  return (
    <div className="content-card">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title mb-0">Room Management</h1>
          <p className="page-description">Manage room inventory, pricing, status, and occupancy planning.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-table-secondary" onClick={loadData}>Refresh</button>
          <button type="button" className="btn-table-primary" onClick={openAddModal}>+ Add Room</button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40"><div className="text-xs uppercase text-slate-500">Total</div><div className="text-2xl font-bold">{stats.total}</div></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20"><div className="text-xs uppercase text-emerald-700 dark:text-emerald-300">Available</div><div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.available}</div></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20"><div className="text-xs uppercase text-amber-700 dark:text-amber-300">Reserved</div><div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.reserved}</div></div>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20"><div className="text-xs uppercase text-red-700 dark:text-red-300">Occupied</div><div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.occupied}</div></div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input type="search" className="auth-input" placeholder="Search room, hostel, floor..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="auth-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All status</option>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="occupied">Occupied</option>
        </select>
        <select className="auth-input" value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)}>
          <option value="all">All blocks</option>
          <option value="A">Block A</option>
          <option value="B">Block B</option>
          <option value="C">Block C</option>
        </select>
        <select className="auth-input" value={roomTypeFilter} onChange={(e) => setRoomTypeFilter(e.target.value)}>
          <option value="all">All room types</option>
          <option value="single">Single room</option>
          <option value="two">2 member room</option>
          <option value="threePlus">3+ member room</option>
        </select>
        <select className="auth-input" value={acTypeFilter} onChange={(e) => setAcTypeFilter(e.target.value)}>
          <option value="all">All A/C types</option>
          <option value="ac">A/C room</option>
          <option value="non-ac">Non A/C room</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Room</th>
              <th>Hostel</th>
              <th>Block/Floor</th>
              <th>Category</th>
              <th>Type</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}>Loading rooms...</td></tr>
            ) : filteredRooms.length === 0 ? (
              <tr><td colSpan={8}>No rooms found.</td></tr>
            ) : (
              filteredRooms.map((r) => (
                <tr key={r._id}>
                  <td className="font-semibold">{r.roomNumber || '—'}</td>
                  <td>{r.hostel?.name || hostels.find((h) => h._id === r.hostel)?.name || '—'}</td>
                  <td>Block {r.block || '—'} / Floor {r.floor ?? 0}</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {getRoomCategories(r).map((cat) => (
                        <span key={`${r._id}-${cat}`} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="text-xs">
                      <div className="font-semibold">{r.capacity || (Array.isArray(r.beds) ? r.beds.length : '—')} member room</div>
                      <div className="opacity-70">{r.acType === 'ac' ? 'A/C' : 'Non A/C'} · {r.bathType === 'attached' ? 'Attached bath' : 'Common bath'}</div>
                      <div className="opacity-70">{r.hasBalcony ? 'Balcony' : 'No balcony'} · {r.hasKitchen ? 'Kitchen' : 'No kitchen'}</div>
                    </div>
                  </td>
                  <td>
                    <div className="text-xs">
                      <div>Rent: Rs.{Number(r.price || 0).toLocaleString()}</div>
                      <div className="opacity-70">Deposit: Rs.{Number(r.securityDeposit || 0).toLocaleString()}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      r.status === 'occupied'
                        ? 'bg-red-100 text-red-700'
                        : r.status === 'reserved'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {r.status || 'available'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button type="button" className="table-action-link" onClick={() => openEditModal(r)}>Edit</button>
                      <button type="button" className="table-action-link" onClick={() => handleDelete(r._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
              {editingId ? 'Edit Room' : 'Add Room'}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="auth-label">Hostel</label>
                  <select className="auth-input" value={form.hostelId} onChange={(e) => setForm((prev) => ({ ...prev, hostelId: e.target.value }))} required>
                    <option value="">Select hostel</option>
                    {hostels.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="auth-label">Room Number</label>
                  <input className="auth-input" value={form.roomNumber} onChange={(e) => setForm((prev) => ({ ...prev, roomNumber: e.target.value }))} required />
                </div>
                <div>
                  <label className="auth-label">Block</label>
                  <select className="auth-input" value={form.block} onChange={(e) => setForm((prev) => ({ ...prev, block: e.target.value }))}>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
                <div>
                  <label className="auth-label">Floor</label>
                  <input type="number" min="0" className="auth-input" value={form.floor} onChange={(e) => setForm((prev) => ({ ...prev, floor: e.target.value }))} />
                </div>
                <div>
                  <label className="auth-label">Occupancy</label>
                  <select className="auth-input" value={form.capacity} onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}>
                    <option value="1">Single room</option>
                    <option value="2">2 member room</option>
                    <option value="3">3 member room</option>
                  </select>
                </div>
                <div>
                  <label className="auth-label">Price</label>
                  <input type="number" min="0" className="auth-input" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} />
                </div>
                <div>
                  <label className="auth-label">A/C Type</label>
                  <select className="auth-input" value={form.acType} onChange={(e) => setForm((prev) => ({ ...prev, acType: e.target.value }))}>
                    <option value="non-ac">Non A/C room</option>
                    <option value="ac">A/C room</option>
                  </select>
                </div>
                <div>
                  <label className="auth-label">Bathroom Type</label>
                  <select className="auth-input" value={form.bathType} onChange={(e) => setForm((prev) => ({ ...prev, bathType: e.target.value }))}>
                    <option value="attached">Attached bathroom</option>
                    <option value="common">Common attached bathroom</option>
                  </select>
                </div>
                <div>
                  <label className="auth-label">Furnishing</label>
                  <select className="auth-input" value={form.furnishedLevel} onChange={(e) => setForm((prev) => ({ ...prev, furnishedLevel: e.target.value }))}>
                    <option value="basic">Basic</option>
                    <option value="semi">Semi-furnished</option>
                    <option value="fully">Fully-furnished</option>
                  </select>
                </div>
                <div>
                  <label className="auth-label">Security Deposit</label>
                  <input type="number" min="0" className="auth-input" value={form.securityDeposit} onChange={(e) => setForm((prev) => ({ ...prev, securityDeposit: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={form.hasBalcony} onChange={(e) => setForm((prev) => ({ ...prev, hasBalcony: e.target.checked }))} />
                  Balcony room
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={form.hasKitchen} onChange={(e) => setForm((prev) => ({ ...prev, hasKitchen: e.target.checked }))} />
                  Room with kitchen
                </label>
              </div>

              <div>
                <label className="auth-label">Status</label>
                <select className="auth-input" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                  <option value="available">available</option>
                  <option value="reserved">reserved</option>
                  <option value="occupied">occupied</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-table-primary flex-1">{saving ? 'Saving...' : (editingId ? 'Update Room' : 'Create Room')}</button>
                <button type="button" className="btn-table-secondary flex-1" onClick={() => setModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

