import fs from 'fs'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Where uploaded proof files are stored on the server
const uploadsDir = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf'])
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/x-pdf',
])

function proofFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase()
  const mime = String(file.mimetype || '').toLowerCase()

  if (ALLOWED_MIME.has(mime)) return cb(null, true)
  // Browsers often send PDFs as octet-stream or omit MIME for local files
  if (!mime || mime === 'application/octet-stream') {
    if (ALLOWED_EXT.has(ext)) return cb(null, true)
  }
  cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed for payment proof'))
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}-${safeName}`)
  },
})

// Expects the file field name to be `proof`
const uploadProof = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: proofFileFilter,
})

/** Runs multer and returns JSON errors instead of crashing the request. */
export function proofUploadMiddleware(req, res, next) {
  uploadProof.single('proof')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Proof file must be 10 MB or smaller' })
      }
      return res.status(400).json({ error: err.message || 'File upload failed' })
    }
    next()
  })
}
