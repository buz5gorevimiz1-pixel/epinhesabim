const express = require('express');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const { getRealtimeMetrics, systemState, getVisitorList, getAdminSockets } = require('../services/socketService');

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const AuditLog = require('../models/AuditLog');
const SupportTicket = require('../models/SupportTicket');
const SupportMessage = require('../models/SupportMessage');

const router = express.Router();

function getStartOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/dashboard/stats
router.get('/stats', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const today = getStartOfDay();
  const weekAgo = getStartOfWeek();

  const [
    totalUsers,
    usersToday,
    usersThisWeek,
    totalOrders,
    ordersToday,
    totalRevenueAgg,
    todayRevenueAgg,
    activeListings,
    pendingListings,
    flaggedTransactions,
    pendingWithdrawals,
    realtime
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: today } }),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: today } }),
    Transaction.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Transaction.aggregate([{ $match: { status: 'completed', createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Product.countDocuments({ status: 'approved', saleStatus: 'available' }),
    Product.countDocuments({ status: 'pending' }),
    Transaction.countDocuments({ status: 'flagged' }),
    Withdrawal.countDocuments({ status: 'pending' }),
    Promise.resolve(getRealtimeMetrics()),
  ]);

  // Calculate changes vs last week
  const lastWeekUsers = await User.countDocuments({ createdAt: { $gte: weekAgo, $lt: today } });
  const prevWeekUsers = await User.countDocuments({ createdAt: { $gte: new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000), $lt: weekAgo } });
  const userChange = prevWeekUsers > 0 ? ((lastWeekUsers - prevWeekUsers) / prevWeekUsers * 100).toFixed(1) : lastWeekUsers > 0 ? 100 : 0;

  const prevWeekOrders = await Order.countDocuments({ createdAt: { $gte: new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000), $lt: weekAgo } });
  const lastWeekOrders = await Order.countDocuments({ createdAt: { $gte: weekAgo } });
  const orderChange = prevWeekOrders > 0 ? ((lastWeekOrders - prevWeekOrders) / prevWeekOrders * 100).toFixed(1) : lastWeekOrders > 0 ? 100 : 0;

  sendResponse(res, 200, {
    totalUsers,
    usersToday,
    totalOrders,
    ordersToday,
    totalRevenue: totalRevenueAgg[0]?.total || 0,
    todayRevenue: todayRevenueAgg[0]?.total || 0,
    activeListings,
    pendingListings,
    flaggedCount: flaggedTransactions,
    pendingWithdrawals,
    onlineVisitors: realtime.onlineVisitors,
    supportQueue: realtime.supportQueue,
    activeChats: realtime.activeChats,
    adminOnline: realtime.adminOnline,
    changes: {
      users: parseFloat(userChange),
      orders: parseFloat(orderChange),
    }
  });
}));

// GET /api/v2/dashboard/activities
router.get('/activities', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const [auditLogs, latestOrders, latestUsers] = await Promise.all([
    AuditLog.find().sort('-timestamp').limit(Math.floor(limit / 2)).lean(),
    Order.find().sort('-createdAt').limit(Math.ceil(limit / 3)).lean(),
    User.find().sort('-createdAt').limit(Math.ceil(limit / 3)).lean(),
  ]);

  const activities = [
    ...auditLogs.map(a => ({
      id: a._id,
      type: 'audit',
      title: a.action,
      description: `${a.adminEmail || a.adminId} - ${a.targetType}`,
      createdAt: a.timestamp,
    })),
    ...latestOrders.map(o => ({
      id: o._id,
      type: 'order',
      title: `Sipariş #${o._id.toString().slice(-4)}`,
      description: `${o.productName} - ₺${o.price}`,
      createdAt: o.createdAt,
    })),
    ...latestUsers.map(u => ({
      id: u._id,
      type: 'user',
      title: 'Yeni kayıt',
      description: `${u.fullName || u.username || u.email}`,
      createdAt: u.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);

  sendResponse(res, 200, { activities });
}));

// GET /api/v2/dashboard/visitors
router.get('/visitors', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const visitors = getVisitorList();
  sendResponse(res, 200, { visitors });
}));

// GET /api/v2/dashboard/support-queue
router.get('/support-queue', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const [waiting, active] = await Promise.all([
    SupportTicket.find({ status: 'waiting' }).sort('-createdAt').lean(),
    SupportTicket.find({ status: 'active' }).sort('-updatedAt').lean(),
  ]);
  sendResponse(res, 200, { queue: waiting, active });
}));

// GET /api/v2/dashboard/orders/recent
router.get('/orders/recent', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const orders = await Order.find().sort('-createdAt').limit(limit).lean();
  sendResponse(res, 200, {
    orders: orders.map(o => ({
      id: o._id,
      productName: o.productName || 'Hesap Satışı',
      price: o.price || o.amount || 0,
      status: o.status || 'completed',
      buyer: o.buyerName || o.buyerEmail || 'Misafir',
      seller: o.sellerName || o.sellerEmail || '-',
      createdAt: o.createdAt,
    }))
  });
}));

// GET /api/v2/dashboard/system-status
router.get('/system-status', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const admins = getAdminSockets();
  sendResponse(res, 200, {
    maintenanceMode: systemState.maintenanceMode,
    liveSupportEnabled: systemState.liveSupportEnabled,
    popupEnabled: systemState.popupEnabled,
    widgetEnabled: systemState.widgetEnabled,
    onlineAdmins: admins.length,
    adminSockets: admins.map(a => ({ socketId: a.socketId, connectedAt: a.connectedAt })),
  });
}));

// GET /api/v2/dashboard/fraud-alerts
router.get('/fraud-alerts', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const [flaggedTxns, suspiciousUsers] = await Promise.all([
    Transaction.find({ status: 'flagged' }).sort('-createdAt').limit(limit).lean(),
    User.find({ status: 'suspended', fraudScore: { $gt: 50 } }).sort('-updatedAt').limit(limit).lean(),
  ]);

  const alerts = [
    ...flaggedTxns.map(t => ({
      id: t._id,
      type: 'transaction',
      severity: 'high',
      title: 'Şüpheli İşlem',
      description: `${t.userEmail || t.userId} - ₺${t.amount}`,
      reason: t.flagReason || 'Otomatik fraud tespiti',
      createdAt: t.createdAt,
    })),
    ...suspiciousUsers.map(u => ({
      id: u._id,
      type: 'user',
      severity: u.fraudScore > 80 ? 'critical' : 'medium',
      title: 'Şüpheli Kullanıcı',
      description: `${u.email || u.username}`,
      reason: `Fraud skoru: ${u.fraudScore}`,
      createdAt: u.updatedAt,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);

  sendResponse(res, 200, { alerts });
}));

module.exports = router;
