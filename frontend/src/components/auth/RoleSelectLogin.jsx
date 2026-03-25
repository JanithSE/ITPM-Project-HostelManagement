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
    const base =
      'auth-tab flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-semibold transition-all duration-300 transform backdrop-blur-md'
    const inactive = 'bg-white/10 border-white/20 text-slate-700 dark:text-slate-100 hover:-translate-y-[2px] hover:bg-white/15'

    if (roleName === 'student') {
      return `${base} ${
        role === roleName
          ? 'bg-blue-500/15 border-blue-300/60 text-blue-900 shadow-[0_0_0_4px_rgba(59,130,246,0.10)] dark:text-blue-100 hover:bg-blue-500/20'
          : inactive
      } ${spinningRole === roleName ? 'animate-none' : ''}`
    }
    if (roleName === 'admin') {
      return `${base} ${
        role === roleName
          ? 'bg-red-500/15 border-red-300/60 text-red-900 shadow-[0_0_0_4px_rgba(239,68,68,0.10)] dark:text-red-100 hover:bg-red-500/20'
          : inactive
      }`
    }

    return `${base} ${
      role === roleName
        ? 'bg-emerald-500/15 border-emerald-300/60 text-emerald-900 shadow-[0_0_0_4px_rgba(16,185,129,0.10)] dark:text-emerald-100 hover:bg-emerald-500/20'
        : inactive
    }`
  }

  function modeTabClass(modeName) {
    const base =
      'auth-tab flex-1 px-3 py-2 rounded-2xl border text-sm font-semibold transition-all duration-300 transform backdrop-blur-md'
    const inactive = 'bg-white/10 border-white/20 text-slate-700 dark:text-slate-100 hover:-translate-y-[2px] hover:bg-white/15'
    return `${base} ${
      authMode === modeName
        ? 'bg-slate-900/10 border-slate-200/30 text-slate-900 shadow-[0_0_0_4px_rgba(15,23,42,0.08)] dark:text-slate-100'
        : inactive
    }`
  }

  function submitBtnClass() {
    const base =
      'w-full rounded-full px-5 py-3.5 text-sm font-semibold transition-all duration-300 transform border backdrop-blur-md disabled:opacity-60 disabled:cursor-not-allowed'
    if (role === 'student') {
      return `${base} bg-blue-500/15 border-blue-300/60 text-blue-900 hover:bg-blue-500/20 hover:-translate-y-[1px] hover:shadow-lg shadow-blue-500/10 dark:text-blue-100`
    }
    if (role === 'admin') {
      return `${base} bg-red-500/15 border-red-300/60 text-red-900 hover:bg-red-500/20 hover:-translate-y-[1px] hover:shadow-lg shadow-red-500/10 dark:text-red-100`
    }
    return `${base} bg-emerald-500/15 border-emerald-300/60 text-emerald-900 hover:bg-emerald-500/20 hover:-translate-y-[1px] hover:shadow-lg shadow-emerald-500/10 dark:text-emerald-100`
  }

  return (
    <div className="auth-page">
      <div className="w-full max-w-md">
        <div className="auth-card backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/60 dark:border-slate-800/60">
          <h1 className="auth-title">Login</h1>
          <p className="auth-subtitle">Login to access the system</p>

          <div className="mt-4 flex gap-3">
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
            <div className="mt-4 flex gap-2">
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

          {error && <p className="auth-error" role="alert">{error}</p>}

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
                    const data = await authApi.studentSignup(studentName, email, password)
                    localStorage.setItem('token', data.token)
                    localStorage.setItem('role', data.role)
                    if (data?.user?.name) localStorage.setItem('studentName', data.user.name)
                    navigate('/student/hostels')
                    return
                  }

                  const data = await authApi.studentLogin(email, password)
                  localStorage.setItem('token', data.token)
                  localStorage.setItem('role', data.role)
                  if (data?.user?.name) localStorage.setItem('studentName', data.user.name)
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
            className="auth-form"
          >
            {role === 'student' && authMode === 'signup' && (
              <div>
                <label htmlFor="student-name" className="auth-label">Full name</label>
                <input
                  id="student-name"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="auth-input"
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
                <label htmlFor="admin-username" className="auth-label">Username</label>
                <input
                  id="admin-username"
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="auth-input"
                  placeholder="admin"
                  required
                />
              </div>
            ) : (
              <div>
                <label htmlFor="role-email" className="auth-label">Email</label>
                <input
                  id="role-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  placeholder="m@example.com"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="role-password" className="auth-label">Password</label>
              <input
                id="role-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                placeholder="Enter your password"
                required
              />
            </div>

            {role === 'student' && authMode === 'signup' && (
              <div>
                <label htmlFor="confirm-password" className="auth-label">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input"
                  placeholder="Repeat password"
                  required
                />
              </div>
            )}

            <button type="submit" disabled={loading} className={submitBtnClass()}>
              {loading
                ? 'Please wait...'
                : role === 'student' && authMode === 'signup'
                  ? 'Create account'
                  : `Login as ${role[0].toUpperCase() + role.slice(1)}`}
            </button>
          </form>

          <p className="auth-footer-secondary mt-6">
            <button type="button" className="auth-link" onClick={() => navigate('/')}>
              Back to home
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

