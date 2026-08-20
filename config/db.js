const mongoose = require('mongoose')
require('dotenv').config()

let gfsBucket = null

const connectDB = async () => {
  try {
    try {
      const dns = require('dns')
      dns.setServers(['8.8.8.8', '8.8.4.4'])
    } catch {}

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    })
    console.log(`MongoDB connected: ${conn.connection.host}`)

    const db = conn.connection.db
    gfsBucket = new (require('mongodb').GridFSBucket)(db, { bucketName: 'uploads' })
    console.log('GridFS bucket initialized')

    return conn
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`)
    throw error
  }
}

const getGFSBucket = () => {
  if (!gfsBucket) throw new Error('GridFS bucket not initialized. Call connectDB first.')
  return gfsBucket
}

module.exports = { connectDB, getGFSBucket }
