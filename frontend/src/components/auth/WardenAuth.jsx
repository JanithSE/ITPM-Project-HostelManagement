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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const nameNoDigitRegex = /^[^\d]+$/
const phoneRegex = /^0\d{9}$/
const nicDigitsOnlyRegex = /^\d+$/

function fieldStyle(isDirty, error) {
  if (!isDirty) return undefined
  if (error) {
    return {
      borderColor: 'rgba(248, 113, 113, 0.75)',
      boxShadow: '0 0 0 1px rgba(248, 113, 113, 0.2)',
    }
  }
  return {
    borderColor: 'rgba(52, 211, 153, 0.9)',
    boxShadow: '0 0 0 1px rgba(52, 211, 153, 0.2)',
  }
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
  const [dirty, setDirty] = useState({ email: false, password: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const emailError = !email.trim()
    ? 'Email is required'
    : !emailRegex.test(String(email).trim())
      ? 'Enter a valid email address'
      : ''
  const passwordError = !password
    ? 'Password is required'
    : password.length < 8
      ? 'Password must be at least 8 characters'
      : ''
  const formHasErrors = Boolean(emailError || passwordError)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setDirty({ email: true, password: true })
    if (formHasErrors) return
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
            onChange={(e) => {
              setEmail(e.target.value)
              setDirty((d) => ({ ...d, email: true }))
            }}
            onBlur={() => setDirty((d) => ({ ...d, email: true }))}
            className="auth-input"
            placeholder="warden@example.com"
            required
            style={fieldStyle(dirty.email, emailError)}
          />
          {dirty.email && emailError ? <p className="mt-1 text-xs text-red-600">{emailError}</p> : null}
        </div>
        <div>
          <label htmlFor="warden-login-password" className="auth-label">Password</label>
          <input
            id="warden-login-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setDirty((d) => ({ ...d, password: true }))
            }}
            onBlur={() => setDirty((d) => ({ ...d, password: true }))}
            className="auth-input"
            placeholder="••••••••"
            required
            style={fieldStyle(dirty.password, passwordError)}
          />
          {dirty.password && passwordError ? <p className="mt-1 text-xs text-red-600">{passwordError}</p> : null}
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
  const [dirty, setDirty] = useState({
    fullName: false,
    email: false,
    phoneNumber: false,
    nic: false,
    address: false,
    gender: false,
    assignedHostel: false,
    password: false,
    confirmPassword: false,
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name } = e.target
    let value = e.target.value
    if (name === 'fullName') {
      // Prevent any numeric character in full name input.
      value = value.replace(/\d/g, '')
    }
    if (name === 'phoneNumber') {
      // Digits only, max 10 characters, must begin with 0.
      value = value.replace(/\D/g, '').slice(0, 10)
      if (value && !value.startsWith('0')) value = `0${value}`.slice(0, 10)
    }
    if (name === 'nic') {
      // Digits only for NIC input.
      value = value.replace(/\D/g, '').slice(0, 12)
    }
    setForm((prev) => ({ ...prev, [name]: value }))
    setDirty((prev) => ({ ...prev, [name]: true }))
  }

  const errors = {
    fullName: !form.fullName.trim()
      ? 'Full name is required'
      : !nameNoDigitRegex.test(form.fullName.trim())
        ? 'Name cannot contain numbers'
        : '',
    email: !form.email.trim()
      ? 'Email is required'
      : !emailRegex.test(form.email.trim())
        ? 'Enter a valid email address'
        : '',
    phoneNumber: !form.phoneNumber.trim()
      ? 'Phone number is required'
      : !phoneRegex.test(form.phoneNumber.trim())
        ? 'Phone number must start with 0 and be exactly 10 digits'
        : '',
    nic: !form.nic.trim()
      ? 'NIC is required'
      : !nicDigitsOnlyRegex.test(form.nic.trim())
        ? 'NIC can contain digits only'
        : '',
    address: !form.address.trim() ? 'Address is required' : '',
    gender: !form.gender.trim() ? 'Gender is required' : '',
    assignedHostel: !form.assignedHostel.trim() ? 'Assigned hostel is required' : '',
    password: !form.password
      ? 'Password is required'
      : form.password.length < 8
        ? 'Password must be at least 8 characters'
        : '',
    confirmPassword: !form.confirmPassword
      ? 'Confirm password is required'
      : form.confirmPassword !== form.password
        ? 'Passwords do not match'
        : '',
  }
  const hasValidationErrors = Object.values(errors).some(Boolean)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setDirty({
      fullName: true,
      email: true,
      phoneNumber: true,
      nic: true,
      address: true,
      gender: true,
      assignedHostel: true,
      password: true,
      confirmPassword: true,
    })
    if (hasValidationErrors) {
      setError('Please fix highlighted fields.')
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
            onBlur={() => setDirty((prev) => ({ ...prev, fullName: true }))}
            className="auth-input"
            placeholder="Warden full name"
            required
            style={fieldStyle(dirty.fullName, errors.fullName)}
          />
          {dirty.fullName && errors.fullName ? <p className="mt-1 text-xs text-red-600">{errors.fullName}</p> : null}
        </div>

        <div>
          <label htmlFor="warden-email" className="auth-label">Email</label>
          <input
            id="warden-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            onBlur={() => setDirty((prev) => ({ ...prev, email: true }))}
            className="auth-input"
            placeholder="warden@example.com"
            required
            style={fieldStyle(dirty.email, errors.email)}
          />
          {dirty.email && errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
        </div>

        <div>
          <label htmlFor="warden-phone" className="auth-label">Phone number</label>
          <input
            id="warden-phone"
            name="phoneNumber"
            type="tel"
            inputMode="numeric"
            pattern="0[0-9]{9}"
            maxLength={10}
            value={form.phoneNumber}
            onChange={handleChange}
            onBlur={() => setDirty((prev) => ({ ...prev, phoneNumber: true }))}
            onKeyDown={(e) => {
              if (e.ctrlKey || e.metaKey || e.altKey) return
              const allow = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
              if (allow.includes(e.key)) return
              if (/^\d$/.test(e.key)) return
              e.preventDefault()
            }}
            className="auth-input"
            placeholder="0771234567"
            required
            style={fieldStyle(dirty.phoneNumber, errors.phoneNumber)}
          />
          {dirty.phoneNumber && errors.phoneNumber ? <p className="mt-1 text-xs text-red-600">{errors.phoneNumber}</p> : null}
        </div>

        <div>
          <label htmlFor="warden-nic" className="auth-label">NIC</label>
          <input
            id="warden-nic"
            name="nic"
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={12}
            value={form.nic}
            onChange={handleChange}
            onBlur={() => setDirty((prev) => ({ ...prev, nic: true }))}
            onKeyDown={(e) => {
              if (e.ctrlKey || e.metaKey || e.altKey) return
              const allow = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
              if (allow.includes(e.key)) return
              if (/^\d$/.test(e.key)) return
              e.preventDefault()
            }}
            className="auth-input"
            placeholder="NIC number"
            required
            style={fieldStyle(dirty.nic, errors.nic)}
          />
          {dirty.nic && errors.nic ? <p className="mt-1 text-xs text-red-600">{errors.nic}</p> : null}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="warden-address" className="auth-label">Address</label>
          <textarea
            id="warden-address"
            name="address"
            value={form.address}
            onChange={handleChange}
            onBlur={() => setDirty((prev) => ({ ...prev, address: true }))}
            className="auth-input"
            placeholder="Warden address"
            rows={3}
            required
            style={fieldStyle(dirty.address, errors.address)}
          />
          {dirty.address && errors.address ? <p className="mt-1 text-xs text-red-600">{errors.address}</p> : null}
        </div>

        <div>
          <label htmlFor="warden-gender" className="auth-label">Gender</label>
          <select
            id="warden-gender"
            name="gender"
            value={form.gender}
            onChange={handleChange}
            onBlur={() => setDirty((prev) => ({ ...prev, gender: true }))}
            className="auth-input"
            required
            style={fieldStyle(dirty.gender, errors.gender)}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {dirty.gender && errors.gender ? <p className="mt-1 text-xs text-red-600">{errors.gender}</p> : null}
        </div>

        <div>
          <label htmlFor="warden-hostel" className="auth-label">Assigned hostel</label>
          <input
            id="warden-hostel"
            name="assignedHostel"
            type="text"
            value={form.assignedHostel}
            onChange={handleChange}
            onBlur={() => setDirty((prev) => ({ ...prev, assignedHostel: true }))}
            className="auth-input"
            placeholder="North Hall"
            required
            style={fieldStyle(dirty.assignedHostel, errors.assignedHostel)}
          />
          {dirty.assignedHostel && errors.assignedHostel ? <p className="mt-1 text-xs text-red-600">{errors.assignedHostel}</p> : null}
        </div>

        <div>
          <label htmlFor="warden-password" className="auth-label">Password</label>
          <input
            id="warden-password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            onBlur={() => setDirty((prev) => ({ ...prev, password: true }))}
            className="auth-input"
            placeholder="At least 8 characters"
            minLength={8}
            required
            style={fieldStyle(dirty.password, errors.password)}
          />
          {dirty.password && errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password}</p> : null}
        </div>

        <div>
          <label htmlFor="warden-confirmPassword" className="auth-label">Confirm password</label>
          <input
            id="warden-confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            onBlur={() => setDirty((prev) => ({ ...prev, confirmPassword: true }))}
            className="auth-input"
            placeholder="Repeat password"
            required
            style={fieldStyle(dirty.confirmPassword, errors.confirmPassword)}
          />
          {dirty.confirmPassword && errors.confirmPassword ? <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p> : null}
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
