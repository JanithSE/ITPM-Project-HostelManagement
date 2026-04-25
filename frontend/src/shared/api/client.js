// VIVA: Frontend–backend connection (this file is the main “join” layer)
// -------------------------------------------------------------------
// 1) API_BASE: In dev, Vite proxies /api -> backend (e.g. port 5001). In prod, VITE_API_URL can point
//    to a full API origin. All requests start here, then go to routes like /api/maintenance, /api/inquiry.
// 2) apiFetch: JSON + JWT (Bearer token) for most calls.
// 3) apiPostForm / apiFormWithMethod: multipart/form-data (no JSON Content-Type) for image uploads; field
//    name is "image" to match multer in backend/middleware/upload.js.
// 4) maintenanceApi / inquiryApi: thin wrappers; React pages call only these, not raw URLs.
// -------------------------------------------------------------------
// Use relative /api in dev (proxied to backend); set VITE_API_URL for production
const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('token')
}

const BACKEND_HINT =
  'Start the API in another terminal: cd backend && npm run dev (must listen on port 5001). Keep this frontend terminal running.'

function mapNetworkError(err) {
  const msg = err?.message || ''
  if (msg === 'Failed to fetch' || msg.includes('NetworkError') || err?.name === 'TypeError') {
    return new Error(`Cannot reach the server. ${BACKEND_HINT}`)
  }
  return err
}

/** Vite proxy returns 500/502 when backend is down; body is often not JSON — avoid misleading "Internal Server Error". */
function errorFromResponse(res, text, data) {
  const apiMsg = typeof data?.error === 'string' && data.error.trim() ? data.error.trim() : ''
  const apiMsg2 = typeof data?.message === 'string' && data.message.trim() ? data.message.trim() : ''
  if (apiMsg) return apiMsg
  if (apiMsg2) return apiMsg2

  const raw = String(text || '')
  const lower = raw.toLowerCase()
  if (
    res.status === 502 ||
    res.status === 503 ||
    res.status === 504 ||
    (lower.includes('econnrefused') || lower.includes('aggregateerror')) ||
    (res.status === 500 && (!raw.trim() || lower.includes('proxy error') || lower.includes('vite')))
  ) {
    return `Backend not running or not reachable on port 5001. ${BACKEND_HINT}`
  }

  if (res.status === 500 && !apiMsg && !apiMsg2) {
    return `Server error. If the login just failed, ${BACKEND_HINT}`
  }

  const trimmed = raw.trim()
  if (trimmed && trimmed.length < 1000 && !trimmed.startsWith('<') && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return trimmed
  }

  return res.statusText || `Request failed (${res.status})`
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, { ...options, headers })
  } catch (err) {
    throw mapNetworkError(err)
  }

  const text = await res.text()
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch { }
  }

  if (!res.ok) {
    throw new Error(errorFromResponse(res, text, data))
  }

  return data
}

function parseFilename(contentDisposition, fallbackName) {
  if (!contentDisposition) return fallbackName
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]).replace(/["]/g, '')
  const basicMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  if (basicMatch?.[1]) return basicMatch[1]
  return fallbackName
}

export async function apiFetchBlob(path, options = {}, fallbackName = 'download.bin') {
  const url = `${API_BASE}${path}`
  const headers = {
    ...options.headers,
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, { ...options, headers })
  } catch (err) {
    throw mapNetworkError(err)
  }

  if (!res.ok) {
    const text = await res.text()
    let data = {}
    if (text) {
      try {
        data = JSON.parse(text)
      } catch { }
    }
    throw new Error(errorFromResponse(res, text, data))
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  return {
    blob,
    filename: parseFilename(disposition, fallbackName),
    contentType: res.headers.get('Content-Type') || blob.type || 'application/octet-stream',
  }
}

function parseFormResponse(res, text) {
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch { }

  if (!res.ok) {
    throw new Error(errorFromResponse(res, text, data))
  }

  return data
}

export async function apiPostForm(path, formData) {
  const url = `${API_BASE}${path}`
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { method: 'POST', headers, body: formData })
  const text = await res.text()
  return parseFormResponse(res, text)
}

