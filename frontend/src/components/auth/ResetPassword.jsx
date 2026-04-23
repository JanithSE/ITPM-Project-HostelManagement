import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '../../shared/api/client'

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [resetToken] = useState(location.state?.resetToken || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(() =>
    resetToken ? '' : 'Verify your OTP first (use the Forgot Password flow).'
  )
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!resetToken) {
      setError('Your reset session is missing. Start again from Forgot Password.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword(email, resetToken, password)
      navigate('/student/login', { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to reset password')
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
              <h1 className="auth-pro-heading">Reset Password</h1>
              <p className="auth-pro-subheading !mt-0">Enter your new password. Your OTP was already verified.</p>
            </div>
          </div>
          {error && <p className="auth-pro-error">{error}</p>}
          <form onSubmit={handleSubmit} className="auth-pro-form">
            <div>
              <label htmlFor="reset-email" className="auth-pro-label">Email</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-pro-input"
                required
                disabled={Boolean(resetToken)}
                title={resetToken ? 'Must match the email you verified' : ''}
              />
              {resetToken ? (
                <p className="auth-pro-subheading !mt-0">OTP verified. You can set a new password now.</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="reset-password" className="auth-pro-label">New Password</label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-pro-input"
                minLength={6}
                required
              />
            </div>
            <div>
              <label htmlFor="reset-confirm-password" className="auth-pro-label">Confirm Password</label>
              <input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-pro-input"
                minLength={6}
                required
              />
            </div>
            <button type="submit" disabled={loading || !resetToken} className="auth-pro-submit">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
          <p className="auth-pro-footer">
            <Link to="/forgot-password" className="auth-pro-link">Forgot password again</Link>
            {' · '}
            <Link to="/student/login" className="auth-pro-link">Back to login</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
