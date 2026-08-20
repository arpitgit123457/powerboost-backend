require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { connectDB, getGFSBucket } = require('./config/db')
const Banner = require('./models/Banner')
const { ObjectId } = require('mongodb')

const banners = [
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

const uploadToGridFS = (buffer, filename, contentType) => {
  return new Promise((resolve, reject) => {
    const bucket = getGFSBucket()
    const uploadStream = bucket.openUploadStream(filename, { contentType })
    uploadStream.on('error', reject)
    uploadStream.on('finish', () => {
      resolve({ id: uploadStream.id.toString(), filename })
    })
    uploadStream.end(buffer)
  })
}

const seedBanners = async () => {
  try {
    await connectDB()

    const existing = await Banner.countDocuments()
    if (existing > 0) {
      console.log(`Banners already exist (${existing}), skipping seed`)
      process.exit(0)
    }

    const imagesDir = path.join(__dirname, 'data', 'images')

    for (const banner of banners) {
      const filePath = path.join(imagesDir, banner.imageFile)

      if (!fs.existsSync(filePath)) {
        console.warn(`Warning: ${banner.imageFile} not found at ${filePath}, skipping image`)
        const doc = await Banner.create({
          eyebrow: banner.eyebrow,
          title: banner.title,
          sub: banner.sub,
          cta: banner.cta,
          link: banner.link,
          image: '',
          order: banner.order,
        })
        console.log(`Created banner: ${doc.title} (no image)`)
        continue
      }

      const buffer = fs.readFileSync(filePath)
      const ext = path.extname(banner.imageFile).slice(1) || 'jpg'
      const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`

      const uploaded = await uploadToGridFS(buffer, banner.imageFile, contentType)
      const imageUrl = `/api/images/${uploaded.id}`

      const doc = await Banner.create({
        eyebrow: banner.eyebrow,
        title: banner.title,
        sub: banner.sub,
        cta: banner.cta,
        link: banner.link,
        image: imageUrl,
        order: banner.order,
      })

      console.log(`Created banner: ${doc.title} -> ${imageUrl}`)
    }

    console.log('\nBanner seed complete!')
    process.exit(0)
  } catch (error) {
    console.error(`Banner seed failed: ${error.message}`)
    process.exit(1)
  }
}

seedBanners()
