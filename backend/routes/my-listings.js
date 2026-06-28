const express = require('express');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { authenticate } = require('../middleware/auth');
const Product = require('../models/Product');

const router = express.Router();

// GET /api/v2/my-listings - Get user's own listings
router.get('/', authenticate, catchAsync(async (req, res) => {
  const { status = 'all', search } = req.query;
  // Use whichever ID is available
  const userId = req.user.id || req.user._id || req.user.userId;
  console.log('my-listings userId:', userId);
  console.log('my-listings req.user:', req.user);
  console.log('my-listings status:', status);
  console.log('my-listings search:', search);
  console.log('my-listings req.query:', req.query);

  const query = { sellerId: userId };
  console.log('my-listings initial query:', query);

  if (status !== 'all') {
    // Map frontend status to backend status
    const statusMap = {
      'aktif': 'active',
      'pasif': 'hidden',
      'satildi': 'sold'
    };
    if (status === 'satildi') {
      query.$or = [{ status: 'sold' }, { saleStatus: 'sold' }, { saleStatus: 'reserved' }];
    } else {
      query.status = statusMap[status] || status;
    }
    console.log('my-listings query with status:', query);
  }

  if (search) {
    query.title = { $regex: search, $options: 'i' };
    console.log('my-listings query with search:', query);
  }

  const listings = await Product.find(query)
    .sort('-createdAt')
    .lean();

  console.log('my-listings found listings count:', listings.length);
  console.log('my-listings found listings:', listings);

  // Map backend status to frontend status
  const mappedListings = listings.map(l => ({
    id: l._id.toString(),
    title: l.title,
    category: l.category || 'Diğer',
    price: l.price || 0,
    stock: l.stock || 0,
    status: (l.saleStatus === 'sold' || l.saleStatus === 'reserved') ? 'satildi' : mapStatusToFrontend(l.status),
    image: l.image || (l.images && l.images[0]) || 'https://via.placeholder.com/150/1a1625/a855f7?text=No+Image',
    description: l.description || '',
    createdAt: l.createdAt
  }));

  sendResponse(res, 200, { listings: mappedListings });
}));

// PATCH /api/v2/my-listings/:id - Update listing
router.patch('/:id', authenticate, catchAsync(async (req, res) => {
  const { title, description, price, stock } = req.body;
  // Use whichever ID is available
  const userId = req.user.id || req.user._id || req.user.userId;
  console.log('PATCH my-listings id:', req.params.id);
  console.log('PATCH my-listings userId:', userId);
  console.log('PATCH my-listings body:', req.body);

  const updateData = { title, description, price };
  if (stock !== undefined && stock !== null && stock !== '') {
    updateData.stock = parseInt(stock);
  }
  console.log('PATCH my-listings updateData:', updateData);

  const listing = await Product.findOneAndUpdate(
    { _id: req.params.id, sellerId: userId },
    updateData,
    { new: true }
  );

  console.log('PATCH my-listings updated listing:', listing);

  if (!listing) {
    return sendResponse(res, 404, null, 'İlan bulunamadı.');
  }

  const mappedListing = {
    id: listing._id.toString(),
    title: listing.title,
    category: listing.category || 'Diğer',
    price: listing.price || 0,
    stock: listing.stock || 0,
    status: mapStatusToFrontend(listing.status),
    image: listing.images && listing.images[0] ? listing.images[0] : 'https://via.placeholder.com/150/1a1625/a855f7?text=No+Image',
    description: listing.description || ''
  };

  sendResponse(res, 200, { listing: mappedListing }, 'İlan başarıyla güncellendi.');
}));

// DELETE /api/v2/my-listings/:id - Delete listing
router.delete('/:id', authenticate, catchAsync(async (req, res) => {
  // Use whichever ID is available
  const userId = req.user.id || req.user._id || req.user.userId;
  
  const listing = await Product.findOneAndDelete({
    _id: req.params.id,
    sellerId: userId
  });
  
  if (!listing) {
    return sendResponse(res, 404, null, 'İlan bulunamadı.');
  }

  sendResponse(res, 200, {}, 'İlan başarıyla silindi.');
}));

// Helper function to map backend status to frontend status
function mapStatusToFrontend(backendStatus) {
  const statusMap = {
    'active': 'aktif',
    'hidden': 'pasif',
    'sold': 'satildi',
    'pending': 'pasif', // Onay bekleyenler yayında değil
    'rejected': 'pasif',
    'removed': 'satildi',
    'approved': 'aktif' // Onaylananlar aktif satışta
  };
  return statusMap[backendStatus] || 'aktif';
}

module.exports = router;
