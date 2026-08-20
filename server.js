const path = require('path')
const express = require('express')
const cors = require('cors')
const { connectDB, getGFSBucket } = require('./config/db')
const { notFound, errorHandler } = require('./middleware/errorMiddleware')
const { ObjectId } = require('mongodb')
require('dotenv').config()

const app = express()

connectDB()

app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/api/health', (req, res) => {
  const dbState = require('mongoose').connection.readyState
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }
  res.status(200).json({ status: 'ok', message: 'Backend is running', db: states[dbState] || dbState })
})

app.get('/api/images/:id', async (req, res) => {
  try {
    const bucket = getGFSBucket()
    const fileId = new ObjectId(req.params.id)

    const files = await bucket.find({ _id: fileId }).toArray()
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'Image not found' })
    }

    const file = files[0]
    res.set('Content-Type', file.contentType || 'image/jpeg')
    res.set('Cache-Control', 'public, max-age=86400')

    const downloadStream = bucket.openDownloadStream(fileId)
    downloadStream.on('error', () => {
      res.status(404).json({ message: 'Error fetching image' })
    })
    downloadStream.pipe(res)
  } catch (error) {
    res.status(400).json({ message: 'Invalid image ID' })
  }
})

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/products', require('./routes/productRoutes'))
app.use('/api/orders', require('./routes/orderRoutes'))
app.use('/api/categories', require('./routes/categoryRoutes'))
app.use('/api/blogs', require('./routes/blogRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
