export default function Latepass() {
  return (
    <div className="content-card">
      <h1 className="page-title mb-4">Latepass</h1>
      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Student</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td><button type="button" className="table-action-link">Approve</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="actions-row">
        <button type="button" className="btn-table-primary">View All</button>
      </div>
    </div>
  )
}
