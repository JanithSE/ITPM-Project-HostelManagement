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

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg('')
    try {
      await maintenanceApi.create({ title, description, location, priority })
      setTitle('')
      setDescription('')
      setLocation('')
      setPriority('medium')
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
      <div className="content-card" style={{ position: 'relative', zIndex: 1 }}>
      <h1 className="page-title mb-4">Maintenance</h1>

      <h2 className="page-description" style={{ marginBottom: '0.75rem' }}>
        New maintenance request
      </h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480, marginBottom: '2rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Title</label>
          <input
            style={{ width: '100%', padding: '0.5rem' }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Description</label>
          <textarea
            style={{ width: '100%', padding: '0.5rem', minHeight: 80 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Location (room)</label>
          <input
            style={{ width: '100%', padding: '0.5rem' }}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
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
          Submit request
        </button>
      </form>

      <h2 className="page-description" style={{ marginBottom: '0.75rem' }}>
        My maintenance requests
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
