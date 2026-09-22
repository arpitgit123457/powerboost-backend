const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const { connectDB, getGFSBucket } = require('./config/db')
const { notFound, errorHandler } = require('./middleware/errorMiddleware')
const { ObjectId } = require('mongodb')
require('dotenv').config()

const app = express()

async function seedBannersOnStartup() {
  try {
    const Banner = require('./models/Banner')
    const count = await Banner.countDocuments()
    if (count > 0) return

    const imagesDir = path.join(__dirname, 'data', 'images')
    const bannerData = [
      {
        eyebrow: 'India\u2019s Premium Men\u2019s Wellness Brand',
        title: 'Last longer. Feel stronger.',
        sub: 'Doctor-verified solutions for performance, stamina and confidence. Discreetly delivered.',
        cta: 'Shop Products',
        link: '#shop',
        imageFile: 'banner1.jpg',
        order: 1,
      },
      {
        eyebrow: 'Clinically Dosed Capsules & Oils',
        title: 'Build real stamina, naturally.',
        sub: 'Ashwagandha, Shilajit and more \u2014 backed by science and trusted by 1,00,000+ men.',
        cta: 'Explore Range',
        link: '#shop',
        imageFile: 'banner2.jpg',
        order: 2,
      },
      {
        eyebrow: '100% Private & Discreet',
        title: 'Confidence, delivered to your door.',
        sub: 'Plain packaging, free fast delivery and 24/7 support. Shop with total privacy.',
        cta: 'Shop Now',
        link: '#shop',
        imageFile: 'banner3.jpg',
        order: 3,
      },
    ]

    for (const b of bannerData) {
      let image = ''
      const filePath = path.join(imagesDir, b.imageFile)
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath)
        const bucket = getGFSBucket()
        const ext = path.extname(b.imageFile).slice(1) || 'jpg'
        const ct = `image/${ext === 'jpg' ? 'jpeg' : ext}`
        const uploadStream = bucket.openUploadStream(b.imageFile, { contentType: ct })
        await new Promise((resolve, reject) => {
          uploadStream.on('error', reject)
          uploadStream.on('finish', resolve)
          uploadStream.end(buffer)
        })
        image = `/api/images/${uploadStream.id}`
      }
      await Banner.create({ eyebrow: b.eyebrow, title: b.title, sub: b.sub, cta: b.cta, link: b.link, image, order: b.order })
    }
    console.log('Banners seeded automatically')
  } catch (err) {
    console.error('Banner auto-seed failed:', err.message)
  }
}

connectDB().then(() => seedBannersOnStartup())

app.use(cors({
  origin: true,
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/api/health', (req, res) => {
  const dbState = require('mongoose').connection.readyState
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }
  res.status(200).json({ status: 'ok', message: 'Backend is running', db: states[dbState] || dbState })
})

const imageCache = new Map()
const IMAGE_CACHE_MAX = 100
const IMAGE_CACHE_MAX_BYTES = 80 * 1024 * 1024

function readGridFSBuffer(bucket, fileId) {
  return new Promise((resolve, reject) => {
    const stream = bucket.openDownloadStream(fileId)
    const chunks = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

app.get('/api/images/:id', async (req, res) => {
  try {
    const fileId = req.params.id
    const cached = imageCache.get(fileId)
    if (cached) {
      res.set('Content-Type', cached.contentType)
      res.set('Content-Length', cached.buffer.length)
      res.set('Cache-Control', 'public, max-age=604800, immutable')
      res.set('ETag', `"${fileId}"`)
      if (req.headers['if-none-match'] === `"${fileId}"`) {
        return res.status(304).end()
      }
      return res.end(cached.buffer)
    }

    const bucket = getGFSBucket()
    const objectId = new ObjectId(fileId)

    const files = await bucket.find({ _id: objectId }).toArray()
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'Image not found' })
    }

    const file = files[0]
    const buffer = await readGridFSBuffer(bucket, objectId)
    const contentType = file.contentType || 'image/jpeg'

    imageCache.set(fileId, { buffer, contentType, at: Date.now() })
    let totalBytes = 0
    for (const entry of imageCache.values()) totalBytes += entry.buffer.length
    while (imageCache.size > IMAGE_CACHE_MAX || totalBytes > IMAGE_CACHE_MAX_BYTES) {
      let oldestId = null
      let oldestAt = Infinity
      for (const [key, entry] of imageCache.entries()) {
        if (entry.at < oldestAt) {
          oldestAt = entry.at
          oldestId = key
        }
      }
      if (!oldestId) break
      totalBytes -= imageCache.get(oldestId).buffer.length
      imageCache.delete(oldestId)
    }

    res.set('Content-Type', contentType)
    res.set('Content-Length', buffer.length)
    res.set('Cache-Control', 'public, max-age=604800, immutable')
    res.set('ETag', `"${fileId}"`)

    if (req.headers['if-none-match'] === `"${fileId}"`) {
      return res.status(304).end()
    }

    res.end(buffer)
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
app.use('/api/banners', require('./routes/bannerRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
