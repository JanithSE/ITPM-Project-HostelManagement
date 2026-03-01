import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')
  const location = useLocation()

  if (!token || !role) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role !== allowedRole) {
    if (role === 'student') return <Navigate to="/student" replace />
    if (role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/login" replace />
  }

  return children
}
