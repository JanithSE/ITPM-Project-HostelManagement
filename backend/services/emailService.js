import nodemailer from 'nodemailer'

function parseBool(v, fallback = false) {
  if (v == null) return fallback
  const s = String(v).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(s)) return true
  if (['0', 'false', 'no', 'off'].includes(s)) return false
  return fallback
}

function getFromAddress() {
  return process.env.SMTP_FROM || process.env.EMAIL_USER || process.env.SMTP_USER
}

function createTransport() {
  const smtpHost = String(process.env.SMTP_HOST || '').trim()
  const smtpUser = String(process.env.SMTP_USER || '').trim()
  const smtpPass = String(process.env.SMTP_PASS || '').trim()
  const smtpPort = Number.parseInt(String(process.env.SMTP_PORT || '587'), 10)
  const smtpSecure = parseBool(process.env.SMTP_SECURE, smtpPort === 465)

  // Preferred path: generic SMTP provider (works with non-Gmail addresses).
  if (smtpHost && smtpUser && smtpPass) {
    console.log('[EmailService] Creating SMTP transport for host:', smtpHost)
    return nodemailer.createTransport({
      host: smtpHost,
      port: Number.isFinite(smtpPort) ? smtpPort : 587,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    })
  }

  // Backward-compatible fallback: Gmail credentials.
  const emailUser = process.env.EMAIL_USER
  const emailPass = process.env.EMAIL_PASS
  if (!emailUser || !emailPass) {
    console.error(
      '[EmailService] MISSING CREDENTIALS. Set SMTP_HOST/SMTP_USER/SMTP_PASS (preferred) or EMAIL_USER/EMAIL_PASS in backend/.env',
    )
    throw new Error(
      'Email service not configured. Set SMTP_* (preferred) or EMAIL_USER/EMAIL_PASS in backend/.env',
    )
  }

  console.log('[EmailService] Creating Gmail transport for:', emailUser)
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
    from: getFromAddress(),
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
    from: getFromAddress(),
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
 * Sent when an admin marks a payment as completed/confirmed.
 */
export async function sendPaymentCompletedEmail({
  to,
  studentName,
  paymentId,
  amount,
  monthLabel: monthLabelText,
}) {
  if (!to) return

  const transporter = createTransport()
  const amt =
    amount != null && Number.isFinite(Number(amount))
      ? Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : String(amount ?? '-')

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto;">
      <h2 style="color: #0f766e;">Payment Confirmed</h2>
      <p>Dear ${escapeHtml(studentName || 'Student')},</p>
      <p>
        Your payment has been verified and your booking payment is now confirmed.
      </p>
      <ul>
        <li><strong>Payment ID:</strong> ${escapeHtml(paymentId || '-')}</li>
        <li><strong>Month:</strong> ${escapeHtml(monthLabelText || '-')}</li>
        <li><strong>Amount Paid (LKR):</strong> ${escapeHtml(amt)}</li>
        <li><strong>Status:</strong> Completed</li>
      </ul>
      <p>Thank you for your payment.</p>
      <p>UniHostel Team</p>
    </div>
  `

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject: 'Payment Confirmation - Hostel Management System',
    html,
  })
  console.log(`[EmailService] SUCCESS: Completed payment email sent to ${to}`)
}

/**
 * Sent when an admin marks a payment as rejected (requires correction).
 */
export async function sendPaymentRejectedEmail({
  to,
  studentName,
  monthLabel: monthLabelText,
  amount,
  roomNo,
  adminRemarks,
}) {
  if (!to) return

  const transporter = createTransport()
  const amt =
    amount != null && Number.isFinite(Number(amount))
      ? Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : String(amount ?? '-')

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto;">
      <h2 style="color: #e11d48;">Payment Rejected</h2>
      <p>Hello ${escapeHtml(studentName || 'Student')},</p>
      <p>Your payment submission for <strong>${escapeHtml(monthLabelText || 'your booking')}</strong> has been rejected and requires your attention.</p>
      <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-weight: bold; color: #9f1239;">Reason / Admin Remarks:</p>
        <p style="margin: 8px 0 0 0; color: #be123c;">${escapeHtml(adminRemarks || 'Please verify your payment slip and re-upload.')}</p>
      </div>
      <ul>
        <li><strong>Month:</strong> ${escapeHtml(monthLabelText || '-')}</li>
        <li><strong>Amount (LKR):</strong> ${escapeHtml(amt)}</li>
        <li><strong>Room:</strong> ${escapeHtml(roomNo || '-')}</li>
      </ul>
      <p>Please log in to your dashboard to correct the information or upload a clearer slip.</p>
      <p>UniHostel Team</p>
    </div>
  `

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject: `UniHostel: Payment rejected for ${monthLabelText || 'your booking'}`,
    html,
  })
  console.log(`[EmailService] SUCCESS: Rejection email sent to ${to}`)
}
