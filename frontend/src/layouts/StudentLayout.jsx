import { Outlet } from 'react-router-dom'
import StudentNavbar from '../components/StudentNavbar'

export default function StudentLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
