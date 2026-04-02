import { useCallback, useEffect, useState } from 'react'
import { inquiryApi } from '../../shared/api/client'
import hostelImage from '../../assets/hostel.jpg'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CAMPUS_ID_REGEX = /^[A-Z]{2}\d{8}$/
// Optional UX rule: keep email providers limited to common domains.
const COMMON_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com']

export default function StudentInquiries() {
  const normalizeCampusId = (value) => String(value || '').replace(/\s+/g, '').toUpperCase()

  const [campusId, setCampusId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState('')
  const [emailHint, setEmailHint] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({
    campusId: false,
    name: false,
    email: false,
    message: false,
  })

  // Load only current student's inquiries.
  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')
    setSuccess('')
    try {
      const data = await inquiryApi.myList()
      setList(Array.isArray(data) ? data : [])
    } catch (e) {
      setMsg(e.message || 'Failed to load inquiries')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Client-side validation keeps obvious invalid inputs out of the API.
  function validateForm(next = { campusId, name, email, message }) {
    const nextErrors = {}
    const campusIdTrim = normalizeCampusId(next.campusId)
    const nameTrim = next.name.trim()
    const emailTrim = next.email.trim()
    const messageTrim = next.message.trim()

    if (!campusIdTrim) nextErrors.campusId = 'Campus ID is required.'
    else if (!CAMPUS_ID_REGEX.test(campusIdTrim)) {
      nextErrors.campusId = 'Use 2 capital letters + 8 numbers (example: AB12345678).'
    }

    if (!nameTrim) nextErrors.name = 'Name is required.'
//email validation in inquiry form 
    if (!emailTrim) nextErrors.email = 'Email is required.'
    else if (!EMAIL_REGEX.test(emailTrim)) nextErrors.email = 'Enter a valid email address (example: user@gmail.com).'
    else {
      const domain = emailTrim.split('@')[1]?.toLowerCase() || ''
      if (!COMMON_EMAIL_DOMAINS.includes(domain)) {
        nextErrors.email = `Use a common provider: ${COMMON_EMAIL_DOMAINS.join(', ')}`
      }
    }

    if (!messageTrim) nextErrors.message = 'Message is required.'
    else if (messageTrim.length < 10) nextErrors.message = 'Message must be at least 10 characters.'
    else if (messageTrim.length > 1200) nextErrors.message = 'Message must be 1200 characters or less.'

    return nextErrors
  }

  const isFormValid = Object.keys(validateForm()).length === 0

  function markTouched(field) {
    setTouched((t) => ({ ...t, [field]: true }))
  }

  function updateField(field, value) {
    setSuccess('')
    if (field !== 'email') setEmailHint('')
    if (field === 'campusId') setCampusId(normalizeCampusId(value))
    if (field === 'name') setName(value)
    if (field === 'email') {
      // Real-time normalization: trim spaces and force lowercase.
      const normalizedEmail = value.trim().toLowerCase()
      setEmail(normalizedEmail)
      if (normalizedEmail && !validateForm({ name, email: normalizedEmail, message }).email) {
        setEmailHint('Valid email address.')
      } else {
        setEmailHint('')
      }
    }
    if (field === 'message') setMessage(value)
    const nextForm = {
      campusId: field === 'campusId' ? normalizeCampusId(value) : campusId,
      name: field === 'name' ? value : name,
      email: field === 'email' ? value.trim().toLowerCase() : email,
      message: field === 'message' ? value : message,
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
    const allTouched = { campusId: true, name: true, email: true, message: true }
    setTouched(allTouched)
    const nextErrors = validateForm()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    try {
      const payload = {
        campusId: normalizeCampusId(campusId),
        subject: `Inquiry from ${name.trim()} (${email.trim()})`,
        message: message.trim(),
      }
      if (editingId) {
        await inquiryApi.updateMine(editingId, payload)
      } else {
        // Create inquiry then refresh list so the latest item appears immediately.
        await inquiryApi.create(payload)
      }
      setCampusId('')
      setName('')
      setEmail('')
      setMessage('')
      setEditingId('')
      setErrors({})
      setTouched({ campusId: false, name: false, email: false, message: false })
      setSuccess(editingId ? 'Inquiry updated successfully.' : 'Inquiry submitted successfully.')
      await load()
    } catch (e) {
      setMsg(e.message || 'Submit failed')
    }
  }

  function startEdit(row) {
    setMsg('')
    setSuccess('')
    setEditingId(row._id)
    setCampusId(normalizeCampusId(row.campusId || ''))
    setName(row.from?.name || '')
    setEmail((row.from?.email || '').toLowerCase())
    setMessage(row.message || '')
    setErrors({})
    setTouched({ campusId: false, name: false, email: false, message: false })
    setEmailHint('')
  }

  function cancelEdit() {
    setEditingId('')
    setCampusId('')
    setName('')
    setEmail('')
    setMessage('')
    setErrors({})
    setTouched({ campusId: false, name: false, email: false, message: false })
    setEmailHint('')
  }

  async function removeRow(row) {
    const ok = window.confirm('Delete this inquiry?')
    if (!ok) return
    try {
      setMsg('')
      setSuccess('')
      await inquiryApi.removeMine(row._id)
      if (editingId === row._id) cancelEdit()
      setSuccess('Inquiry deleted successfully.')
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
      <div className="content-card" style={{ position: 'relative', zIndex: 1, maxWidth: 1450, width: '96%', margin: '0 auto' }}>
      <h1 className="page-title mb-4">Student Inquiry Form</h1>

      <h2 className="page-description" style={{ marginBottom: '0.75rem' }}>
        {editingId ? 'Update Inquiry' : 'New Inquiry'}
      </h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: 640, width: '100%', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Campus ID</label>
          <input
            style={{ width: '100%', padding: '0.5rem', border: `1px solid ${inputBorder('campusId', campusId.trim().length > 0)}` }}
            value={campusId}
            onChange={(e) => updateField('campusId', e.target.value)}
            onBlur={() => markTouched('campusId')}
            maxLength={10}
            placeholder="Example: AB12345678"
          />
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{touched.campusId ? errors.campusId || '' : ''}</span>
            <span style={{ color: '#6b7280' }}>{campusId.length}/10</span>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Name</label>
          <input
            style={{ width: '100%', padding: '0.5rem', border: `1px solid ${inputBorder('name', name.trim().length > 0)}` }}
            value={name}
            onChange={(e) => updateField('name', e.target.value)}
            onBlur={() => markTouched('name')}
            maxLength={100}
            placeholder="Enter your full name"
          />
          <div style={{ marginTop: 4, fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{touched.name ? errors.name || '' : ''}</span>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Email</label>
          <input
            style={{ width: '100%', padding: '0.5rem', border: `1px solid ${inputBorder('email', email.trim().length > 0)}` }}
            value={email}
            onChange={(e) => updateField('email', e.target.value)}
            onKeyUp={(e) => updateField('email', e.currentTarget.value)}
            onBlur={() => markTouched('email')}
            maxLength={160}
            placeholder="Enter your email"
          />
          <div style={{ marginTop: 4, fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{touched.email ? errors.email || '' : ''}</span>
          </div>
          {!errors.email && emailHint && (
            <div style={{ marginTop: 2, fontSize: 12, color: '#22c55e' }}>{emailHint}</div>
          )}
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Message</label>
          <textarea
            style={{ width: '100%', padding: '0.5rem', minHeight: 100, border: `1px solid ${inputBorder('message', message.trim().length > 0)}` }}
            value={message}
            onChange={(e) => updateField('message', e.target.value)}
            onBlur={() => markTouched('message')}
            maxLength={1200}
            placeholder="Describe your issue clearly: where it happened, when it started, and what you already tried."
          />
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{touched.message ? errors.message || '' : ''}</span>
            <span style={{ color: '#6b7280' }}>{message.length}/1200</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn-primary-action" disabled={!isFormValid}>
            {editingId ? 'Update Inquiry' : 'Submit Inquiry'}
          </button>
          {editingId && (
            <button type="button" className="btn-table-primary" onClick={cancelEdit}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <h2 className="page-description" style={{ marginBottom: '0.75rem' }}>
        My Inquiries
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
              <th style={{ width: '12%' }}>Campus ID</th>
              <th style={{ width: '10%' }}>Name</th>
              <th style={{ width: '18%' }}>Email</th>
              <th style={{ width: '20%' }}>Message</th>
              <th style={{ width: '9%' }}>Status</th>
              <th style={{ width: '15%' }}>Reply</th>
              <th style={{ width: '10%' }}>Date</th>
              <th style={{ width: '12%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && !loading && (
              <tr>
                <td colSpan={8}>No inquiries yet.</td>
              </tr>
            )}
            {list.map((row) => (
              <tr key={row._id}>
                <td style={{ whiteSpace: 'nowrap' }}>{row.campusId || '—'}</td>
                <td style={{ wordBreak: 'break-word' }}>{row.from?.name || '—'}</td>
                <td style={{ wordBreak: 'break-word' }}>{row.from?.email || '—'}</td>
                <td style={{ wordBreak: 'break-word' }}>{row.message}</td>
                <td style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{row.status}</td>
                <td style={{ wordBreak: 'break-word' }}>{row.reply || '—'}</td>
                {/* Inquiry createdAt is auto-set by backend timestamps; display in readable local format */}
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
                  {row.status === 'open' && !row.reply ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" className="btn-table-primary" onClick={() => startEdit(row)}>
                        Edit
                      </button>
                      <button type="button" className="btn-delete-table" onClick={() => removeRow(row)}>
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
