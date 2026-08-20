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
app.use('/api/banners', require('./routes/bannerRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
