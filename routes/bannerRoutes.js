const express = require('express')
const {
  getBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} = require('../controllers/bannerController')
const { protect, adminOnly } = require('../middleware/authMiddleware')
const { upload } = require('../middleware/uploadMiddleware')

const router = express.Router()

router.get('/', getBanners)
router.get('/all', protect, adminOnly, getAllBanners)
router.post('/', protect, adminOnly, upload.single('image'), createBanner)
router.route('/:id').put(protect, adminOnly, upload.single('image'), updateBanner).delete(protect, adminOnly, deleteBanner)

module.exports = router
