import { useCallback, useEffect, useState } from 'react'
import { maintenanceApi } from '../../shared/api/client'
import hostelImage from '../../assets/hostel.jpg'

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export default function StudentMaintenance() {
  const STUDENT_ID_REGEX = /^[A-Z]{2}\d{8}$/
  const normalizeStudentId = (value) => String(value || '').replace(/\s+/g, '').toUpperCase()

  const [studentId, setStudentId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [priority, setPriority] = useState('medium')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({
    studentId: false,
    title: false,
    description: false,
    location: false,
    priority: false,
  })

  // Load only logged-in student's maintenance requests.
  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')
    setSuccess('')
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

  // Validate on client side before calling backend API.
  function validateForm(next = { studentId, title, description, location, priority }) {
    const nextErrors = {}
    const studentIdTrim = normalizeStudentId(next.studentId)
    const titleTrim = next.title.trim()
    if (!studentIdTrim) nextErrors.studentId = 'Student ID is required.'
    else if (!STUDENT_ID_REGEX.test(studentIdTrim)) {
      nextErrors.studentId = 'Use 2 capital letters + 8 numbers (example: AB12345678).'
    }

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
    if (field === 'studentId') setStudentId(normalizeStudentId(value))
    if (field === 'title') setTitle(value)
    if (field === 'description') setDescription(value)
    if (field === 'location') setLocation(value)
    if (field === 'priority') setPriority(value)
    const nextForm = {
      studentId: field === 'studentId' ? normalizeStudentId(value) : studentId,
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

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg('')
    setSuccess('')
    const allTouched = { studentId: true, title: true, description: true, location: true, priority: true }
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
          studentId: normalizeStudentId(studentId),
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          priority,
        })
      } else {
        // Student creates a new maintenance request.
        await maintenanceApi.create({
          studentId: normalizeStudentId(studentId),
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          priority,
        })
      }
      // Reset form state after successful submit.
      setStudentId('')
      setTitle('')
      setDescription('')
      setLocation('')
      setPriority('medium')
      setEditingId('')
      setErrors({})
      setTouched({ studentId: false, title: false, description: false, location: false, priority: false })
      setSuccess(editingId ? 'Request updated successfully.' : 'Request submitted successfully.')
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
    setStudentId(normalizeStudentId(row.studentId || ''))
    setTitle(row.title || '')
    setDescription(row.description || '')
    setLocation(row.location || '')
    setPriority(row.priority || 'medium')
    setErrors({})
    setTouched({ studentId: false, title: false, description: false, location: false, priority: false })
  }

  function cancelEdit() {
    setEditingId('')
    setStudentId('')
    setTitle('')
    setDescription('')
    setLocation('')
    setPriority('medium')
    setErrors({})
    setTouched({ studentId: false, title: false, description: false, location: false, priority: false })
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
      <div className="content-card" style={{ position: 'relative', zIndex: 1, maxWidth: 1400, width: '96%', margin: '0 auto' }}>
      <h1 className="page-title mb-4">Student Maintenance Form</h1>

      <h2 className="page-description" style={{ marginBottom: '0.75rem' }}>
        {editingId ? 'Update Maintenance Request' : 'New Maintenance Request'}
      </h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: 620, width: '100%', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Student ID</label>
          <input
            style={{ width: '100%', padding: '0.5rem', border: `1px solid ${inputBorder('studentId', studentId.trim().length > 0)}` }}
            value={studentId}
            onChange={(e) => updateField('studentId', e.target.value)}
            onBlur={() => markTouched('studentId')}
            maxLength={10}
            placeholder="Example: AB12345678"
          />
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{touched.studentId ? errors.studentId || '' : ''}</span>
            <span style={{ color: '#6b7280' }}>{studentId.length}/10</span>
          </div>
        </div>
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
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn-primary-action" disabled={!isFormValid}>
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
      <div className="table-wrap">
        <table className="table-admin" style={{ width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Title</th>
              <th style={{ width: '14%' }}>Student ID</th>
              <th style={{ width: '20%' }}>Location</th>
              <th style={{ width: '11%' }}>Priority</th>
              <th style={{ width: '11%' }}>Status</th>
              <th style={{ width: '15%' }}>Created</th>
              <th style={{ width: '12%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && !loading && (
              <tr>
                <td colSpan={7}>No requests yet.</td>
              </tr>
            )}
            {list.map((row) => (
              <tr key={row._id}>
                <td style={{ wordBreak: 'break-word' }}>{row.title}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{row.studentId || '—'}</td>
                <td style={{ wordBreak: 'break-word' }}>{row.location || '—'}</td>
                <td style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{row.priority}</td>
                <td style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{row.status}</td>
                {/* createdAt is auto-generated by MongoDB timestamps*/}
                <td style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
                  {row.createdAt ? (
                    <>
                      {new Date(row.createdAt).toLocaleDateString()}
                      <br />
                      {new Date(row.createdAt).toLocaleTimeString()}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {row.status === 'open' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" className="btn-table-primary" onClick={() => startEdit(row)}>
                        Edit
                      </button>
                      <button type="button" className="btn-delete-table" style={{ marginLeft: 2 }} onClick={() => removeRow(row)}>
                        Delete
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>Locked</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  )
}
