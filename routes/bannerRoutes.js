const express = require('express')
const fs = require('fs')
const path = require('path')
const {
  getBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} = require('../controllers/bannerController')
const { protect, adminOnly } = require('../middleware/authMiddleware')
const { upload, uploadToGridFS, deleteFromGridFS } = require('../middleware/uploadMiddleware')
const Banner = require('../models/Banner')
const { getGFSBucket } = require('../config/db')

const router = express.Router()

router.get('/', getBanners)
router.get('/all', protect, adminOnly, getAllBanners)
router.post('/', protect, adminOnly, upload.single('image'), createBanner)
router.route('/:id').put(protect, adminOnly, upload.single('image'), updateBanner).delete(protect, adminOnly, deleteBanner)

router.post('/reseed', protect, adminOnly, async (req, res) => {
  try {
    const oldBanners = await Banner.find()
    for (const b of oldBanners) {
      if (b.image && b.image.startsWith('/api/images/')) {
        await deleteFromGridFS(b.image.replace('/api/images/', ''))
      }
    }
    await Banner.deleteMany({})

    const imagesDir = path.join(__dirname, '..', 'data', 'images')
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

    const created = []
    for (const b of bannerData) {
      let image = ''
      const filePath = path.join(imagesDir, b.imageFile)
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath)
        const ext = path.extname(b.imageFile).slice(1) || 'jpg'
        const ct = `image/${ext === 'jpg' ? 'jpeg' : ext}`
        const uploaded = await uploadToGridFS(buffer, b.imageFile, ct)
        image = `/api/images/${uploaded.id}`
      }
      const doc = await Banner.create({ eyebrow: b.eyebrow, title: b.title, sub: b.sub, cta: b.cta, link: b.link, image, order: b.order })
      created.push(doc)
    }

    res.status(200).json({ message: 'Banners reseeded successfully', count: created.length })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
