const multer = require('multer')
const { getGFSBucket } = require('../config/db')
const { ObjectId } = require('mongodb')

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
})

const uploadToGridFS = (buffer, filename, contentType) => {
  return new Promise((resolve, reject) => {
    const bucket = getGFSBucket()
    const ext = filename.split('.').pop() || 'jpg'
    const gridfsFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`

    const uploadStream = bucket.openUploadStream(gridfsFilename, { contentType })

    uploadStream.on('error', reject)
    uploadStream.on('finish', () => {
      resolve({ id: uploadStream.id.toString(), filename: gridfsFilename })
    })

    uploadStream.end(buffer)
  })
}

const deleteFromGridFS = async (fileId) => {
  try {
    const bucket = getGFSBucket()
    await bucket.delete(new ObjectId(fileId))
  } catch (err) {
    console.error('GridFS delete error:', err.message)
  }
}

module.exports = { upload, uploadToGridFS, deleteFromGridFS }
