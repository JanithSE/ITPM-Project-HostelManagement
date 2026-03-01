import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { authApi } from '../api/client'

const TAB_SIGNIN = 'signin'
const TAB_SIGNUP = 'signup'

export default function StudentAuth() {
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState(TAB_SIGNIN)

  // Sync tab with route: /signup → signup tab, /login → signin tab
  useEffect(() => {
    setTab(location.pathname === '/signup' ? TAB_SIGNUP : TAB_SIGNIN)
  }, [location.pathname])

  const switchTab = (newTab) => {
    setTab(newTab)
    navigate(newTab === TAB_SIGNUP ? '/signup' : '/login', { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="w-full max-w-md">
        <div className="auth-card">
          <h1 className="auth-title">Student</h1>
          <p className="auth-subtitle">
            {tab === TAB_SIGNIN ? 'Sign in to your account' : 'Create an account to book hostels'}
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
              onClick={() => switchTab(TAB_SIGNUP)}
              className={`auth-tab ${tab === TAB_SIGNUP ? 'auth-tab-active' : 'auth-tab-inactive'}`}
            >
              Sign up
            </button>
          </div>

          {tab === TAB_SIGNIN ? (
            <SignInForm onSuccess={() => navigate('/student/hostels')} />
          ) : (
            <SignUpForm onSuccess={() => navigate('/student/hostels')} />
          )}

          <p className="auth-footer-secondary mt-6">
            <Link to="/" className="auth-link">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function SignInForm({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.studentLogin(email, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.role)
      onSuccess()
    } catch (err) {
      const msg = err.message || 'Sign in failed'
      if (msg === 'Failed to fetch' || msg === 'Not Found' || msg.includes('NetworkError')) {
        setError('Cannot reach server. Make sure the backend is running on port 5001.')
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
          <label htmlFor="login-email" className="auth-label">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="login-password" className="auth-label">Password</label>
          <input
            id="login-password"
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

function SignUpForm({ onSuccess }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const data = await authApi.studentSignup(name, email, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.role)
      onSuccess()
    } catch (err) {
      const msg = err.message || 'Sign up failed'
      if (msg === 'Failed to fetch' || msg === 'Not Found' || msg.includes('NetworkError')) {
        setError('Cannot reach server. Make sure the backend is running on port 5001.')
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
          <label htmlFor="signup-name" className="auth-label">Full name</label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="auth-input"
            placeholder="Your name"
            required
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="auth-label">Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="auth-label">Password</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            placeholder="At least 6 characters"
            required
            minLength={6}
          />
        </div>
        <div>
          <label htmlFor="signup-confirm" className="auth-label">Confirm password</label>
          <input
            id="signup-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="auth-input"
            placeholder="Repeat password"
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-submit">
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
    </>
  )
}
