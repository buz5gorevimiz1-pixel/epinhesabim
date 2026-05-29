const express = require('express');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const AppError = require('../utils/appError');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const { auditLog } = require('../middleware/audit');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Transaction = require('../models/Transaction');

const router = express.Router();

// GET /api/v2/users - List users with pagination & filters
router.get('/', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search, status, role, sort = '-createdAt' } = req.query;
  const query = {};
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } }
    ];
  }
  if (status) query.status = status;
  if (role) query.role = role;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(query).sort(sort).skip(skip).limit(parseInt(limit)).select('-passwordHash').lean(),
    User.countDocuments(query)
  ]);

  sendResponse(res, 200, {
    users: users.map(u => ({ ...u, id: u._id })),
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
  });
}));

// GET /api/v2/users/:id - User detail
router.get('/:id', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash').lean();
  if (!user) throw new AppError('Kullanıcı bulunamadı.', 404);

  const [auditLogs, transactions] = await Promise.all([
    AuditLog.find({ targetType: 'user', targetId: req.params.id }).sort('-timestamp').limit(20).lean(),
    Transaction.find({ userId: req.params.id }).sort('-createdAt').limit(20).lean()
  ]);

  sendResponse(res, 200, {
    user: { ...user, id: user._id },
    auditLogs,
    transactions
  });
}));

// PATCH /api/v2/users/:id/status - Ban/Unban
router.patch('/:id/status', authenticate, requireAdmin, auditLog('USER_BAN', { targetType: 'user', getTargetId: (req) => req.params.id }), catchAsync(async (req, res) => {
  const { status, reason } = req.body;
  if (!['active', 'banned', 'pending'].includes(status)) {
    throw new AppError('Geçersiz durum.', 400);
  }
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-passwordHash');
  if (!user) throw new AppError('Kullanıcı bulunamadı.', 404);
  sendResponse(res, 200, { user: { ...user.toObject(), id: user._id } }, `Kullanıcı ${status === 'banned' ? 'engellendi' : 'aktif edildi'}.`);
}));

// PATCH /api/v2/users/:id/role - Change role
router.patch('/:id/role', authenticate, requireAdmin, auditLog('USER_ROLE_CHANGE', { targetType: 'user' }), catchAsync(async (req, res) => {
  const { role } = req.body;
  const allowedRoles = ['user', 'admin', 'super_admin', 'support_admin', 'moderator', 'finance_admin', 'security_admin'];
  if (!allowedRoles.includes(role)) throw new AppError('Geçersiz rol.', 400);

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-passwordHash');
  if (!user) throw new AppError('Kullanıcı bulunamadı.', 404);
  sendResponse(res, 200, { user: { ...user.toObject(), id: user._id } }, 'Rol güncellendi.');
}));

// PATCH /api/v2/users/:id/balance - Add/deduct balance
router.patch('/:id/balance', authenticate, requireAdmin, auditLog('USER_BALANCE_ADD', { targetType: 'user' }), catchAsync(async (req, res) => {
  const { amount, type, description } = req.body;
  if (!amount || isNaN(amount)) throw new AppError('Geçersiz tutar.', 400);

  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('Kullanıcı bulunamadı.', 404);

  const delta = parseFloat(amount) * (type === 'deduct' ? -1 : 1);
  const newBalance = Math.max(0, (user.balance || 0) + delta);

  user.balance = newBalance;
  await user.save();

  const txn = new Transaction({
    userId: user._id,
    userEmail: user.email,
    type: type === 'deduct' ? 'penalty' : 'bonus',
    amount: Math.abs(delta),
    balanceAfter: newBalance,
    status: 'completed',
    description: description || `Admin ${type === 'deduct' ? 'ceza' : 'bonus'}`,
    metadata: { adminId: req.user.id, reason: description }
  });
  await txn.save();

  sendResponse(res, 200, { user: { ...user.toObject(), id: user._id }, transaction: txn }, 'Bakiye güncellendi.');
}));

// DELETE /api/v2/users/:id
router.delete('/:id', authenticate, requireAdmin, auditLog('USER_DELETE', { targetType: 'user' }), catchAsync(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError('Kullanıcı bulunamadı.', 404);
  sendResponse(res, 200, null, 'Kullanıcı silindi.');
}));

module.exports = router;
