// Use relative /api in dev (proxied to backend); set VITE_API_URL for production
const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('token')
}

function mapNetworkError(err) {
  const msg = err?.message || ''
  if (msg === 'Failed to fetch' || msg.includes('NetworkError') || err?.name === 'TypeError') {
    return new Error(
      'Cannot reach the server. Start the backend on port 5001 (e.g. from the project root: npm run dev, or cd backend && npm run dev) while the Vite app is running.'
    )
  }
  return err
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
    } catch {
      /* non-JSON body (e.g. proxy HTML error) */
    }
  }
  if (!res.ok) {
    const fromBody =
      typeof data.error === 'string' && data.error.trim()
        ? data.error.trim()
        : typeof data.message === 'string' && data.message.trim()
          ? data.message.trim()
          : ''
    if (fromBody) throw new Error(fromBody)
    if (res.status === 500) {
      throw new Error(
        'Server error. Check that MongoDB is connected and see the backend terminal for details.'
      )
    }
    const hint =
      (text && !text.startsWith('{') ? text.slice(0, 160).trim() : '') ||
      res.statusText ||
      `Request failed (${res.status})`
    throw new Error(hint)
  }
  return data
}

function parseFormResponse(res, text) {
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }
  if (!res.ok) {
    const apiErr = typeof data.error === 'string' && data.error.trim() ? data.error.trim() : null
    if (apiErr) throw new Error(apiErr)
    if (res.status === 500) {
      throw new Error(
        'Server error. Check that MongoDB is connected and see the backend terminal for details.'
      )
    }
    throw new Error(res.statusText || 'Request failed')
  }
  return data
}

/** POST multipart (e.g. payment proof). Do not set Content-Type — browser sets boundary. */
export async function apiPostForm(path, formData) {
  const url = `${API_BASE}${path}`
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, { method: 'POST', headers, body: formData })
  } catch (err) {
    throw mapNetworkError(err)
  }
  const text = await res.text()
  return parseFormResponse(res, text)
}

/** Multipart with configurable method (e.g. PATCH for hostel update with image). */
export async function apiFormWithMethod(path, formData, method = 'POST') {
  const url = `${API_BASE}${path}`
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, { method, headers, body: formData })
  } catch (err) {
    throw mapNetworkError(err)
  }
  const text = await res.text()
  return parseFormResponse(res, text)
}

export const paymentApi = {
  listMine: () => apiFetch('/payments/my'),
  listAdmin: () => apiFetch('/payments/admin'),
  create: (formData) => apiPostForm('/payments', formData),
}

export const latepassApi = {
  listMine: () => apiFetch('/latepass/my'),
  listAdmin: () => apiFetch('/latepass/admin'),
  create: (formData) => apiPostForm('/latepass', formData),
}

export const authApi = {
  register: (name, email, password) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  verifyOtp: (email, otp, purpose = 'registration') =>
    apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp, purpose }) }),
  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  forgotPassword: (email) =>
    apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email, otp, password) =>
    apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp, password }) }),
  studentSignup: (name, email, password) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  studentLogin: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  adminLogin: (username, password) =>
    apiFetch('/auth/admin-login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  wardenLogin: (email, password) =>
    apiFetch('/auth/warden-login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  wardenSignup: (payload) =>
    apiFetch('/auth/warden-signup', { method: 'POST', body: JSON.stringify(payload) }),
}

export const hostelApi = {
  listHostels: () => apiFetch('/hostels'),
  /** FormData: name, location, description, totalRooms, availableRooms, pricePerBed, amenities (JSON array string), optional image */
  createHostel: (formData) => apiPostForm('/hostels', formData),
  updateHostel: (id, formData) => apiFormWithMethod(`/hostels/${id}`, formData, 'PATCH'),
  deleteHostel: (id) =>
    apiFetch(`/hostels/${id}`, { method: 'DELETE' }),
}

<<<<<<< HEAD
export const maintenanceApi = {
  create: (payload) =>
    apiFetch('/maintenance', { method: 'POST', body: JSON.stringify(payload) }),
  myList: () => apiFetch('/maintenance/my'),
  listAll: () => apiFetch('/maintenance'),
  updateStatus: (id, status) =>
    apiFetch(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
}

export const inquiryApi = {
  create: (payload) => apiFetch('/inquiry', { method: 'POST', body: JSON.stringify(payload) }),
  myList: () => apiFetch('/inquiry/my'),
  listAll: () => apiFetch('/inquiry'),
  reply: (id, replyText) =>
    apiFetch(`/inquiry/${id}/reply`, { method: 'PUT', body: JSON.stringify({ reply: replyText }) }),
=======
export const roomApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/rooms${qs ? `?${qs}` : ''}`)
  },
  create: (payload) => apiFetch('/rooms', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => apiFetch(`/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  delete: (id) => apiFetch(`/rooms/${id}`, { method: 'DELETE' }),
  listDetails: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/rooms/details${qs ? `?${qs}` : ''}`)
  },
}

export const bookingApi = {
  list: () => apiFetch('/bookings'),
  create: (payload) => apiFetch('/bookings', { method: 'POST', body: JSON.stringify(payload) }),
  createDetailed: (formData) => apiPostForm('/bookings', formData),
  update: (id, payload) => apiFetch(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  approve: (id) => apiFetch(`/bookings/${id}/approve`, { method: 'PUT' }),
  reject: (id, payload = {}) =>
    apiFetch(`/bookings/${id}/reject`, { method: 'PUT', body: JSON.stringify(payload) }),
  reviewDocument: (id, documentKey, status, note = '') =>
    apiFetch(`/bookings/${id}/documents/${documentKey}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    }),
  delete: (id) => apiFetch(`/bookings/${id}`, { method: 'DELETE' }),
}

export const notificationApi = {
  listMine: () => apiFetch('/notifications/my'),
  markRead: (id) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
}

export const userApi = {
  list: () => apiFetch('/users'),
  create: (payload) => apiFetch('/users', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  delete: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
>>>>>>> recovery-work
}
