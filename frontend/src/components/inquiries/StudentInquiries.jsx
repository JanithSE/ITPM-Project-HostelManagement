import { useCallback, useEffect, useState } from 'react'
import { inquiryApi } from '../../shared/api/client'
import hostelImage from '../../assets/hostel.jpg'

export default function StudentInquiries() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [errors, setErrors] = useState({})

  // Load only current student's inquiries.
  const load = useCallback(async () => {
    setLoading(true)
    setMsg('')
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
  function validateForm() {
    const nextErrors = {}
    const subjectTrim = subject.trim()
    const messageTrim = message.trim()

    if (!subjectTrim) nextErrors.subject = 'Subject is required.'
    else if (subjectTrim.length < 5) nextErrors.subject = 'Subject must be at least 5 characters.'
    else if (subjectTrim.length > 120) nextErrors.subject = 'Subject must be 120 characters or less.'

    if (!messageTrim) nextErrors.message = 'Message is required.'
    else if (messageTrim.length < 15) nextErrors.message = 'Message must be at least 15 characters.'
    else if (messageTrim.length > 1200) nextErrors.message = 'Message must be 1200 characters or less.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg('')
    if (!validateForm()) return
    try {
      // Create inquiry then refresh list so the latest item appears immediately.
      await inquiryApi.create({ subject: subject.trim(), message: message.trim() })
      setSubject('')
      setMessage('')
      setErrors({})
      setMsg('Inquiry sent.')
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
      <h1 className="page-title mb-4">Student Inquiry Form</h1>

      <h2 className="page-description" style={{ marginBottom: '0.75rem' }}>
        New Inquiry
      </h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480, marginBottom: '2rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Subject</label>
          <input
            style={{ width: '100%', padding: '0.5rem' }}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            placeholder="Example: Wi-Fi Not Working in Room A-12"
          />
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{errors.subject || ''}</span>
            <span style={{ color: '#6b7280' }}>{subject.length}/120</span>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Message</label>
          <textarea
            style={{ width: '100%', padding: '0.5rem', minHeight: 100 }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1200}
            placeholder="Describe your issue clearly: where it happened, when it started, and what you already tried."
          />
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#dc2626' }}>{errors.message || ''}</span>
            <span style={{ color: '#6b7280' }}>{message.length}/1200</span>
          </div>
        </div>
        <button type="submit" className="btn-primary-action">
          Submit Inquiry
        </button>
      </form>

      <h2 className="page-description" style={{ marginBottom: '0.75rem' }}>
        My Inquiries
      </h2>
      {msg && <p style={{ marginBottom: 8 }}>{msg}</p>}
      <button type="button" className="btn-table-primary" style={{ marginBottom: 8 }} onClick={load} disabled={loading}>
        Refresh
      </button>
      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Message</th>
              <th>Status</th>
              <th>Reply</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && !loading && (
              <tr>
                <td colSpan={5}>No inquiries yet.</td>
              </tr>
            )}
            {list.map((row) => (
              <tr key={row._id}>
                <td>{row.subject}</td>
                <td style={{ maxWidth: 200, wordBreak: 'break-word' }}>{row.message}</td>
                <td>{row.status}</td>
                <td style={{ maxWidth: 200, wordBreak: 'break-word' }}>{row.reply || '—'}</td>
                {/* Inquiry createdAt is auto-set by backend timestamps; display in readable local format */}
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
