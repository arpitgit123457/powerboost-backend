const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`)
  error.status = 404
  next(error)
}

const errorHandler = (err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' })
  }
  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({ message: err.message })
  }
  const status = err.status || 500
  res.status(status).json({
    message: err.message || 'Server error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  })
}

module.exports = { notFound, errorHandler }
