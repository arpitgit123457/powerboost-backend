const Blog = require('../models/Blog')
const { uploadToGridFS, deleteFromGridFS } = require('../middleware/uploadMiddleware')

const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 })
    res.status(200).json(blogs)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      $or: [{ _id: req.params.id }, { slug: req.params.id }],
    })
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' })
    }
    res.status(200).json(blog)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const createBlog = async (req, res) => {
  try {
    const { title, slug, category, date, readTime, desc, body, image } = req.body

    if (!title) {
      return res.status(400).json({ message: 'Title is required' })
    }

    const blogSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const exists = await Blog.findOne({ slug: blogSlug })
    if (exists) {
      return res.status(409).json({ message: 'A blog with this slug already exists' })
    }

    let blogImage = image || ''
    if (req.file) {
      const uploaded = await uploadToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype)
      blogImage = `/api/images/${uploaded.id}`
    }

    const blog = await Blog.create({
      title,
      slug: blogSlug,
      category: category || 'Wellness',
      date: date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      readTime: readTime || '',
      desc: desc || '',
      body: body || '',
      image: blogImage,
    })

    res.status(201).json(blog)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' })
    }

    const { title, slug, category, date, readTime, desc, body, image } = req.body
    if (title !== undefined) blog.title = title
    if (slug !== undefined) blog.slug = slug
    if (category !== undefined) blog.category = category
    if (date !== undefined) blog.date = date
    if (readTime !== undefined) blog.readTime = readTime
    if (desc !== undefined) blog.desc = desc
    if (body !== undefined) blog.body = body

    if (req.file) {
      if (blog.image && blog.image.startsWith('/api/images/')) {
        const oldId = blog.image.replace('/api/images/', '')
        await deleteFromGridFS(oldId)
      }
      const uploaded = await uploadToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype)
      blog.image = `/api/images/${uploaded.id}`
    } else if (image !== undefined) {
      blog.image = image
    }

    const updated = await blog.save()
    res.status(200).json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' })
    }
    if (blog.image && blog.image.startsWith('/api/images/')) {
      const fileId = blog.image.replace('/api/images/', '')
      await deleteFromGridFS(fileId)
    }
    await blog.deleteOne()
    res.status(200).json({ message: 'Blog deleted', id: req.params.id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
}
