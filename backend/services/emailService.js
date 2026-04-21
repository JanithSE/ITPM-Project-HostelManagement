import nodemailer from 'nodemailer'

function createTransport() {
  const emailUser = process.env.EMAIL_USER
  const emailPass = process.env.EMAIL_PASS
  if (!emailUser || !emailPass) {
    throw new Error('Email service not configured. Set EMAIL_USER and EMAIL_PASS in backend/.env')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: emailUser, pass: emailPass },
  })
}

export async function sendBookingRejectedEmail({
  to,
  studentName,
  hostelName,
  roomNumber,
  rejectionReason,
  missingDocuments = [],
}) {
  if (!to) return

  const transporter = createTransport()
  const docsLine = missingDocuments.length
    ? `<li><strong>Missing/Incorrect Documents:</strong> ${missingDocuments.join(', ')}</li>`
    : ''

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto;">
      <h2>Booking Update Required</h2>
      <p>Hello ${studentName || 'Student'},</p>
      <p>Your booking request was reviewed and requires corrections before approval.</p>
      <ul>
        <li><strong>Hostel:</strong> ${hostelName || '-'}</li>
        <li><strong>Room:</strong> ${roomNumber || '-'}</li>
        <li><strong>Issue:</strong> ${rejectionReason || 'Document verification failed'}</li>
        ${docsLine}
      </ul>
      <p>Please log in, re-upload the correct documents, and submit again.</p>
      <p>UniHostel Team</p>
    </div>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'UniHostel Booking Rejected - Document Fix Required',
    html,
  })
}

export async function sendDocumentRejectedEmail({
  to,
  studentName,
  documentName,
  note,
  hostelName,
  roomNumber,
}) {
  if (!to) return
  const transporter = createTransport()
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto;">
      <h2>Document Rejected - Action Required</h2>
      <p>Hello ${studentName || 'Student'},</p>
      <p>One of your booking documents has been rejected by the admin.</p>
      <ul>
        <li><strong>Document:</strong> ${documentName || '-'}</li>
        <li><strong>Reason:</strong> ${note || 'Please upload a clear/correct document.'}</li>
        <li><strong>Hostel:</strong> ${hostelName || '-'}</li>
        <li><strong>Room:</strong> ${roomNumber || '-'}</li>
      </ul>
      <p>Please re-upload the specific document from your dashboard booking page.</p>
      <p>UniHostel Team</p>
    </div>
  `
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: `UniHostel Document Rejected: ${documentName || 'Booking Document'}`,
    html,
  })
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Sent when an admin marks a payment as accepted (status: completed).
 */
export async function sendPaymentAcceptedEmail({
  to,
  studentName,
  monthLabel: monthLabelText,
  amount,
  roomNo,
  roomType,
  facilityType,
  adminRemarks,
}) {
  if (!to) return

  const transporter = createTransport()
  const amt =
    amount != null && Number.isFinite(Number(amount))
      ? Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : String(amount ?? '-')

  const remarksBlock = adminRemarks
    ? `<li><strong>Notes:</strong> ${escapeHtml(adminRemarks)}</li>`
    : ''

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto;">
      <h2>Payment Accepted</h2>
      <p>Hello ${escapeHtml(studentName || 'Student')},</p>
      <p>Your hostel fee payment has been <strong>accepted</strong>. Thank you.</p>
      <ul>
        <li><strong>Month:</strong> ${escapeHtml(monthLabelText || '-')}</li>
        <li><strong>Amount (LKR):</strong> ${escapeHtml(amt)}</li>
        <li><strong>Room:</strong> ${escapeHtml(roomNo || '-')}</li>
        <li><strong>Room type:</strong> ${escapeHtml(roomType || '-')}</li>
        <li><strong>Facility:</strong> ${escapeHtml(facilityType || '-')}</li>
        ${remarksBlock}
      </ul>
      <p>You can view this record anytime in your student dashboard.</p>
      <p>UniHostel Team</p>
    </div>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: `UniHostel: Payment accepted for ${monthLabelText || 'your booking'}`,
    html,
  })
}
