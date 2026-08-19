const express = require('express')
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController')
const { protect, adminOnly } = require('../middleware/authMiddleware')
const { upload } = require('../middleware/uploadMiddleware')

const router = express.Router()

router.route('/').get(getCategories).post(protect, adminOnly, upload.single('image'), createCategory)
router.route('/:id').put(protect, adminOnly, upload.single('image'), updateCategory).delete(protect, adminOnly, deleteCategory)

module.exports = router
