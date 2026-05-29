const express = require('express');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const AppError = require('../utils/appError');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const { auditLog } = require('../middleware/audit');
const Product = require('../models/Product');

const router = express.Router();

// GET /api/v2/listings - Moderation queue
router.get('/', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status = 'pending', search } = req.query;
  const query = {};
  if (status !== 'all') query.status = status;
  if (search) query.title = { $regex: search, $options: 'i' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [listings, total] = await Promise.all([
    Product.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)).lean(),
    Product.countDocuments(query)
  ]);

  sendResponse(res, 200, {
    listings: listings.map(l => ({ ...l, id: l._id })),
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
  });
}));

// GET /api/v2/listings/stats
router.get('/stats', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const [pending, approved, rejected, featured] = await Promise.all([
    Product.countDocuments({ status: 'pending' }),
    Product.countDocuments({ status: 'approved' }),
    Product.countDocuments({ status: 'rejected' }),
    Product.countDocuments({ featured: true })
  ]);
  sendResponse(res, 200, { pending, approved, rejected, featured });
}));

// PATCH /api/v2/listings/:id/approve
router.patch('/:id/approve', authenticate, requireAdmin, auditLog('LISTING_APPROVE', { targetType: 'listing' }), catchAsync(async (req, res) => {
  const listing = await Product.findByIdAndUpdate(req.params.id, { status: 'approved', moderatedAt: new Date() }, { new: true });
  if (!listing) throw new AppError('İlan bulunamadı.', 404);
  sendResponse(res, 200, { listing: { ...listing.toObject(), id: listing._id } }, 'İlan onaylandı.');
}));

// PATCH /api/v2/listings/:id/reject
router.patch('/:id/reject', authenticate, requireAdmin, auditLog('LISTING_REJECT', { targetType: 'listing' }), catchAsync(async (req, res) => {
  const { reason } = req.body;
  const listing = await Product.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectReason: reason, moderatedAt: new Date() }, { new: true });
  if (!listing) throw new AppError('İlan bulunamadı.', 404);
  sendResponse(res, 200, { listing: { ...listing.toObject(), id: listing._id } }, 'İlan reddedildi.');
}));

// PATCH /api/v2/listings/:id/feature
router.patch('/:id/feature', authenticate, requireAdmin, auditLog('LISTING_FEATURED', { targetType: 'listing' }), catchAsync(async (req, res) => {
  const { featured } = req.body;
  const listing = await Product.findByIdAndUpdate(req.params.id, { featured: !!featured }, { new: true });
  if (!listing) throw new AppError('İlan bulunamadı.', 404);
  sendResponse(res, 200, { listing: { ...listing.toObject(), id: listing._id } }, featured ? 'İlan öne çıkarıldı.' : 'Öne çıkarma kaldırıldı.');
}));

module.exports = router;
