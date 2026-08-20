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
      heartbeatFrequencyMS: 10000,
    })
    console.log(`MongoDB connected: ${conn.connection.host}`)

    const db = conn.connection.db
    gfsBucket = new (require('mongodb').GridFSBucket)(db, { bucketName: 'uploads' })
    console.log('GridFS bucket initialized')

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected, attempting reconnect...')
      gfsBucket = null
    })

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected')
      const db = mongoose.connection.db
      gfsBucket = new (require('mongodb').GridFSBucket)(db, { bucketName: 'uploads' })
      console.log('GridFS bucket re-initialized')
    })

    return conn
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`)
  }
}

const getGFSBucket = () => {
  if (!gfsBucket) throw new Error('GridFS bucket not initialized.')
  return gfsBucket
}

module.exports = { connectDB, getGFSBucket }
