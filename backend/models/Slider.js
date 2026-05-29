const mongoose = require('mongoose');

const sliderSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  buttonText: { type: String, default: 'Hemen Başla' },
  buttonLink: { type: String, default: '#' },
  desktopImage: { type: String },
  mobileImage: { type: String },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  accentColor: { type: String, default: '#06b6d4' },
  glowColor: { type: String, default: 'rgba(6,182,212,0.3)' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Slider', sliderSchema);
