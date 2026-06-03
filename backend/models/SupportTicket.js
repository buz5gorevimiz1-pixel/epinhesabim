const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    index: true,
    default: function () {
      return 'TKT-' + Date.now().toString(36).toUpperCase();
    },
  },
  visitorId: { type: String, index: true }, // Persistent identifier from browser
  visitorSocketId: { type: String }, // Current socket ID (for realtime delivery)
  visitorIp: { type: String },
  visitorBrowser: { type: String },
  visitorDevice: { type: String },
  visitorPage: { type: String },
  subject: { type: String },
  status: {
    type: String,
    enum: ['waiting', 'active', 'closed'],
    default: 'waiting',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAdminName: { type: String },
  messageCount: { type: Number, default: 0 },
  unreadByAdmin: { type: Boolean, default: false },
  unreadByVisitor: { type: Number, default: 0 },
  lastMessagePreview: { type: String, default: '' },
  closedAt: { type: Date },
  reopenedAt: { type: Date },
}, {
  timestamps: true,
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
