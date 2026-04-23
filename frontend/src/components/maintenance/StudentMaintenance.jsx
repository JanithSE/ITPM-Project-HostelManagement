import { useCallback, useEffect, useState } from 'react'
import { maintenanceApi } from '../../shared/api/client'
import hostelImage from '../../assets/hostel.jpg'

/**
 * VIVA: Student — Maintenance (frontend)
 * - Validation: `validateForm` + per-field `touched` (real-time UX; backend re-validates in maintenanceController).
 * - API: all calls go through `maintenanceApi` in `shared/api/client.js` (POST/PUT use multipart with optional `image`).
 * - Image: file type/size check in browser; multer in `backend/middleware/upload.js` + file stored under `/uploads/maintenance/`.
 * - Lock: non-`open` rows disable edit/delete; UI explains why.
 * - Notifications: `success` / `msg` = user feedback after create/update/delete.
 */
const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const LOCKED_TOOLTIP = 'This request is locked because it is already in progress/resolved'
const IMAGE_MAX_MB = 2
const IMAGE_MAX_BYTES = IMAGE_MAX_MB * 1024 * 1024
// Must stay aligned with backend: JPG/PNG only, 2MB max (see upload middleware).
const IMAGE_ACCEPT = 'image/jpeg,image/png,.jpg,.jpeg,.png'

function statusBadgeStyle(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'open') {
    return { background: '#14532d', color: '#dcfce7', border: '1px solid #22c55e' }
  }
  if (s === 'in_progress') {
    return { background: '#713f12', color: '#fef9c3', border: '1px solid #eab308' }
  }
  if (s === 'resolved') {
    return { background: '#450a0a', color: '#fecaca', border: '1px solid #ef4444' }
  }
  return { background: '#1f2937', color: '#e5e7eb', border: '1px solid #4b5563' }
}

function formatCreatedAt(value) {
  if (!value) return '—'
  const dt = new Date(value)
  return {
    date: dt.toLocaleDateString(),
    time: dt.toLocaleTimeString(),
  }
}

