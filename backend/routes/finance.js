const express = require('express');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const AppError = require('../utils/appError');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const { auditLog } = require('../middleware/audit');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

const router = express.Router();

// GET /api/v2/finance/transactions
router.get('/transactions', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, type, search } = req.query;
  const query = {};
  if (status) query.status = status;
  if (type) query.type = type;
  if (search) {
    const users = await User.find({ $or: [
      { email: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } }
    ]}).select('_id').lean();
    query.userId = { $in: users.map(u => String(u._id)) };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [transactions, total] = await Promise.all([
    Transaction.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)).lean(),
    Transaction.countDocuments(query)
  ]);

  sendResponse(res, 200, {
    transactions: transactions.map(t => ({ ...t, id: t._id })),
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
  });
}));

// GET /api/v2/finance/stats
router.get('/stats', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [totalVolume, todayVolume, flaggedCount, pendingWithdrawals] = await Promise.all([
    Transaction.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Transaction.aggregate([{ $match: { status: 'completed', createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Transaction.countDocuments({ status: 'flagged' }),
    Withdrawal.countDocuments({ status: 'pending' })
  ]);

  sendResponse(res, 200, {
    totalVolume: totalVolume[0]?.total || 0,
    todayVolume: todayVolume[0]?.total || 0,
    flaggedCount,
    pendingWithdrawals
  });
}));

// GET /api/v2/finance/withdrawals
router.get('/withdrawals', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status = 'pending' } = req.query;
  const query = status === 'all' ? {} : { status };
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [withdrawals, total] = await Promise.all([
    Withdrawal.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)).lean(),
    Withdrawal.countDocuments(query)
  ]);
  sendResponse(res, 200, {
    withdrawals: withdrawals.map(w => ({ ...w, id: w._id })),
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
  });
}));

// PATCH /api/v2/finance/withdrawals/:id/approve
router.patch('/withdrawals/:id/approve', authenticate, requireAdmin, auditLog('WITHDRAWAL_APPROVE', { targetType: 'withdrawal' }), catchAsync(async (req, res) => {
  const w = await Withdrawal.findByIdAndUpdate(req.params.id, { status: 'approved', processedAt: new Date() }, { new: true });
  if (!w) throw new AppError('Talep bulunamadı.', 404);
  sendResponse(res, 200, { withdrawal: { ...w.toObject(), id: w._id } }, 'Çekim onaylandı.');
}));

// PATCH /api/v2/finance/withdrawals/:id/reject
router.patch('/withdrawals/:id/reject', authenticate, requireAdmin, auditLog('WITHDRAWAL_REJECT', { targetType: 'withdrawal' }), catchAsync(async (req, res) => {
  const { reason } = req.body;
  const w = await Withdrawal.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectReason: reason, processedAt: new Date() }, { new: true });
  if (!w) throw new AppError('Talep bulunamadı.', 404);
  sendResponse(res, 200, { withdrawal: { ...w.toObject(), id: w._id } }, 'Çekim reddedildi.');
}));

module.exports = router;
