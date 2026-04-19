import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function toYMD(date) {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function inDateRange(rowDate, fromDate, toDate) {
  const dateOnly = toYMD(rowDate)
  if (!dateOnly) return false
  if (fromDate && dateOnly < fromDate) return false
  if (toDate && dateOnly > toDate) return false
  return true
}

function escapeCsv(value) {
  const v = String(value ?? '')
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

function formatMaintStatus(value) {
  if (value === 'in_progress') return 'In progress'
  return String(value || '').replace(/_/g, ' ')
}

/** @param {Array} rows maintenance API rows */
export function exportMaintenanceCsv(rows) {
  const headers = ['Title', 'Student ID', 'Location', 'Priority', 'Status', 'Student Name', 'Student Email', 'Created At']
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.title,
        row.studentId || '',
        row.location || '',
        row.priority || '',
        row.status || '',
        row.reportedBy?.name || '',
        row.reportedBy?.email || '',
        row.createdAt ? new Date(row.createdAt).toLocaleString() : '',
      ].map(escapeCsv).join(',')
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `maintenance-report-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** @param {Array} rows inquiry API rows */
export function exportInquiriesCsv(rows) {
  const headers = ['Campus ID', 'Student Name', 'Student Email', 'Subject', 'Message', 'Status', 'Reply', 'Created At']
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.campusId || '',
        row.from?.name || '',
        row.from?.email || '',
        row.subject || '',
        row.message || '',
        row.status || '',
        row.reply || '',
        row.createdAt ? new Date(row.createdAt).toLocaleString() : '',
      ].map(escapeCsv).join(',')
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inquiries-report-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function printMaintenanceReport(rows) {
  const rowsHtml = rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.title)}</td>
        <td>${escapeHtml(row.studentId)}</td>
        <td>${escapeHtml(row.location)}</td>
        <td>${escapeHtml(row.priority)}</td>
        <td>${escapeHtml(formatMaintStatus(row.status))}</td>
        <td>${escapeHtml(row.reportedBy?.name)}</td>
        <td>${escapeHtml(row.reportedBy?.email)}</td>
        <td>${row.createdAt ? escapeHtml(new Date(row.createdAt).toLocaleString()) : '-'}</td>
      </tr>
    `
    )
    .join('')
  openPrintWindow(
    'Maintenance Report',
    `<thead><tr>
      <th>Title</th><th>Student ID</th><th>Location</th><th>Priority</th><th>Status</th>
      <th>Student Name</th><th>Student Email</th><th>Created</th>
    </tr></thead><tbody>${rowsHtml}</tbody>`
  )
}

export function printInquiriesReport(rows) {
  const rowsHtml = rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.campusId)}</td>
        <td>${escapeHtml(row.from?.name)}</td>
        <td>${escapeHtml(row.from?.email)}</td>
        <td>${escapeHtml(row.subject)}</td>
        <td>${escapeHtml(row.message)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td>${escapeHtml(row.reply)}</td>
        <td>${row.createdAt ? escapeHtml(new Date(row.createdAt).toLocaleString()) : '-'}</td>
      </tr>
    `
    )
    .join('')
  openPrintWindow(
    'Inquiry Report',
    `<thead><tr>
      <th>Campus ID</th><th>Student Name</th><th>Student Email</th><th>Subject</th>
      <th>Message</th><th>Status</th><th>Reply</th><th>Created</th>
    </tr></thead><tbody>${rowsHtml}</tbody>`
  )
}

function escapeHtml(v) {
  if (v == null || v === '') return '—'
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function openPrintWindow(title, tableInner) {
  const win = window.open('', '_blank', 'width=1100,height=800')
  if (!win) return
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
          h1 { margin: 0 0 8px 0; }
          p { margin: 0 0 14px 0; color: #334155; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table>${tableInner}</table>
      </body>
    </html>
  `)
  win.document.close()
  win.focus()
  win.print()
}

export function exportMaintenancePdf(rows) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  doc.setFontSize(14)
  doc.text('Maintenance Report', 40, 40)
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 56)
  doc.setTextColor(0, 0, 0)

  const body = rows.map((row) => [
    String(row.title || '').slice(0, 120),
    row.studentId || '—',
    String(row.location || '').slice(0, 48),
    row.priority || '—',
    formatMaintStatus(row.status),
    row.reportedBy?.name || '—',
    row.reportedBy?.email || '—',
    row.createdAt ? new Date(row.createdAt).toLocaleString() : '—',
  ])

  autoTable(doc, {
    startY: 68,
    head: [['Title', 'Student ID', 'Location', 'Priority', 'Status', 'Student', 'Email', 'Created']],
    body,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    margin: { left: 40, right: 40 },
  })

  doc.save(`maintenance-report-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function exportInquiriesPdf(rows) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  doc.setFontSize(14)
  doc.text('Inquiry Report', 40, 40)
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 56)
  doc.setTextColor(0, 0, 0)

  const body = rows.map((row) => [
    row.campusId || '—',
    String(row.from?.name || '—').slice(0, 40),
    String(row.from?.email || '—').slice(0, 48),
    String(row.subject || '—').slice(0, 80),
    String(row.message || '—').slice(0, 200),
    row.status || '—',
    String(row.reply || '—').slice(0, 200),
    row.createdAt ? new Date(row.createdAt).toLocaleString() : '—',
  ])

  autoTable(doc, {
    startY: 68,
    head: [['Campus ID', 'Name', 'Email', 'Subject', 'Message', 'Status', 'Reply', 'Created']],
    body,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    margin: { left: 40, right: 40 },
  })

  doc.save(`inquiries-report-${new Date().toISOString().slice(0, 10)}.pdf`)
}