export default function StudentMaintenance() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [priority, setPriority] = useState('medium')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [imageError, setImageError] = useState('')
  const [viewerImage, setViewerImage] = useState('')
  const [viewerTitle, setViewerTitle] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({
    title: false,
    description: false,
    location: false,
    priority: false,
  })

  // Load only logged-in student's maintenance requests.
  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')
    // Do not clear `success` here: submit handler calls `load()` to refresh the table, and we still
    // want the green success banner to stay visible (user feedback after API success).
    try {
      const data = await maintenanceApi.myList()
      setList(Array.isArray(data) ? data : [])
    } catch (e) {
      setMsg(e.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // VIVA: client-side validation (fast feedback) — must match rules enforced in createMaintenance / updateMyMaintenance.
  function validateForm(next = { title, description, location, priority }) {
    const nextErrors = {}
    const titleTrim = next.title.trim()
    const descriptionTrim = next.description.trim()
    const locationTrim = next.location.trim()

    if (!titleTrim) nextErrors.title = 'Title is required.'
    else if (titleTrim.length < 5 || titleTrim.length > 120) nextErrors.title = 'Title must be 5-120 characters.'

    if (!descriptionTrim) nextErrors.description = 'Description is required.'
    else if (descriptionTrim.length < 20) nextErrors.description = 'Description must be at least 20 characters.'
    else if (descriptionTrim.length > 1500) nextErrors.description = 'Description must be 1500 characters or less.'

    if (!locationTrim) {
      nextErrors.location = 'Location is required.'
    } else if (!/^Block\s+[A-Z]\s*-\s*Room\s+\d{3}$/i.test(locationTrim)) {
      nextErrors.location = 'Use format: Block A - Room 101'
    }

    if (!next.priority || !String(next.priority).trim()) {
      nextErrors.priority = 'Priority is required.'
    }

    return nextErrors
  }

  const isFormValid = Object.keys(validateForm()).length === 0

  function markTouched(field) {
    setTouched((t) => ({ ...t, [field]: true }))
  }

  function updateField(field, value) {
    setSuccess('')
    if (field === 'title') setTitle(value)
    if (field === 'description') setDescription(value)
    if (field === 'location') setLocation(value)
    if (field === 'priority') setPriority(value)
    const nextForm = {
      title: field === 'title' ? value : title,
      description: field === 'description' ? value : description,
      location: field === 'location' ? value : location,
      priority: field === 'priority' ? value : priority,
    }
    setErrors(validateForm(nextForm))
  }

  function inputBorder(field, hasValue = true) {
    if (!touched[field]) return '#374151'
    if (errors[field]) return '#dc2626'
    if (hasValue) return '#22c55e'
    return '#374151'
  }

  function resetImageState() {
    setImageFile(null)
    setImagePreview('')
    setImageError('')
  }

  function validateAndPreviewImage(file) {
    if (!file) {
      resetImageState()
      return
    }
    const allowed = ['image/jpeg', 'image/png']
    if (!allowed.includes(String(file.type).toLowerCase())) {
      setImageFile(null)
      setImagePreview('')
      setImageError('Only JPG and PNG images are allowed.')
      return
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setImageFile(null)
      setImagePreview('')
      setImageError(`Image must be ${IMAGE_MAX_MB}MB or smaller.`)
      return
    }
    setImageError('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg('')
    setSuccess('')
    // Remember edit mode *before* clearing editingId, otherwise success text always says "submitted".
    const wasEditing = Boolean(editingId)
    const allTouched = { title: true, description: true, location: true, priority: true }
    setTouched(allTouched)
    const nextErrors = validateForm()
    setErrors(nextErrors)
    // Stop submit immediately if local validation fails.
    if (Object.keys(nextErrors).length > 0) return
    try {
      const titleTrim = title.trim().toLowerCase()
      const locationTrim = location.trim().toLowerCase()
      const duplicate = list.some(
        (row) => row._id !== editingId &&
          String(row.title || '').trim().toLowerCase() === titleTrim &&
          String(row.location || '').trim().toLowerCase() === locationTrim
      )
      if (duplicate) {
        setMsg('Duplicate request: same Title + Location already exists.')
        setErrors((prev) => ({
          ...prev,
          title: 'Duplicate title for this location.',
          location: 'Duplicate location for this title.',
        }))
        return
      }

      if (editingId) {
        await maintenanceApi.updateMine(editingId, {
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          priority,
          imageFile,
        })
      } else {
        // Student creates a new maintenance request.
        await maintenanceApi.create({
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          priority,
          imageFile,
        })
      }
      // Reset form state after successful submit.
      setTitle('')
      setDescription('')
      setLocation('')
      setPriority('medium')
      setEditingId('')
      resetImageState()
      setErrors({})
      setTouched({ title: false, description: false, location: false, priority: false })
      // Notification: confirm what happened; shown as green banner in UI.
      setSuccess(wasEditing ? 'Request updated successfully.' : 'Request submitted successfully.')
      // Reload table so latest request appears without manual refresh.
      await load()
    } catch (e) {
      setMsg(e.message || 'Submit failed')
    }
  }

  function startEdit(row) {
    setMsg('')
    setSuccess('')
    setEditingId(row._id)
    setTitle(row.title || '')
    setDescription(row.description || '')
    setLocation(row.location || '')
    setPriority(row.priority || 'medium')
    setImageFile(null)
    setImagePreview(row.imageUrl || '')
    setImageError('')
    setErrors({})
    setTouched({ title: false, description: false, location: false, priority: false })
  }

  function cancelEdit() {
    setEditingId('')
    setTitle('')
    setDescription('')
    setLocation('')
    setPriority('medium')
    resetImageState()
    setErrors({})
    setTouched({ title: false, description: false, location: false, priority: false })
  }

  async function removeRow(row) {
    const ok = window.confirm('Delete this maintenance request?')
    if (!ok) return
    try {
      setMsg('')
      setSuccess('')
      await maintenanceApi.removeMine(row._id)
      if (editingId === row._id) cancelEdit()
      setSuccess('Request deleted successfully.')
      await load()
    } catch (e) {
      setMsg(e.message || 'Delete failed')
    }
  }

  function isEditable(row) {
    return row.status === 'open'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        backgroundImage: `url(${hostelImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        padding: '24px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.58)',
        }}
      />
      <div className="content-card" style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>
      <h1 className="page-title mb-4">Student Maintenance Form</h1>

      <h2 className="page-description" style={{ marginBottom: '0.75rem' }}>
        {editingId ? 'Update Maintenance Request' : 'New Maintenance Request'}
      </h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480, marginBottom: '2rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Title</label>
          <input
            style={{ width: '100%', padding: '0.5rem', border: `1px solid ${inputBorder('title', title.trim().length > 0)}` }}
            value={title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => markTouched('title')}
            maxLength={120}
            placeholder="Example: Water Leakage in Bathroom"
          />
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{touched.title ? errors.title || '' : ''}</span>
            <span style={{ color: '#6b7280' }}>{title.length}/120</span>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Description</label>
          <textarea
            style={{ width: '100%', padding: '0.5rem', minHeight: 80, border: `1px solid ${inputBorder('description', description.trim().length > 0)}` }}
            value={description}
            onChange={(e) => updateField('description', e.target.value)}
            onBlur={() => markTouched('description')}
            maxLength={1500}
            placeholder="Describe the issue clearly: where it is, when it started, and how urgent it is."
          />
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{touched.description ? errors.description || '' : ''}</span>
            <span style={{ color: '#6b7280' }}>{description.length}/1500</span>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Location (Room)</label>
          <input
            style={{ width: '100%', padding: '0.5rem', border: `1px solid ${inputBorder('location', location.trim().length > 0)}` }}
            value={location}
            onChange={(e) => updateField('location', e.target.value)}
            onBlur={() => markTouched('location')}
            maxLength={120}
            placeholder="Example: Block B - Room 203"
          />
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{touched.location ? errors.location || '' : ''}</span>
            <span style={{ color: '#6b7280' }}>{location.length}/120</span>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Priority</label>
          <select
            style={{ width: '100%', padding: '0.5rem', border: `1px solid ${inputBorder('priority', !!priority)}` }}
            value={priority}
            onChange={(e) => updateField('priority', e.target.value)}
            onBlur={() => markTouched('priority')}
            required
          >
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <div style={{ marginTop: 4, fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{touched.priority ? errors.priority || '' : ''}</span>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Upload Image (optional)</label>
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            onChange={(e) => validateAndPreviewImage(e.target.files?.[0])}
            style={{ width: '100%' }}
          />
          <div style={{ marginTop: 4, fontSize: 12, color: imageError ? '#dc2626' : '#94a3b8' }}>
            {imageError || `Allowed: JPG/PNG, max ${IMAGE_MAX_MB}MB`}
          </div>
          {imagePreview && (
            <div style={{ marginTop: 8 }}>
              <img
                src={imagePreview}
                alt="Selected maintenance preview"
                style={{ width: 120, height: 84, objectFit: 'cover', borderRadius: 8, border: '1px solid #334155' }}
              />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn-primary-action" disabled={!isFormValid || Boolean(imageError)}>
            {editingId ? 'Update Request' : 'Submit Request'}
          </button>
          {editingId && (
            <button type="button" className="btn-table-primary" onClick={cancelEdit}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <h2 className="page-description" style={{ marginBottom: '0.75rem' }}>
        My Maintenance Requests
      </h2>
      {msg && <p style={{ marginBottom: 8 }}>{msg}</p>}
      {success && <p style={{ marginBottom: 8, color: '#22c55e' }}>{success}</p>}
      <button type="button" className="btn-table-primary" style={{ marginBottom: 8 }} onClick={load} disabled={loading}>
        Refresh
      </button>
      <div className="table-wrap maintenance-table-wrap">
        <table className="table-admin maintenance-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Location</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Image</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && !loading && (
              <tr>
                <td colSpan={7}>No requests yet.</td>
              </tr>
            )}
            {list.map((row) => {
              const created = formatCreatedAt(row.createdAt)
              const editable = isEditable(row)
              return (
              <tr
                key={row._id}
                style={editable ? undefined : { background: 'rgba(15, 23, 42, 0.42)', opacity: 0.86 }}
              >
                <td className="maintenance-cell-wrap">{row.title}</td>
                <td className="maintenance-cell-wrap">{row.location || '—'}</td>
                <td className="maintenance-cell-wrap">{row.priority}</td>
                <td>
                  <span
                    style={{
                      ...statusBadgeStyle(row.status),
                      padding: '2px 10px',
                      borderRadius: 999,
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: 'capitalize',
                      display: 'inline-flex',
                    }}
                  >
                    {row.status === 'in_progress' ? 'In Progress' : row.status}
                  </span>
                </td>
                <td className="maintenance-cell-wrap">
                  {row.imageUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <img
                        src={row.imageUrl}
                        alt="Maintenance"
                        style={{ width: 64, height: 46, objectFit: 'cover', borderRadius: 6, border: '1px solid #334155' }}
                      />
                      <button
                        type="button"
                        className="btn-table-primary"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={() => {
                          setViewerImage(row.imageUrl)
                          setViewerTitle(row.title || 'Maintenance Image')
                        }}
                      >
                        View Image
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>No image</span>
                  )}
                </td>
                {/* createdAt is auto-generated by MongoDB timestamps*/}
                <td className="maintenance-created-cell">
                  {created === '—' ? '—' : (
                    <>
                      <span>{created.date}</span>
                      <span>{created.time}</span>
                    </>
                  )}
                </td>
                <td className="maintenance-actions-cell">
                  <div
                    className="maintenance-actions-wrap"
                    title={editable ? '' : LOCKED_TOOLTIP}
                  >
                    <button
                      type="button"
                      className="btn-table-primary"
                      onClick={() => startEdit(row)}
                      disabled={!editable}
                      title={editable ? 'Edit request' : LOCKED_TOOLTIP}
                      style={editable ? undefined : { opacity: 0.55, cursor: 'not-allowed' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-delete-table"
                      onClick={() => removeRow(row)}
                      disabled={!editable}
                      title={editable ? 'Delete request' : LOCKED_TOOLTIP}
                      style={editable ? undefined : { opacity: 0.55, cursor: 'not-allowed' }}
                    >
                      Delete
                    </button>
                  </div>
                  {!editable && (
                    <div className="maintenance-lock-note">
                      {LOCKED_TOOLTIP}
                    </div>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      <div className="maintenance-cards">
        {list.length === 0 && !loading && (
          <div className="maintenance-card-empty">No requests yet.</div>
        )}
        {list.map((row) => {
          const editable = isEditable(row)
          const created = formatCreatedAt(row.createdAt)
          return (
            <article
              key={`card-${row._id}`}
              className={`maintenance-card ${editable ? '' : 'maintenance-card-locked'}`.trim()}
            >
              <div className="maintenance-card-row">
                <span className="maintenance-card-label">Title</span>
                <span className="maintenance-card-value">{row.title}</span>
              </div>
              <div className="maintenance-card-row">
                <span className="maintenance-card-label">Location</span>
                <span className="maintenance-card-value">{row.location || '—'}</span>
              </div>
              <div className="maintenance-card-row">
                <span className="maintenance-card-label">Priority</span>
                <span className="maintenance-card-value">{row.priority}</span>
              </div>
              <div className="maintenance-card-row">
                <span className="maintenance-card-label">Status</span>
                <span
                  style={{
                    ...statusBadgeStyle(row.status),
                    padding: '2px 10px',
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: 'capitalize',
                    display: 'inline-flex',
                  }}
                >
                  {row.status === 'in_progress' ? 'In Progress' : row.status}
                </span>
              </div>
              <div className="maintenance-card-row">
                <span className="maintenance-card-label">Created</span>
                <span className="maintenance-card-value">
                  {created === '—' ? '—' : `${created.date} ${created.time}`}
                </span>
              </div>
              <div className="maintenance-card-row">
                <span className="maintenance-card-label">Image</span>
                <span className="maintenance-card-value" style={{ textAlign: 'left' }}>
                  {row.imageUrl ? (
                    <button
                      type="button"
                      className="btn-table-primary"
                      style={{ padding: '4px 8px', fontSize: 11 }}
                      onClick={() => {
                        setViewerImage(row.imageUrl)
                        setViewerTitle(row.title || 'Maintenance Image')
                      }}
                    >
                      View Image
                    </button>
                  ) : 'No image'}
                </span>
              </div>
              <div className="maintenance-card-actions" title={editable ? '' : LOCKED_TOOLTIP}>
                <button
                  type="button"
                  className="btn-table-primary"
                  onClick={() => startEdit(row)}
                  disabled={!editable}
                  title={editable ? 'Edit request' : LOCKED_TOOLTIP}
                  style={editable ? undefined : { opacity: 0.55, cursor: 'not-allowed' }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-delete-table"
                  onClick={() => removeRow(row)}
                  disabled={!editable}
                  title={editable ? 'Delete request' : LOCKED_TOOLTIP}
                  style={editable ? undefined : { opacity: 0.55, cursor: 'not-allowed' }}
                >
                  Delete
                </button>
              </div>
              {!editable && <p className="maintenance-lock-note">{LOCKED_TOOLTIP}</p>}
            </article>
          )
        })}
      </div>
      {viewerImage && (
        <div className="image-modal-backdrop" onClick={() => setViewerImage('')}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <strong>{viewerTitle || 'Uploaded Image'}</strong>
              <button type="button" className="btn-table-secondary" onClick={() => setViewerImage('')}>
                Close
              </button>
            </div>
            <img src={viewerImage} alt="Enlarged maintenance upload" className="image-modal-image" />
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
