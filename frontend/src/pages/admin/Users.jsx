export default function Users() {
  return (
    <div className="content-card">
      <h1 className="page-title mb-4">Users</h1>
      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td><button type="button" className="table-action-link">Edit</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="actions-row">
        <button type="button" className="btn-table-primary">Add User</button>
        <button type="button" className="btn-table-secondary">Export</button>
      </div>
    </div>
  )
}
