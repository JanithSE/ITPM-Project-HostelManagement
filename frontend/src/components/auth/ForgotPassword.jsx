import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../shared/api/client'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const data = await authApi.forgotPassword(email)
      setMessage(data?.message || 'OTP sent if account exists')
      navigate('/verify-otp', { state: { email, purpose: 'password_reset' } })
    } catch (err) {
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-pro-wrap">
      <div className="auth-pro-card max-w-xl">
        <section className="auth-pro-panel">
          <div className="auth-pro-panel-header">
            <span className="auth-pro-panel-mark">UH</span>
            <div>
              <h1 className="auth-pro-heading">Forgot Password</h1>
              <p className="auth-pro-subheading !mt-0">Enter your email to receive a reset OTP.</p>
            </div>
          </div>
          {error && <p className="auth-pro-error">{error}</p>}
          {message && <p className="auth-pro-trust">{message}</p>}
          <form onSubmit={handleSubmit} className="auth-pro-form">
            <div>
              <label htmlFor="forgot-email" className="auth-pro-label">Email</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-pro-input"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="auth-pro-submit">
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
          <p className="auth-pro-footer">
            <Link to="/student/login" className="auth-pro-link">Back to login</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
