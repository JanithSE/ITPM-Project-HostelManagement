import fs from 'fs'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const backendRoot = path.join(__dirname, '..')
const paymentsDir = path.join(backendRoot, 'uploads', 'payments')
const latepassDir = path.join(backendRoot, 'uploads', 'latepass')
const hostelsDir = path.join(backendRoot, 'uploads', 'hostels')
const bookingsDir = path.join(backendRoot, 'uploads', 'bookings')

// ✅ create all folders
fs.mkdirSync(paymentsDir, { recursive: true })
fs.mkdirSync(latepassDir, { recursive: true })
fs.mkdirSync(hostelsDir, { recursive: true })
fs.mkdirSync(bookingsDir, { recursive: true })

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf'])
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/x-pdf',
])

function imageOrPdfFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase()
  const mime = String(file.mimetype || '').toLowerCase()

  if (ALLOWED_MIME.has(mime)) return cb(null, true)
  if (!mime || mime === 'application/octet-stream') {
    if (ALLOWED_EXT.has(ext)) return cb(null, true)
  }
  cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed'))
}

const HOSTEL_IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const HOSTEL_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

function hostelImageFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase()
  const mime = String(file.mimetype || '').toLowerCase()

  if (HOSTEL_IMAGE_MIME.has(mime)) return cb(null, true)
  if (!mime || mime === 'application/octet-stream') {
    if (HOSTEL_IMAGE_EXT.has(ext)) return cb(null, true)
  }
  cb(new Error('Only JPEG, PNG, and WebP images are allowed for hostel photos'))
}

function makeStorage(destDir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
      cb(null, `${unique}-${safeName}`)
    },
  })
}

// ✅ Multer instances
const paymentMulter = multer({
  storage: makeStorage(paymentsDir),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageOrPdfFilter,
})

const latepassMulter = multer({
  storage: makeStorage(latepassDir),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageOrPdfFilter,
})

const hostelImageMulter = multer({
  storage: makeStorage(hostelsDir),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: hostelImageFilter,
})

const bookingMulter = multer({
  storage: makeStorage(bookingsDir),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageOrPdfFilter,
})

// ✅ Middleware
export function paymentProofUploadMiddleware(req, res, next) {
  paymentMulter.single('proof')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Proof file must be 10 MB or smaller' })
      }
      return res.status(400).json({ error: err.message || 'File upload failed' })
    }
    next()
  })
}

/** Optional proof on edit: parse multipart only when client sends multipart/form-data */
export function paymentProofUploadOptionalMiddleware(req, res, next) {
  const ct = String(req.headers['content-type'] || '')
  if (ct.includes('multipart/form-data')) {
    return paymentProofUploadMiddleware(req, res, next)
  }
  next()
}

export function latepassDocumentUploadMiddleware(req, res, next) {
  latepassMulter.single('document')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Document must be 10 MB or smaller' })
      }
      return res.status(400).json({ error: err.message || 'File upload failed' })
    }
    next()
  })
}

/** Optional document on edit: multipart only when client sends multipart/form-data */
export function latepassDocumentUploadOptionalMiddleware(req, res, next) {
  const ct = String(req.headers['content-type'] || '')
  if (ct.includes('multipart/form-data')) {
    return latepassDocumentUploadMiddleware(req, res, next)
  }
  next()
}

export function hostelImageUploadMiddleware(req, res, next) {
  hostelImageMulter.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Hostel image must be 8 MB or smaller' })
      }
      return res.status(400).json({ error: err.message || 'Image upload failed' })
    }
    next()
  })
}

export function bookingDocumentsUploadMiddleware(req, res, next) {
  bookingMulter.fields([
    { name: 'nic', maxCount: 1 },
    { name: 'studentId', maxCount: 1 },
    { name: 'medicalReport', maxCount: 1 },
    { name: 'policeReport', maxCount: 1 },
    { name: 'guardianLetter', maxCount: 1 },
    { name: 'recommendationLetter', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Each document must be 10 MB or smaller' })
      }
      return res.status(400).json({ error: err.message || 'File upload failed' })
    }
    next()
  })
}

/** Optional hostel image upload */
export function conditionalHostelImageUpload(req, res, next) {
  const ct = String(req.headers['content-type'] || '')
  if (ct.includes('multipart/form-data')) {
    return hostelImageUploadMiddleware(req, res, next)
  }
  next()
}

/** @deprecated */
export const proofUploadMiddleware = paymentProofUploadMiddleware