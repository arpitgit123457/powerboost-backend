const mongoose = require('mongoose')
const dns = require('dns')
require('dotenv').config()

dns.setServers(['8.8.8.8', '8.8.4.4'])

let gfsBucket = null

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI)
    console.log(`MongoDB connected: ${conn.connection.host}`)

    const db = conn.connection.db
    gfsBucket = new (require('mongodb').GridFSBucket)(db, { bucketName: 'uploads' })
    console.log('GridFS bucket initialized')

    return conn
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

const getGFSBucket = () => {
  if (!gfsBucket) throw new Error('GridFS bucket not initialized. Call connectDB first.')
  return gfsBucket
}

module.exports = { connectDB, getGFSBucket }
