const Banner = require('../models/Banner')
const { uploadToGridFS, deleteFromGridFS } = require('../middleware/uploadMiddleware')

const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ active: true }).sort({ order: 1, createdAt: 1 })
    res.status(200).json(banners)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: 1 })
    res.status(200).json(banners)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const createBanner = async (req, res) => {
  try {
    const { eyebrow, title, sub, cta, link, order, active } = req.body

    if (!title) {
      return res.status(400).json({ message: 'Title is required' })
    }

    let image = ''
    if (req.file) {
      const uploaded = await uploadToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype)
      image = `/api/images/${uploaded.id}`
    }

    const banner = await Banner.create({
      eyebrow: eyebrow || '',
      title,
      sub: sub || '',
      cta: cta || 'Shop Now',
      link: link || '#shop',
      image,
      order: Number(order) || 0,
      active: active !== 'false',
    })

    res.status(201).json(banner)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' })
    }

    const { eyebrow, title, sub, cta, link, order, active } = req.body
    if (eyebrow !== undefined) banner.eyebrow = eyebrow
    if (title !== undefined) banner.title = title
    if (sub !== undefined) banner.sub = sub
    if (cta !== undefined) banner.cta = cta
    if (link !== undefined) banner.link = link
    if (order !== undefined) banner.order = Number(order)
    if (active !== undefined) banner.active = active === 'true' || active === true

    if (req.file) {
      if (banner.image && banner.image.startsWith('/api/images/')) {
        const oldId = banner.image.replace('/api/images/', '')
        await deleteFromGridFS(oldId)
      }
      const uploaded = await uploadToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype)
      banner.image = `/api/images/${uploaded.id}`
    }

    const updated = await banner.save()
    res.status(200).json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' })
    }
    if (banner.image && banner.image.startsWith('/api/images/')) {
      const fileId = banner.image.replace('/api/images/', '')
      await deleteFromGridFS(fileId)
    }
    await banner.deleteOne()
    res.status(200).json({ message: 'Banner deleted', id: req.params.id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
}
