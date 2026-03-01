import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import hostelsRoutes from './routes/hostels.js'
import bookingsRoutes from './routes/bookings.js'
import paymentsRoutes from './routes/payments.js'
import inquiriesRoutes from './routes/inquiries.js'
import latepassRoutes from './routes/latepass.js'
import complainsRoutes from './routes/complains.js'
import inventoryRoutes from './routes/inventory.js'
import maintenanceRoutes from './routes/maintenance.js'

await connectDB()

const app = express()
const PORT = process.env.PORT || 5001

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/hostels', hostelsRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/inquiries', inquiriesRoutes)
app.use('/api/latepass', latepassRoutes)
app.use('/api/complains', complainsRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/maintenance', maintenanceRoutes)

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
