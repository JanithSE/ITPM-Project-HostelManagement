import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')
  const location = useLocation()

  if (!token || !role) {
    const loginPath = allowedRole === 'student'
      ? '/student/login'
      : allowedRole === 'warden'
        ? '/warden/login'
        : '/admin/login'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  if (role !== allowedRole) {
    if (role === 'student') return <Navigate to="/student" replace />
    if (role === 'admin') return <Navigate to="/admin" replace />
    if (role === 'warden') return <Navigate to="/warden" replace />
    return <Navigate to="/login" replace />
  }

  return children
}