export async function apiFormWithMethod(path, formData, method = 'POST') {
  const url = `${API_BASE}${path}`
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { method, headers, body: formData })
  const text = await res.text()
  return parseFormResponse(res, text)
}

// Build FormData for POST/PUT; backend expects multipart for create/update with optional "image" file.
function appendIfPresent(formData, key, value) {
  if (value == null) return
  formData.append(key, String(value))
}

// Maintenance: maps to createMaintenance / updateMyMaintenance in maintenanceController (fields + file).
function toMaintenanceFormData(payload = {}) {
  const form = new FormData()
  appendIfPresent(form, 'title', payload.title)
  appendIfPresent(form, 'description', payload.description)
  appendIfPresent(form, 'location', payload.location)
  appendIfPresent(form, 'priority', payload.priority)
  if (payload.imageFile instanceof File) {
    form.append('image', payload.imageFile)
  }
  return form
}

// Inquiry: maps to createInquiry / updateMyInquiry in inquiryController (fields + file).
function toInquiryFormData(payload = {}) {
  const form = new FormData()
  appendIfPresent(form, 'campusId', payload.campusId)
  appendIfPresent(form, 'subject', payload.subject)
  appendIfPresent(form, 'message', payload.message)
  if (payload.imageFile instanceof File) {
    form.append('image', payload.imageFile)
  }
  return form
}

/* ================= APIs ================= */

export const authApi = {
  studentSignup: (name, email, password) =>
    apiFetch('/auth/student-signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  studentLogin: (email, password) =>
    apiFetch('/auth/student-login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  adminLogin: (username, password) =>
    apiFetch('/auth/admin-login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  wardenLogin: (email, password) =>
    apiFetch('/auth/warden-login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  wardenSignup: (payload) =>
    apiFetch('/auth/warden-signup', { method: 'POST', body: JSON.stringify(payload) }),
  verifyOtp: (email, otp, purpose = 'registration') =>
    apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp, purpose }) }),
  forgotPassword: (email) =>
    apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email, resetToken, password) =>
    apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, resetToken, password }),
    }),
  me: () => apiFetch('/auth/me'),
  patchMe: (payload) =>
    apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Backward-compatible aliases used by some auth screens.
  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
}

export const hostelApi = {
  listHostels: () => apiFetch('/hostels'),
  createHostel: (formData) => apiPostForm('/hostels', formData),
  updateHostel: (id, formData) => apiFormWithMethod(`/hostels/${id}`, formData, 'PATCH'),
  deleteHostel: (id) => apiFetch(`/hostels/${id}`, { method: 'DELETE' }),
}

