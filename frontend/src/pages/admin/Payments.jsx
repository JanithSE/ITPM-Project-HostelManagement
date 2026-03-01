export default function Payments() {
  return (
    <div className="content-card">
      <h1 className="page-title mb-4">Payments</h1>
      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td><button type="button" className="table-action-link">Details</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="actions-row">
        <button type="button" className="btn-table-primary">Record Payment</button>
      </div>
    </div>
  )
}
