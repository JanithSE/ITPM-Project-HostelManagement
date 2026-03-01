import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/client'

export default function StudentLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.studentLogin(email, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.role)
      navigate('/student/hostels')
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
          <h1 className="auth-title">Student Login</h1>
          <p className="auth-subtitle">Sign in to your student account</p>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div>
              <label htmlFor="email" className="auth-label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="auth-label">Password</label>
              <input
                id="password"
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
            Don&apos;t have an account? <Link to="/signup" className="auth-link">Sign up</Link>
          </p>
          <p className="auth-footer-secondary">
            <Link to="/" className="auth-link">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
