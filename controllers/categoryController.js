const Category = require('../models/Category')
const { uploadToGridFS, deleteFromGridFS } = require('../middleware/uploadMiddleware')

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 })
    res.status(200).json(categories)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' })
    }

    const exists = await Category.findOne({ name: name.trim() })
    if (exists) {
      return res.status(409).json({ message: 'Category already exists' })
    }

    let categoryImage = image || ''
    if (req.file) {
      const uploaded = await uploadToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype)
      categoryImage = `/api/images/${uploaded.id}`
    }

    const category = await Category.create({
      name: name.trim(),
      description: description || '',
      image: categoryImage,
    })

    res.status(201).json(category)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({ message: 'Category not found' })
    }

    const { name, description, image, isActive } = req.body
    if (name) category.name = name.trim()
    if (description !== undefined) category.description = description
    if (isActive !== undefined) category.isActive = isActive === 'true' || isActive === true

    if (req.file) {
      if (category.image && category.image.startsWith('/api/images/')) {
        const oldId = category.image.replace('/api/images/', '')
        await deleteFromGridFS(oldId)
      }
      const uploaded = await uploadToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype)
      category.image = `/api/images/${uploaded.id}`
    } else if (image !== undefined) {
      category.image = image
    }

    const updated = await category.save()
    res.status(200).json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({ message: 'Category not found' })
    }
    if (category.image && category.image.startsWith('/api/images/')) {
      const fileId = category.image.replace('/api/images/', '')
      await deleteFromGridFS(fileId)
    }
    await category.deleteOne()
    res.status(200).json({ message: 'Category deleted', id: req.params.id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
}
