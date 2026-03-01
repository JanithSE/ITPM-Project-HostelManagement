import { Link } from 'react-router-dom'

export default function StudentDashboard() {
  return (
    <div className="content-card">
      <h1 className="page-title">Student Dashboard</h1>
      <p className="page-description">Welcome back. Use the header to navigate.</p>
      <Link to="/student/hostels" className="btn-primary-action">
        View Hostels
      </Link>
    </div>
  )
}
