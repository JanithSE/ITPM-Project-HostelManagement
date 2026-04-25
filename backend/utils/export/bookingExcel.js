import ExcelJS from 'exceljs'

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export async function buildBookingsExcelBuffer(rows, meta = {}) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Bookings')

  sheet.columns = [
    { header: 'Booking ID', key: 'bookingId', width: 16 },
    { header: 'Student Name', key: 'studentName', width: 24 },
    { header: 'Student Email', key: 'studentEmail', width: 30 },
    { header: 'Hostel', key: 'hostel', width: 20 },
    { header: 'Room', key: 'room', width: 12 },
    { header: 'Bed', key: 'bed', width: 12 },
    { header: 'From Date', key: 'fromDate', width: 14 },
    { header: 'To Date', key: 'toDate', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Note', key: 'note', width: 36 },
    { header: 'Created At', key: 'createdAt', width: 14 },
  ]

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E78' },
  }
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' }

  for (const row of rows) {
    sheet.addRow({
      bookingId: row.bookingId,
      studentName: row.studentName,
      studentEmail: row.studentEmail,
      hostel: row.hostel,
      room: row.room,
      bed: row.bed,
      fromDate: formatDate(row.fromDate),
      toDate: formatDate(row.toDate),
      status: row.status,
      note: row.note,
      createdAt: formatDate(row.createdAt),
    })
  }

  if (rows.length === 0) {
    sheet.addRow({
      bookingId: '',
      studentName: 'No bookings found for selected date range',
      studentEmail: '',
      hostel: '',
      room: '',
      bed: '',
      fromDate: '',
      toDate: '',
      status: '',
      note: '',
      createdAt: '',
    })
  }

  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.getColumn('status').alignment = { horizontal: 'center' }

  const metaSheet = workbook.addWorksheet('Meta')
  metaSheet.columns = [
    { header: 'Field', key: 'field', width: 20 },
    { header: 'Value', key: 'value', width: 48 },
  ]
  metaSheet.getRow(1).font = { bold: true }
  metaSheet.addRow({ field: 'Generated At', value: new Date().toISOString() })
  metaSheet.addRow({ field: 'Date Field', value: meta.dateField || '' })
  metaSheet.addRow({ field: 'Range', value: meta.range || '' })
  metaSheet.addRow({ field: 'From', value: formatDate(meta.from) })
  metaSheet.addRow({ field: 'To', value: formatDate(meta.to) })
  metaSheet.addRow({ field: 'Total Rows', value: String(rows.length) })

  return workbook.xlsx.writeBuffer()
}
