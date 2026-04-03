import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import hostelsRoutes from './routes/hostels.js'
import bookingsRoutes from './routes/bookings.js'
import paymentsRoutes from './routes/payments.js'
import inquiryRoutes from './routes/inquiry.js'
import latepassRoutes from './routes/latepass.js'
import complainsRoutes from './routes/complains.js'
import inventoryRoutes from './routes/inventory.js'
import issuedItemsRoutes from './routes/issuedItems.js'
import maintenanceRoutes from './routes/maintenance.js'
import roomsRoutes from './routes/rooms.js'
import notificationsRoutes from './routes/notifications.js'

await connectDB()

const app = express()
const PORT = process.env.PORT || 5001

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// Serve uploaded proof files (for payment proofUrl)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/hostels', hostelsRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/inquiry', inquiryRoutes)
app.use('/api/latepass', latepassRoutes)
app.use('/api/complains', complainsRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/issued-items', issuedItemsRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/rooms', roomsRoutes)
app.use('/api/notifications', notificationsRoutes)

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

// Global error handler (for async route errors that slip through)
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\nPort ${PORT} is already in use.\n` +
        `Another backend is probably still running (e.g. another terminal or root "npm run dev").\n` +
        `Fix: stop that process, or run: netstat -ano | findstr ":${PORT}" then taskkill /PID <pid> /F\n`
    )
    process.exit(1)
  }
  throw err
})
