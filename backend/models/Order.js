const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyerId: {
    type: String,
    required: true
  },

  sellerId: {
    type: String,
    required: true
  },

  productId: {
    type: String,
    required: true
  },

  productName: {
    type: String,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);
