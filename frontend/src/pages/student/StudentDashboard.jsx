import { Link } from 'react-router-dom'

export default function StudentDashboard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Student Dashboard</h1>
      <p className="text-gray-600 mb-6">Welcome back. Use the header to navigate.</p>
      <Link
        to="/student/hostels"
        className="inline-block bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
      >
        View Hostels
      </Link>
    </div>
  )
}
