import 'dotenv/config'
import { sendPaymentAcceptedEmail } from '../services/emailService.js'

async function test() {
  const to = process.env.EMAIL_USER
  if (!to) {
    console.error('EMAIL_USER is not set in .env')
    process.exit(1)
  }

  console.log(`Sending test email to: ${to}...`)
  try {
    await sendPaymentAcceptedEmail({
      to,
      studentName: 'Test Student',
      monthLabel: 'April 2026',
      amount: 15000,
      roomNo: 'TEST-101',
      roomType: 'Single',
      facilityType: 'Fan',
      adminRemarks: 'This is a test email to verify configuration.',
    })
    console.log('✅ Success! Check your inbox (and spam folder) for the test email.')
  } catch (err) {
    console.error('❌ Failed to send email:', err.message)
    console.error('Detailed error:', err)
  }
}

test()
