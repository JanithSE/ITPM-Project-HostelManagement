import { useCallback, useEffect, useState } from 'react'
import { maintenanceApi } from '../../shared/api/client'
import hostelImage from '../../assets/hostel.jpg'

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export default function StudentMaintenance() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [priority, setPriority] = useState('medium')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [errors, setErrors] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')
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

  function validateForm() {
    const nextErrors = {}
    const titleTrim = title.trim()
    const descriptionTrim = description.trim()
    const locationTrim = location.trim()

    if (!titleTrim) nextErrors.title = 'Title is required.'
    else if (titleTrim.length < 5) nextErrors.title = 'Title must be at least 5 characters.'
    else if (titleTrim.length > 120) nextErrors.title = 'Title must be 120 characters or less.'

    if (!descriptionTrim) nextErrors.description = 'Description is required.'
    else if (descriptionTrim.length < 20) nextErrors.description = 'Description must be at least 20 characters.'
    else if (descriptionTrim.length > 1500) nextErrors.description = 'Description must be 1500 characters or less.'

    if (locationTrim.length > 120) nextErrors.location = 'Location must be 120 characters or less.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg('')
    if (!validateForm()) return
    try {
      await maintenanceApi.create({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        priority,
      })
      setTitle('')
      setDescription('')
      setLocation('')
      setPriority('medium')
      setErrors({})
      setMsg('Request submitted.')
      await load()
    } catch (e) {
      setMsg(e.message || 'Submit failed')
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
      <div className="content-card" style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>
      <h1 className="page-title mb-4">Student Maintenance Form</h1>

      <h2 className="page-description" style={{ marginBottom: '0.75rem' }}>
        New Maintenance Request
      </h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480, marginBottom: '2rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Title</label>
          <input
            style={{ width: '100%', padding: '0.5rem' }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Example: Water Leakage in Bathroom"
          />
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{errors.title || ''}</span>
            <span style={{ color: '#6b7280' }}>{title.length}/120</span>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Description</label>
          <textarea
            style={{ width: '100%', padding: '0.5rem', minHeight: 80 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1500}
            placeholder="Describe the issue clearly: where it is, when it started, and how urgent it is."
          />
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{errors.description || ''}</span>
            <span style={{ color: '#6b7280' }}>{description.length}/1500</span>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Location (Room)</label>
          <input
            style={{ width: '100%', padding: '0.5rem' }}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
            placeholder="Example: Block B - Room 203"
          />
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{errors.location || ''}</span>
            <span style={{ color: '#6b7280' }}>{location.length}/120</span>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Priority</label>
          <select
            style={{ width: '100%', padding: '0.5rem' }}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            required
          >
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary-action">
          Submit Request
        </button>
      </form>

      <h2 className="page-description" style={{ marginBottom: '0.75rem' }}>
        My Maintenance Requests
      </h2>
      {msg && <p style={{ marginBottom: 8 }}>{msg}</p>}
      <button type="button" className="btn-table-primary" style={{ marginBottom: 8 }} onClick={load} disabled={loading}>
        Refresh
      </button>
      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Title</th>
              <th>Location</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && !loading && (
              <tr>
                <td colSpan={5}>No requests yet.</td>
              </tr>
            )}
            {list.map((row) => (
              <tr key={row._id}>
                <td>{row.title}</td>
                <td>{row.location || '—'}</td>
                <td>{row.priority}</td>
                <td>{row.status}</td>
                <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  )
}
