import { Outlet } from 'react-router-dom'
import StudentNavbar from '../components/StudentNavbar'

export default function StudentLayout() {
  return (
    <div className="dashboard-wrap">
      <StudentNavbar />
      <main className="content-main">
        <Outlet />
      </main>
    </div>
  )
}
