export default function Inquiries() {
  return (
    <div className="content-card">
      <h1 className="page-title mb-4">Inquiries</h1>
      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>From</th>
              <th>Subject</th>
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
              <td>—</td>
              <td><button type="button" className="table-action-link">Reply</button></td>
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
