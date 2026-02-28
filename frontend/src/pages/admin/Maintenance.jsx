export default function Maintenance() {
  return (
    <div className="content-card">
      <h1 className="page-title mb-4">Maintenance</h1>
      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Issue</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td><button type="button" className="table-action-link">Update</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="actions-row">
        <button type="button" className="btn-table-primary">New Request</button>
      </div>
    </div>
  )
}
