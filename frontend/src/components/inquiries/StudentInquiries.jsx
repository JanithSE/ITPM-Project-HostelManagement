import { useCallback, useEffect, useState } from 'react'
import { inquiryApi } from '../../shared/api/client'
import hostelImage from '../../assets/hostel.jpg'

/**
 * VIVA: Student — Inquiry (frontend)
 * - Validation: `validateForm` + `touched` (Campus ID format, email rules, message length) — see also inquiryController.
 * - API: `inquiryApi` in `shared/api/client.js` — POST/PUT with multipart for optional `image` field.
 * - Image: same pattern as maintenance; stored path `imageUrl` in DB, served as `/uploads/...` from backend.
 * - Lock: once admin has replied/closed, student cannot edit/delete; UI + backend both enforce.
 * - Text: "Show more/less" keeps long message/reply readable in the table.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CAMPUS_ID_REGEX = /^[A-Z]{2}\d{8}$/
// Optional UX rule: keep email providers limited to common domains.
const COMMON_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com']
const LOCKED_TOOLTIP = 'This inquiry is locked after admin reply'
const LONG_TEXT_PREVIEW_LIMIT = 140
const IMAGE_MAX_MB = 2
const IMAGE_MAX_BYTES = IMAGE_MAX_MB * 1024 * 1024
const IMAGE_ACCEPT = 'image/jpeg,image/png,.jpg,.jpeg,.png'

function statusBadgeStyle(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'open') {
    return { background: '#14532d', color: '#dcfce7', border: '1px solid #22c55e' }
  }
  if (s === 'replied') {
    return { background: '#713f12', color: '#fef9c3', border: '1px solid #eab308' }
  }
  if (s === 'closed') {
    return { background: '#450a0a', color: '#fecaca', border: '1px solid #ef4444' }
  }
  return { background: '#334155', color: '#e2e8f0', border: '1px solid #64748b' }
}

export default function StudentInquiries() {
  function isInquiryLocked(row) {
    const status = String(row?.status || '').toLowerCase()
    return status === 'replied' || status === 'closed' || Boolean(row?.reply)
  }

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
  const [expandedText, setExpandedText] = useState({})
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [imageError, setImageError] = useState('')
  const [viewerImage, setViewerImage] = useState('')
  const [viewerTitle, setViewerTitle] = useState('')
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
    // Keep success visible after `load()` runs post-submit; only `msg` (errors) resets on refresh.
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

    // Email: format + optional domain list (stricter than backend; improves UX for students)
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
    const wasEditing = Boolean(editingId)
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
        imageFile,
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
      resetImageState()
      setErrors({})
      setTouched({ campusId: false, name: false, email: false, message: false })
      setSuccess(wasEditing ? 'Inquiry updated successfully.' : 'Inquiry submitted successfully.')
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
    setImageFile(null)
    setImagePreview(row.imageUrl || '')
    setImageError('')
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
    resetImageState()
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

  function toggleExpanded(key) {
    setExpandedText((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function renderExpandableText(value, key) {
    const content = String(value || '').trim()
    if (!content) return '—'
    const shouldCollapse = content.length > LONG_TEXT_PREVIEW_LIMIT
    const expanded = Boolean(expandedText[key])
    const visibleText = shouldCollapse && !expanded
      ? `${content.slice(0, LONG_TEXT_PREVIEW_LIMIT).trimEnd()}...`
      : content
    return (
      <div className="inquiry-long-text">
        <span className="inquiry-long-text-content">{visibleText}</span>
        {shouldCollapse && (
          <button
            type="button"
            className="inquiry-toggle-btn"
            onClick={() => toggleExpanded(key)}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    )
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
                alt="Selected inquiry preview"
                style={{ width: 120, height: 84, objectFit: 'cover', borderRadius: 8, border: '1px solid #334155' }}
              />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn-primary-action" disabled={!isFormValid || Boolean(imageError)}>
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
              <th style={{ width: '10%' }}>Image</th>
              <th style={{ width: '8%' }}>Date</th>
              <th style={{ width: '8%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && !loading && (
              <tr>
                <td colSpan={9}>No inquiries yet.</td>
              </tr>
            )}
            {list.map((row) => {
              const locked = isInquiryLocked(row)
              return (
              <tr
                key={row._id}
                style={locked ? { background: 'rgba(15, 23, 42, 0.42)', opacity: 0.86 } : undefined}
              >
                <td style={{ whiteSpace: 'nowrap' }}>{row.campusId || '—'}</td>
                <td style={{ wordBreak: 'break-word' }}>{row.from?.name || '—'}</td>
                <td style={{ wordBreak: 'break-word' }}>{row.from?.email || '—'}</td>
                <td className="inquiry-text-cell">
                  {renderExpandableText(row.message, `${row._id}-message`)}
                </td>
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
                    {row.status}
                  </span>
                </td>
                <td className="inquiry-text-cell">
                  {renderExpandableText(row.reply, `${row._id}-reply`)}
                </td>
                <td className="inquiry-text-cell">
                  {row.imageUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <img
                        src={row.imageUrl}
                        alt="Inquiry"
                        style={{ width: 64, height: 46, objectFit: 'cover', borderRadius: 6, border: '1px solid #334155' }}
                      />
                      <button
                        type="button"
                        className="btn-table-primary"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={() => {
                          setViewerImage(row.imageUrl)
                          setViewerTitle(row.subject || 'Inquiry Image')
                        }}
                      >
                        View Image
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>No image</span>
                  )}
                </td>
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
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    title={locked ? LOCKED_TOOLTIP : ''}
                  >
                    <button
                      type="button"
                      className="btn-table-primary"
                      onClick={() => startEdit(row)}
                      disabled={locked}
                      title={locked ? LOCKED_TOOLTIP : 'Edit inquiry'}
                      style={locked ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-delete-table"
                      onClick={() => removeRow(row)}
                      disabled={locked}
                      title={locked ? LOCKED_TOOLTIP : 'Delete inquiry'}
                      style={locked ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                    >
                      Delete
                    </button>
                  </div>
                  {locked && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#cbd5e1' }}>
                      [LOCKED] {LOCKED_TOOLTIP}
                    </div>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
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
            <img src={viewerImage} alt="Enlarged inquiry upload" className="image-modal-image" />
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
