export default function Inventory() {
  return (
    <div className="content-card">
      <h1 className="page-title mb-4">Inventory</h1>
      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Location</th>
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
        <button type="button" className="btn-table-primary">Add Item</button>
      </div>
    </div>
  )
}
