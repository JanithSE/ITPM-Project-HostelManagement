import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '../../shared/api/client'

export default function OtpVerification() {
  const navigate = useNavigate()
  const location = useLocation()
  const presetEmail = location.state?.email || ''
  const presetPurpose = location.state?.purpose || 'registration'
  const purposeLocked = Boolean(location.state?.purpose)

  const [email, setEmail] = useState(presetEmail)
  const [otp, setOtp] = useState('')
  const [purpose, setPurpose] = useState(presetPurpose)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.verifyOtp(email, otp, purpose)
      if (purpose === 'registration') {
        navigate('/student/login', { replace: true })
      } else {
        const resetToken = data?.resetToken
        if (!resetToken) {
          setError('Server did not return a reset token. Try again.')
          return
        }
        navigate('/reset-password', { replace: true, state: { email, resetToken } })
      }
    } catch (err) {
      setError(err.message || 'OTP verification failed')
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
              <h1 className="auth-pro-heading">OTP Verification</h1>
              <p className="auth-pro-subheading !mt-0">Enter the 6-digit OTP sent to your email (valid for 5 minutes).</p>
            </div>
          </div>
          {error && <p className="auth-pro-error">{error}</p>}
          <form onSubmit={handleSubmit} className="auth-pro-form">
            <div>
              <label htmlFor="otp-purpose" className="auth-pro-label">Verification Type</label>
              <select
                id="otp-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="auth-pro-input"
                disabled={purposeLocked}
              >
                <option value="registration">Registration</option>
                <option value="password_reset">Password Reset</option>
              </select>
            </div>
            <div>
              <label htmlFor="otp-email" className="auth-pro-label">Email</label>
              <input
                id="otp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-pro-input"
                required
              />
            </div>
            <div>
              <label htmlFor="otp-code" className="auth-pro-label">OTP</label>
              <input
                id="otp-code"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="auth-pro-input"
                placeholder="123456"
                minLength={6}
                maxLength={6}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="auth-pro-submit">
              {loading ? 'Verifying...' : 'Verify OTP'}
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
