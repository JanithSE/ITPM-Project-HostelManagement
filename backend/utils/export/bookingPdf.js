import PDFDocument from 'pdfkit'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toISOString().slice(0, 10)
}

function lineForRow(row) {
  return [
    row.bookingId || '-',
    row.studentName || '-',
    row.hostel || '-',
    `Room ${row.room || '-'} / Bed ${row.bed || '-'}`,
    `${formatDate(row.fromDate)} to ${formatDate(row.toDate)}`,
    (row.status || '-').toUpperCase(),
  ].join(' | ')
}

export function buildBookingsPdfBuffer(rows, meta = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    const chunks = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(18).text('Booking Export Report', { align: 'left' })
    doc.moveDown(0.4)
    doc.fontSize(10).fillColor('#444444')
    doc.text(`Generated At: ${new Date().toISOString()}`)
    doc.text(`Date Field: ${meta.dateField || '-'}`)
    doc.text(`Range: ${meta.range || '-'}`)
    doc.text(`From: ${formatDate(meta.from)}`)
    doc.text(`To: ${formatDate(meta.to)}`)
    doc.text(`Total Rows: ${rows.length}`)
    doc.moveDown(0.8)
    doc.fillColor('#111111').fontSize(11).text('Bookings', { underline: true })
    doc.moveDown(0.4)

    if (!rows.length) {
      doc.fontSize(10).text('No bookings found for selected date range.')
      doc.end()
      return
    }

    doc.fontSize(9)
    for (const row of rows) {
      if (doc.y > doc.page.height - 50) {
        doc.addPage()
      }
      doc.text(lineForRow(row), { width: 520 })
      if (row.note) {
        doc.fillColor('#555555').text(`Note: ${row.note}`, { width: 520, indent: 12 })
        doc.fillColor('#111111')
      }
      doc.moveDown(0.5)
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#DDDDDD').stroke()
      doc.moveDown(0.5)
    }

    doc.end()
  })
}
