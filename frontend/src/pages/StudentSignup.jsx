import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/client'

export default function StudentSignup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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
      navigate('/student/hostels')
    } catch (err) {
      setError(err.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="w-full max-w-md">
        <div className="auth-card">
          <h1 className="auth-title">Student Sign up</h1>
          <p className="auth-subtitle">Create an account to book hostels</p>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div>
              <label htmlFor="name" className="auth-label">Full name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="auth-input"
                placeholder="Your name"
                required
              />
            </div>
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
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="auth-label">Confirm password</label>
              <input
                id="confirmPassword"
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
          <p className="auth-footer">
            Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
          </p>
          <p className="auth-footer-secondary">
            <Link to="/" className="auth-link">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
