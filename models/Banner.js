const mongoose = require('mongoose')

const bannerSchema = new mongoose.Schema(
  {
    eyebrow: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      required: true,
    },
    sub: {
      type: String,
      default: '',
    },
    cta: {
      type: String,
      default: 'Shop Now',
    },
    link: {
      type: String,
      default: '#shop',
    },
    image: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Banner', bannerSchema)
