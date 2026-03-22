import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { authApi } from '../../shared/api/client'

const TAB_SIGNIN = 'signin'
const TAB_REGISTER = 'register'

const initialRegisterForm = {
  fullName: '',
  email: '',
  phoneNumber: '',
  nic: '',
  address: '',
  gender: '',
  assignedHostel: '',
  password: '',
  confirmPassword: '',
}

function persistWardenSession(data) {
  localStorage.setItem('token', data.token)
  localStorage.setItem('role', data.role)
  if (data.user) {
    localStorage.setItem('wardenUser', JSON.stringify(data.user))
  }
}

function networkErrorMessage() {
  return 'Cannot reach API. Start the backend (port 5001): cd backend && npm run dev — or from project root: npm install && npm run dev.'
}

export default function WardenAuth() {
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState(TAB_SIGNIN)

  useEffect(() => {
    setTab(location.pathname === '/warden/register' ? TAB_REGISTER : TAB_SIGNIN)
  }, [location.pathname])

  const switchTab = (newTab) => {
    setTab(newTab)
    navigate(newTab === TAB_REGISTER ? '/warden/register' : '/warden/login', { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="w-full max-w-2xl">
        <div className="auth-card">
          <h1 className="auth-title">Warden</h1>
          <p className="auth-subtitle">
            {tab === TAB_SIGNIN ? 'Sign in to your warden dashboard' : 'Create an account if you are not registered yet'}
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              onClick={() => switchTab(TAB_SIGNIN)}
              className={`auth-tab ${tab === TAB_SIGNIN ? 'auth-tab-active' : 'auth-tab-inactive'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchTab(TAB_REGISTER)}
              className={`auth-tab ${tab === TAB_REGISTER ? 'auth-tab-active' : 'auth-tab-inactive'}`}
            >
              Register
            </button>
          </div>

          {tab === TAB_SIGNIN ? (
            <WardenSignInForm onSuccess={() => navigate('/warden')} />
          ) : (
            <WardenRegisterForm onSuccess={() => navigate('/warden')} />
          )}

          <p className="auth-footer-secondary mt-6">
            <Link to="/" className="auth-link">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function WardenSignInForm({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.wardenLogin(email, password)
      persistWardenSession(data)
      onSuccess()
    } catch (err) {
      const msg = err.message || 'Sign in failed'
      if (
        msg === 'Failed to fetch' ||
        msg === 'Not Found' ||
        msg.includes('NetworkError') ||
        msg.includes('ECONNRESET')
      ) {
        setError(networkErrorMessage())
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <form onSubmit={handleSubmit} className="auth-form">
        <div>
          <label htmlFor="warden-login-email" className="auth-label">Email</label>
          <input
            id="warden-login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            placeholder="warden@example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="warden-login-password" className="auth-label">Password</label>
          <input
            id="warden-login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            placeholder="••••••••"
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-submit">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </>
  )
}

function WardenRegisterForm({ onSuccess }) {
  const [form, setForm] = useState(initialRegisterForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phoneNumber,
        nic: form.nic,
        address: form.address,
        gender: form.gender,
        assignedHostel: form.assignedHostel,
        password: form.password,
      }

      const data = await authApi.wardenSignup(payload)
      persistWardenSession(data)
      setSuccess('Account created. Redirecting...')
      setForm(initialRegisterForm)
      onSuccess()
    } catch (err) {
      const msg = err.message || 'Warden registration failed'
      if (
        msg === 'Failed to fetch' ||
        msg === 'Not Found' ||
        msg.includes('NetworkError') ||
        msg.includes('ECONNRESET')
      ) {
        setError(networkErrorMessage())
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {success && <p className="mb-4 text-sm text-primary-800 bg-primary-50 px-3 py-2 rounded-xl border border-primary-100">{success}</p>}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="warden-fullName" className="auth-label">Full name</label>
          <input
            id="warden-fullName"
            name="fullName"
            type="text"
            value={form.fullName}
            onChange={handleChange}
            className="auth-input"
            placeholder="Warden full name"
            required
          />
        </div>

        <div>
          <label htmlFor="warden-email" className="auth-label">Email</label>
          <input
            id="warden-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="auth-input"
            placeholder="warden@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="warden-phone" className="auth-label">Phone number</label>
          <input
            id="warden-phone"
            name="phoneNumber"
            type="tel"
            value={form.phoneNumber}
            onChange={handleChange}
            className="auth-input"
            placeholder="0771234567"
            required
          />
        </div>

        <div>
          <label htmlFor="warden-nic" className="auth-label">NIC</label>
          <input
            id="warden-nic"
            name="nic"
            type="text"
            value={form.nic}
            onChange={handleChange}
            className="auth-input"
            placeholder="NIC number"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="warden-address" className="auth-label">Address</label>
          <textarea
            id="warden-address"
            name="address"
            value={form.address}
            onChange={handleChange}
            className="auth-input"
            placeholder="Warden address"
            rows={3}
            required
          />
        </div>

        <div>
          <label htmlFor="warden-gender" className="auth-label">Gender</label>
          <select
            id="warden-gender"
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="auth-input"
            required
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="warden-hostel" className="auth-label">Assigned hostel</label>
          <input
            id="warden-hostel"
            name="assignedHostel"
            type="text"
            value={form.assignedHostel}
            onChange={handleChange}
            className="auth-input"
            placeholder="North Hall"
            required
          />
        </div>

        <div>
          <label htmlFor="warden-password" className="auth-label">Password</label>
          <input
            id="warden-password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="auth-input"
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </div>

        <div>
          <label htmlFor="warden-confirmPassword" className="auth-label">Confirm password</label>
          <input
            id="warden-confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            className="auth-input"
            placeholder="Repeat password"
            required
          />
        </div>

        <div className="md:col-span-2 mt-2">
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? 'Registering...' : 'Register'}
          </button>
        </div>
      </form>
    </>
  )
}
