const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, index: true },
  sender: {
    type: String,
    enum: ['visitor', 'admin', 'system'],
    required: true,
  },
  senderName: { type: String },
  text: { type: String, required: true },
  read: { type: Boolean, default: false },
}, {
  timestamps: true,
});

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
