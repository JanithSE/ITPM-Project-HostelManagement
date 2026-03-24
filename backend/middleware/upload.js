import fs from 'fs'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const backendRoot = path.join(__dirname, '..')
const paymentsDir = path.join(backendRoot, 'uploads', 'payments')
const latepassDir = path.join(backendRoot, 'uploads', 'latepass')

fs.mkdirSync(paymentsDir, { recursive: true })
fs.mkdirSync(latepassDir, { recursive: true })

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

/** @deprecated use paymentProofUploadMiddleware */
export const proofUploadMiddleware = paymentProofUploadMiddleware
