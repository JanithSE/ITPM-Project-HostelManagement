import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../shared/api/client'

function RoleIcon({ roleName, spinning = false }) {
  const icon = roleName === 'student' ? '🎓' : roleName === 'admin' ? '🛡️' : '🏠'
  return (
    <span
      aria-hidden
      className={[
        'inline-block transition-transform duration-300',
        spinning ? 'rotate-[360deg]' : '',
      ].join(' ')}
    >
      {icon}
    </span>
  )
}

export default function RoleSelectLogin() {
  const navigate = useNavigate()
  const [role, setRole] = useState('student') // 'student' | 'warden' | 'admin'
  const [spinningRole, setSpinningRole] = useState('')

  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'signup' (student only)

  const [email, setEmail] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [studentName, setStudentName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Keep non-student roles on Sign in.
    if (role !== 'student') setAuthMode('signin')
  }, [role])

  function handleRoleClick(nextRole) {
    setRole(nextRole)
    setSpinningRole(nextRole)
    setTimeout(() => setSpinningRole(''), 320)
  }

  function validateFullName(input) {
    const normalized = String(input || '').trim()
    if (!normalized) return 'Full name is required'
    if (normalized.length < 3) return 'Full name must be at least 3 characters'
    if (!/^[A-Za-z ]+$/.test(normalized)) return 'Full name can contain only letters and spaces'
    return null
  }

  function roleTabClass(roleName) {
    const base = 'auth-pro-role-btn inline-flex items-center gap-1.5'
    return `${base} ${role === roleName ? 'auth-pro-role-btn-active' : 'auth-pro-role-btn-inactive'} ${
      spinningRole === roleName ? 'animate-none' : ''
    }`
  }

  function modeTabClass(modeName) {
    const base = 'auth-pro-mode-btn'
    return `${base} ${authMode === modeName ? 'auth-pro-mode-btn-active' : 'auth-pro-mode-btn-inactive'}`
  }

  function submitBtnClass() {
    return 'auth-pro-submit'
  }

  const panelSub =
    role === 'student' && authMode === 'signup'
      ? 'Create your account in a minute — then book your room.'
      : role === 'student'
        ? 'Sign in with your student email to open your portal.'
        : role === 'warden'
          ? 'Use your warden credentials to manage hostel operations.'
          : 'Administrator access — sign in with your username.'

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
                <span>UniHostel</span>
              </div>
              <h2 className="auth-pro-brand-title">UniHostel Access</h2>
              <p className="auth-pro-brand-subtitle">
                Secure sign in for students, wardens and administrators — one tidy place for bookings and updates.
              </p>
              <ul className="auth-pro-brand-list">
                <li className="auth-pro-brand-item">
                  <span className="auth-pro-brand-check" aria-hidden>
                    ✓
                  </span>
                  <span>Track bookings and hostel updates in one dashboard.</span>
                </li>
                <li className="auth-pro-brand-item">
                  <span className="auth-pro-brand-check" aria-hidden>
                    ✓
                  </span>
                  <span>Role-based access for safer operations.</span>
                </li>
                <li className="auth-pro-brand-item">
                  <span className="auth-pro-brand-check" aria-hidden>
                    ✓
                  </span>
                  <span>Fast, clear sign-in — pick your role and go.</span>
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
                <h1 className="auth-pro-heading">
                  {role === 'student' && authMode === 'signup' ? 'Join UniHostel' : 'Welcome back'}
                </h1>
                <p className="auth-pro-subheading !mt-0">{panelSub}</p>
              </div>
            </div>
            <p className="auth-pro-subheading mt-3 border-b border-slate-200/90 pb-4 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-500">
              Step 1 — Choose your role {role === 'student' ? '• Step 2 — Sign in or register' : ''}
            </p>

            <div className="auth-pro-role-row">
            <button
              type="button"
              onClick={() => handleRoleClick('admin')}
              className={roleTabClass('admin')}
            >
              <RoleIcon roleName="admin" spinning={spinningRole === 'admin'} />
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleRoleClick('student')}
              className={roleTabClass('student')}
            >
              <RoleIcon roleName="student" spinning={spinningRole === 'student'} />
              Student
            </button>
            <button
              type="button"
              onClick={() => handleRoleClick('warden')}
              className={roleTabClass('warden')}
            >
              <RoleIcon roleName="warden" spinning={spinningRole === 'warden'} />
              Warden
            </button>
            </div>

            {role === 'student' && (
              <div className="auth-pro-mode-row">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={modeTabClass('signin')}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={modeTabClass('signup')}
              >
                Sign up
              </button>
              </div>
            )}

            {error && <p className="auth-pro-error" role="alert">{error}</p>}

            <form
            onSubmit={async (e) => {
              e.preventDefault()
              setError('')
              setLoading(true)
              try {
                if (role === 'student') {
                  if (authMode === 'signup') {
                    const fullNameError = validateFullName(studentName)
                    if (fullNameError) {
                      setError(fullNameError)
                      return
                    }
                    if (password !== confirmPassword) {
                      setError('Passwords do not match')
                      return
                    }
                    if (!acceptTerms) {
                      setError('Please accept Terms & Privacy Policy')
                      return
                    }
                    await authApi.register(studentName, email, password)
                    navigate('/verify-otp', { state: { email, purpose: 'registration' } })
                    return
                  }

                  const data = await authApi.login(email, password)
                  localStorage.setItem('token', data.token)
                  localStorage.setItem('role', data.role)
                  if (data?.user?.name) localStorage.setItem('studentName', data.user.name)
                  localStorage.setItem('studentEmail', data?.user?.email || email)
                  navigate('/student/hostels')
                  return
                }

                if (role === 'warden') {
                  const data = await authApi.wardenLogin(email, password)
                  localStorage.setItem('token', data.token)
                  localStorage.setItem('role', data.role)
                  if (data?.user) localStorage.setItem('wardenUser', JSON.stringify(data.user))
                  navigate('/warden')
                  return
                }

                // admin
                const data = await authApi.adminLogin(adminUsername, password)
                localStorage.setItem('token', data.token)
                localStorage.setItem('role', data.role)
                navigate('/admin')
              } catch (err) {
                setError(err.message || 'Login failed')
              } finally {
                setLoading(false)
              }
            }}
            className="auth-pro-form"
          >
            {role === 'student' && authMode === 'signup' && (
              <div>
                <label htmlFor="student-name" className="auth-pro-label">Full name</label>
                <input
                  id="student-name"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="auth-pro-input"
                  placeholder="Your name"
                  required
                  minLength={3}
                  pattern="^[A-Za-z ]+$"
                  title="Use letters and spaces only (minimum 3 characters)"
                />
              </div>
            )}

            {role === 'admin' ? (
              <div>
                <label htmlFor="admin-username" className="auth-pro-label">Username</label>
                <input
                  id="admin-username"
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="auth-pro-input"
                  placeholder="admin"
                  required
                />
              </div>
            ) : (
              <div>
                <label htmlFor="role-email" className="auth-pro-label">Email</label>
                <input
                  id="role-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-pro-input"
                  placeholder="m@example.com"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="role-password" className="auth-pro-label">Password</label>
              <div className="auth-pro-input-wrap">
                <input
                  id="role-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-pro-input pr-[4.25rem]"
                  placeholder="Enter your password"
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

            {role === 'student' && authMode === 'signup' && (
              <div>
                <label htmlFor="confirm-password" className="auth-pro-label">Confirm password</label>
                <div className="auth-pro-input-wrap">
                  <input
                    id="confirm-password"
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
            )}

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
              <button
                type="button"
                className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot password?
              </button>
            </div>

            {role === 'student' && authMode === 'signup' && (
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
            )}

            <button type="submit" disabled={loading} className={submitBtnClass()}>
              {loading
                ? 'Please wait...'
                : role === 'student' && authMode === 'signup'
                  ? 'Create account'
                  : `Login as ${role[0].toUpperCase() + role.slice(1)}`}
            </button>
            </form>

            <p className="auth-pro-trust">
              <span aria-hidden className="text-emerald-600 dark:text-emerald-400">
                ●
              </span>
              Secure session · your data is encrypted in transit
            </p>

            <p className="auth-pro-footer">
              <button type="button" className="auth-pro-link" onClick={() => navigate('/')}>
              Back to home
            </button>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

