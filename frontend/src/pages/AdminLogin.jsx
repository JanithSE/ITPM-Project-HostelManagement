import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/client'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
      navigate('/admin/users')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="w-full max-w-md">
        <div className="auth-card">
          <h1 className="auth-title">Admin Login</h1>
          <p className="auth-subtitle">Sign in to the admin dashboard</p>
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
              <input
                id="admin-password"
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
          <p className="auth-footer">
            <Link to="/" className="auth-link">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
