export default function Booking() {
  return (
    <div className="content-card">
      <h1 className="page-title mb-4">Booking</h1>
      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Student</th>
              <th>Room</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td><button type="button" className="table-action-link">View</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="actions-row">
        <button type="button" className="btn-table-primary">New Booking</button>
      </div>
    </div>
  )
}
