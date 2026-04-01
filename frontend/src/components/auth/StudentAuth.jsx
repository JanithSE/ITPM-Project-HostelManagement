import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { authApi } from '../../shared/api/client'

const TAB_SIGNIN = 'signin'
const TAB_SIGNUP = 'signup'

export default function StudentAuth() {
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState(TAB_SIGNIN)

  // Sync tab with route: /signup or /register => signup tab; others => signin tab
  useEffect(() => {
    setTab(location.pathname === '/signup' || location.pathname === '/register' ? TAB_SIGNUP : TAB_SIGNIN)
  }, [location.pathname])

  const switchTab = (newTab) => {
    setTab(newTab)
    navigate(newTab === TAB_SIGNUP ? '/register' : '/student/login', { replace: true })
  }

  return (
    <div className="auth-pro-wrap">
      <div className="auth-pro-card">
        <div className="auth-pro-grid">
          <aside className="auth-pro-brand">
            <div className="auth-pro-brand-inner">
              <div className="auth-pro-brand-badge">
                <span className="auth-pro-brand-mark" aria-hidden>
                  UH
                </span>
                <span>Students</span>
              </div>
              <h2 className="auth-pro-brand-title">Student Portal</h2>
              <p className="auth-pro-brand-subtitle">
                {tab === TAB_SIGNIN
                  ? 'Sign in to manage bookings, your profile, payments, and late-pass requests in one calm dashboard.'
                  : 'Create your account and move from signup to room booking in just a few steps.'}
              </p>
              <ul className="auth-pro-brand-list">
                <li className="auth-pro-brand-item">
                  <span className="auth-pro-brand-check" aria-hidden>
                    ✓
                  </span>
                  <span>One account for booking, payments and notifications.</span>
                </li>
                <li className="auth-pro-brand-item">
                  <span className="auth-pro-brand-check" aria-hidden>
                    ✓
                  </span>
                  <span>Track booking approval status in real time.</span>
                </li>
                <li className="auth-pro-brand-item">
                  <span className="auth-pro-brand-check" aria-hidden>
                    ✓
                  </span>
                  <span>Secure access built for campus life.</span>
                </li>
              </ul>
            </div>
          </aside>
          <section className="auth-pro-panel">
            <div className="auth-pro-panel-header">
              <span className="auth-pro-panel-mark" aria-hidden>
                UH
              </span>
              <div>
                <h1 className="auth-pro-heading">{tab === TAB_SIGNIN ? 'Student sign in' : 'Create your account'}</h1>
                <p className="auth-pro-subheading !mt-0">
                  {tab === TAB_SIGNIN
                    ? 'Use the email you registered with — we will take you to Explore after login.'
                    : 'Pick a strong password and accept the terms to finish signup.'}
                </p>
              </div>
            </div>

            <div className="auth-pro-mode-row mt-5">
              <button
                type="button"
                onClick={() => switchTab(TAB_SIGNIN)}
                className={`auth-pro-mode-btn ${tab === TAB_SIGNIN ? 'auth-pro-mode-btn-active' : 'auth-pro-mode-btn-inactive'}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchTab(TAB_SIGNUP)}
                className={`auth-pro-mode-btn ${tab === TAB_SIGNUP ? 'auth-pro-mode-btn-active' : 'auth-pro-mode-btn-inactive'}`}
              >
                Sign up
              </button>
            </div>

            {tab === TAB_SIGNIN ? <SignInForm onSuccess={() => navigate('/student/hostels')} /> : <SignUpForm />}

            <p className="auth-pro-footer">
              <Link to="/" className="auth-pro-link">Back to home</Link>
            </p>
          </section>
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
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login(email, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.role)
      if (data?.user?.name) localStorage.setItem('studentName', data.user.name)
      localStorage.setItem('studentEmail', data?.user?.email || email)
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
      {error && <p className="auth-pro-error" role="alert">{error}</p>}
      <form onSubmit={handleSubmit} className="auth-pro-form">
        <div>
          <label htmlFor="login-email" className="auth-pro-label">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-pro-input"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="login-password" className="auth-pro-label">Password</label>
          <div className="auth-pro-input-wrap">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-pro-input pr-[4.25rem]"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="auth-pro-toggle"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Forgot password?
          </Link>
        </div>
        <button type="submit" disabled={loading} className="auth-pro-submit">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="auth-pro-trust">
        <span aria-hidden className="text-emerald-600 dark:text-emerald-400">
          ●
        </span>
        Secure session · your data is encrypted in transit
      </p>
    </>
  )
}

function SignUpForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

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
    if (!acceptTerms) {
      setError('Please accept Terms & Privacy Policy')
      return
    }
    setLoading(true)
    try {
      await authApi.register(name, email, password)
      navigate('/verify-otp', { state: { email, purpose: 'registration' } })
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
      {error && <p className="auth-pro-error" role="alert">{error}</p>}
      <form onSubmit={handleSubmit} className="auth-pro-form">
        <div>
          <label htmlFor="signup-name" className="auth-pro-label">Full name</label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="auth-pro-input"
            placeholder="Your name"
            required
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="auth-pro-label">Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-pro-input"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="auth-pro-label">Password</label>
          <div className="auth-pro-input-wrap">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-pro-input pr-[4.25rem]"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="auth-pro-toggle"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="signup-confirm" className="auth-pro-label">Confirm password</label>
          <div className="auth-pro-input-wrap">
            <input
              id="signup-confirm"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-pro-input pr-[4.25rem]"
              placeholder="Repeat password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="auth-pro-toggle"
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <label className="mt-1 inline-flex cursor-pointer items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
          />
          <span>
            I agree to the <span className="font-semibold text-primary-600 dark:text-primary-400">Terms</span> and{' '}
            <span className="font-semibold text-primary-600 dark:text-primary-400">Privacy Policy</span>.
          </span>
        </label>
        <button type="submit" disabled={loading} className="auth-pro-submit">
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
      <p className="auth-pro-trust">
        <span aria-hidden className="text-emerald-600 dark:text-emerald-400">
          ●
        </span>
        Secure session · your data is encrypted in transit
      </p>
    </>
  )
}
