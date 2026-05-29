const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

  fullName: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  phone: {
    type: String,
    required: true,
    trim: true
  },

  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user'
  },

  status: {
    type: String,
    enum: ['active', 'pending', 'banned'],
    default: 'active'
  },

  balance: {
    type: Number,
    default: 0
  },

  bio: {
    type: String,
    default: ''
  },

  avatar: {
    type: String,
    default: ''
  },

  verificationStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },

  verificationImage: {
    type: String,
    default: ''
  },

  verificationSubmittedAt: {
    type: Date
  },

  verificationReviewedAt: {
    type: Date
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports =
mongoose.model('User', userSchema);