const express = require('express')
const {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blogController')
const { protect, adminOnly } = require('../middleware/authMiddleware')
const { upload } = require('../middleware/uploadMiddleware')

const router = express.Router()

router.get('/', getBlogs)
router.get('/:id', getBlog)

router.post('/', protect, adminOnly, upload.single('image'), createBlog)
router.route('/:id').put(protect, adminOnly, upload.single('image'), updateBlog).delete(protect, adminOnly, deleteBlog)

module.exports = router
