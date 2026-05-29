const express = require('express');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const Slider = require('../models/Slider');

const router = express.Router();

// Public: active sliders for frontend
router.get('/public', catchAsync(async (req, res) => {
  const now = new Date();
  const sliders = await Slider.find({
    active: true,
    $or: [
      { startDate: { $exists: false } },
      { startDate: null },
      { startDate: { $lte: now } },
    ],
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: now } },
    ],
  }).sort({ order: 1 }).lean();

  sendResponse(res, 200, { sliders });
}));

// Admin: list all sliders
router.get('/', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const sliders = await Slider.find().sort({ order: 1 }).lean();
  sendResponse(res, 200, { sliders });
}));

// Admin: create slider
router.post('/', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const maxOrder = await Slider.findOne().sort('-order').select('order').lean();
  const nextOrder = (maxOrder?.order || 0) + 1;

  const slider = await Slider.create({
    ...req.body,
    order: req.body.order ?? nextOrder,
    createdBy: req.user._id,
  });

  sendResponse(res, 201, { slider }, 'Slider oluşturuldu.');
}));

// Admin: update slider
router.patch('/:id', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const slider = await Slider.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!slider) return sendResponse(res, 404, null, 'Slider bulunamadı.');
  sendResponse(res, 200, { slider }, 'Slider güncellendi.');
}));

// Admin: delete slider
router.delete('/:id', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const slider = await Slider.findByIdAndDelete(req.params.id);
  if (!slider) return sendResponse(res, 404, null, 'Slider bulunamadı.');
  sendResponse(res, 200, null, 'Slider silindi.');
}));

// Admin: reorder sliders
router.post('/reorder', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const { orders } = req.body; // [{ id, order }]
  if (!Array.isArray(orders)) {
    return sendResponse(res, 400, null, 'Geçersiz sıralama verisi.');
  }

  await Promise.all(
    orders.map((item) =>
      Slider.findByIdAndUpdate(item.id, { order: item.order })
    )
  );

  const sliders = await Slider.find().sort({ order: 1 }).lean();
  sendResponse(res, 200, { sliders }, 'Sıralama güncellendi.');
}));

module.exports = router;
