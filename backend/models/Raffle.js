const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  joinedAt: { type: Date, default: Date.now }
});

const raffleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  prize: {
    type: Number,
    required: true,
    min: 0
  },
  ticketPrice: {
    type: Number,
    required: true,
    min: 0
  },
  soldTickets: {
    type: Number,
    default: 0
  },
  totalTickets: {
    type: Number,
    required: true,
    min: 1
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active'
  },
  icon: {
    type: String,
    default: '🎁'
  },
  hot: {
    type: Boolean,
    default: false
  },
  participants: [participantSchema],
  winner: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String },
    avatar: { type: String },
    drawnAt: { type: Date }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

raffleSchema.index({ status: 1 });
raffleSchema.index({ endDate: 1 });

module.exports = mongoose.model('Raffle', raffleSchema);
