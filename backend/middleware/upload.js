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

fs.mkdirSync(paymentsDir, { recursive: true })
fs.mkdirSync(latepassDir, { recursive: true })
fs.mkdirSync(hostelsDir, { recursive: true })

const PAYMENT_ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.pdf'])
const PAYMENT_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/x-pdf',
])

/** Payment proof: JPG, PNG, PDF only (no WebP). */
function paymentProofFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase()
  const mime = String(file.mimetype || '').toLowerCase()

  if (PAYMENT_ALLOWED_MIME.has(mime)) return cb(null, true)
  if (!mime || mime === 'application/octet-stream') {
    if (PAYMENT_ALLOWED_EXT.has(ext)) return cb(null, true)
  }
  cb(new Error('Only JPG, PNG, and PDF files are allowed.'))
}

/** Late pass document: same rules as payment proof (JPG, PNG, PDF). */
function latepassDocumentFilter(req, file, cb) {
  return paymentProofFilter(req, file, cb)
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

const PAYMENT_MAX_FILE_BYTES = 5 * 1024 * 1024

const paymentMulter = multer({
  storage: makeStorage(paymentsDir),
  limits: { fileSize: PAYMENT_MAX_FILE_BYTES },
  fileFilter: paymentProofFilter,
})

const LATEPASS_MAX_FILE_BYTES = 5 * 1024 * 1024

const latepassMulter = multer({
  storage: makeStorage(latepassDir),
  limits: { fileSize: LATEPASS_MAX_FILE_BYTES },
  fileFilter: latepassDocumentFilter,
})

const hostelImageMulter = multer({
  storage: makeStorage(hostelsDir),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: hostelImageFilter,
})

export function paymentProofUploadMiddleware(req, res, next) {
  paymentMulter.single('proof')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size must be less than 5MB.', fieldErrors: { proof: 'File size must be less than 5MB.' } })
      }
      return res.status(400).json({
        error: err.message || 'File upload failed',
        fieldErrors: { proof: err.message || 'Upload a payment slip or proof.' },
      })
    }
    next()
  })
}

/** Same as paymentProofUploadMiddleware, but proof file is optional (used for edit). */
export function paymentProofUploadOptionalMiddleware(req, res, next) {
  paymentMulter.single('proof')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size must be less than 5MB.', fieldErrors: { proof: 'File size must be less than 5MB.' } })
      }
      return res.status(400).json({
        error: err.message || 'File upload failed',
        fieldErrors: { proof: err.message || 'Upload a payment slip or proof.' },
      })
    }
    next()
  })
}

export function latepassDocumentUploadMiddleware(req, res, next) {
  latepassMulter.single('document')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size must be less than 5MB.',
          fieldErrors: { document: 'File size must be less than 5MB.' },
        })
      }
      return res.status(400).json({
        error: err.message || 'File upload failed',
        fieldErrors: { document: err.message || 'Upload a valid document.' },
      })
    }
    next()
  })
}

/** Same as latepassDocumentUploadMiddleware, but document is optional (used for edit). */
export function latepassDocumentUploadOptionalMiddleware(req, res, next) {
  latepassMulter.single('document')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size must be less than 5MB.',
          fieldErrors: { document: 'File size must be less than 5MB.' },
        })
      }
      return res.status(400).json({
        error: err.message || 'File upload failed',
        fieldErrors: { document: err.message || 'Upload a valid document.' },
      })
    }
    next()
  })
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

/** Use multipart parsing only when the client sends multipart/form-data (optional image). */
export function conditionalHostelImageUpload(req, res, next) {
  const ct = String(req.headers['content-type'] || '')
  if (ct.includes('multipart/form-data')) {
    return hostelImageUploadMiddleware(req, res, next)
  }
  next()
}

/** @deprecated use paymentProofUploadMiddleware */
export const proofUploadMiddleware = paymentProofUploadMiddleware