// Maintenance module — see backend: routes/maintenance.js + controllers/maintenanceController.js
export const maintenanceApi = {
  create: (payload) =>
    apiPostForm('/maintenance', toMaintenanceFormData(payload)),
  myList: () => apiFetch('/maintenance/my'),
  updateMine: (id, payload) =>
    apiFormWithMethod(`/maintenance/${id}/my`, toMaintenanceFormData(payload), 'PUT'),
  removeMine: (id) =>
    apiFetch(`/maintenance/${id}/my`, { method: 'DELETE' }),
  listAll: () => apiFetch('/maintenance'),
  updateStatus: (id, status) =>
    apiFetch(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
}

// Inquiry module — see backend: routes/inquiry.js + controllers/inquiryController.js
export const inquiryApi = {
  create: (payload) =>
    apiPostForm('/inquiry', toInquiryFormData(payload)),
  myList: () => apiFetch('/inquiry/my'),
  updateMine: (id, payload) =>
    apiFormWithMethod(`/inquiry/${id}/my`, toInquiryFormData(payload), 'PUT'),
  removeMine: (id) =>
    apiFetch(`/inquiry/${id}/my`, { method: 'DELETE' }),
  listAll: () => apiFetch('/inquiry'),
  reply: (id, reply) =>
    apiFetch(`/inquiry/${id}/reply`, { method: 'PUT', body: JSON.stringify({ reply }) }),
  comment: (id, text) =>
    apiFetch(`/inquiry/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
}

export const roomApi = {
  list: () => apiFetch('/rooms'),
  listDetails: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.hostelId) qs.set('hostelId', String(params.hostelId))
    if (params.statusesToCount) qs.set('statusesToCount', String(params.statusesToCount))
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return apiFetch(`/rooms/details${suffix}`)
  },
  create: (payload) =>
    apiFetch('/rooms', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) =>
    apiFetch(`/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  delete: (id) =>
    apiFetch(`/rooms/${id}`, { method: 'DELETE' }),
}

export const bookingApi = {
  list: () => apiFetch('/bookings'),
  create: (payload) =>
    apiFetch('/bookings', { method: 'POST', body: JSON.stringify(payload) }),
  createDetailed: (formData) => apiPostForm('/bookings', formData),
  update: (id, payload) =>
    apiFetch(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  approve: (id) =>
    apiFetch(`/bookings/${id}/approve`, { method: 'PUT' }),
  reject: (id, payload = {}) =>
    apiFetch(`/bookings/${id}/reject`, { method: 'PUT', body: JSON.stringify(payload) }),
  reviewDocument: (id, documentKey, status, note = '') =>
    apiFetch(`/bookings/${id}/documents/${documentKey}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    }),
  delete: (id) =>
    apiFetch(`/bookings/${id}`, { method: 'DELETE' }),
  export: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.type) qs.set('type', String(params.type))
    if (params.range) qs.set('range', String(params.range))
    if (params.dateField) qs.set('dateField', String(params.dateField))
    if (params.from) qs.set('from', String(params.from))
    if (params.to) qs.set('to', String(params.to))
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    const ext = params.type === 'pdf' ? 'pdf' : 'xlsx'
    return apiFetchBlob(`/export/bookings${suffix}`, { method: 'GET' }, `bookings-export.${ext}`)
  },
}

export const bookingChatApi = {
  sendMessage: ({ message, conversationId }) =>
    apiFetch('/chat/booking/message', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
    }),
  getHistory: (conversationId) => apiFetch(`/chat/booking/history/${conversationId}`),
}

export const paymentApi = {
  listMine: () => apiFetch('/payments/my'),
  listAdmin: () => apiFetch('/payments/admin'),
  create: (formData) => apiPostForm('/payments', formData),
}

export const paymentNotificationApi = {
  listMine: () => apiFetch('/payment-notifications/my'),
  markRead: (id) => apiFetch(`/payment-notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => apiFetch('/payment-notifications/read-all', { method: 'PUT' }),
  remove: (id) => apiFetch(`/payment-notifications/${id}`, { method: 'DELETE' }),
}

// Student: inquiry-reply notifications (see backend/routes/notifications.js, models/Notification.js)
export const notificationApi = {
  listMine: () => apiFetch('/notifications'),
  markRead: (id) => apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),
}

export const latepassApi = {
  listMine: () => apiFetch('/latepass/my'),
  listAdmin: () => apiFetch('/latepass/admin'),
  create: (formData) => apiPostForm('/latepass', formData),
}

export const latePassNotificationApi = {
  listMine: () => apiFetch('/latepass-notifications/my'),
  markRead: (id) => apiFetch(`/latepass-notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => apiFetch('/latepass-notifications/read-all', { method: 'PUT' }),
}

export const userApi = {
  list: () => apiFetch('/users'),
  create: (payload) =>
    apiFetch('/users', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) =>
    apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  delete: (id) =>
    apiFetch(`/users/${id}`, { method: 'DELETE' }),
}