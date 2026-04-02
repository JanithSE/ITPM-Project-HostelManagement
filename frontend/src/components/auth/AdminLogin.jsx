import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../shared/api/client'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.adminLogin(username, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.role)
      localStorage.setItem('adminUser', JSON.stringify({ username: String(username || '').trim() }))
      navigate('/admin/users')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-grid">
          <aside className="auth-hero">
            <div className="auth-hero-card">
              <div className="auth-hero-badge">
                <span className="auth-hero-mark" aria-hidden>
                  UH
                </span>
                <span>Admin Console</span>
              </div>

              <h2 className="auth-hero-title">Control UniHostel Operations</h2>
              <p className="auth-hero-subtitle">
                Securely manage users, bookings, hostels, and platform settings from one administrator workspace.
              </p>

              <ul className="auth-hero-list">
                <li className="auth-hero-item">
                  <span className="auth-hero-check" aria-hidden>
                    ✓
                  </span>
                  <span>Role-based access management and audit-friendly actions.</span>
                </li>
                <li className="auth-hero-item">
                  <span className="auth-hero-check" aria-hidden>
                    ✓
                  </span>
                  <span>Centralized visibility across bookings, payments, and support.</span>
                </li>
                <li className="auth-hero-item">
                  <span className="auth-hero-check" aria-hidden>
                    ✓
                  </span>
                  <span>Fast admin workflows built for real campus operations.</span>
                </li>
              </ul>
            </div>
          </aside>

          <section className="auth-panel">
            <div className="auth-panel-header">
              <span className="auth-panel-mark" aria-hidden>
                UH
              </span>
              <div>
                <h1 className="auth-heading">Admin Login</h1>
                <p className="auth-subtitle">Sign in to continue to the admin dashboard.</p>
              </div>
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div>
                <label htmlFor="admin-username" className="auth-label">Username</label>
                <input
                  id="admin-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="auth-input"
                  placeholder="admin"
                  required
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="auth-label">Password</label>
                <div className="auth-input-wrap">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input pr-[4.25rem]"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="auth-toggle"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-submit">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="auth-footer">
              <Link to="/" className="auth-link">Back to home</Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
