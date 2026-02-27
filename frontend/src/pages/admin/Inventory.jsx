export default function Inventory() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Inventory</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Quantity</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Location</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr><td className="px-4 py-3 text-gray-600">—</td><td className="px-4 py-3 text-gray-600">—</td><td className="px-4 py-3 text-gray-600">—</td><td className="px-4 py-3"><button className="text-primary-600 text-sm font-medium">Edit</button></td></tr>
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">Add Item</button>
      </div>
    </div>
  )
}
