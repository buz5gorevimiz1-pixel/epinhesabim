const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userEmail: String,
  type: {
    type: String,
    required: true,
    enum: ['deposit', 'withdrawal', 'purchase', 'sale', 'refund', 'commission', 'bonus', 'penalty']
  },
  amount: { type: Number, required: true },
  balanceAfter: Number,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'flagged'],
    default: 'pending'
  },
  description: String,
  paymentMethod: String,
  externalRef: String,
  fraudFlags: [String],
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
