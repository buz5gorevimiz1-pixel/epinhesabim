const express = require('express');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// GET /api/v2/audit-logs
router.get('/', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const { page = 1, limit = 30, action, adminId, targetType, targetId, from, to } = req.query;
  const query = {};
  if (action) query.action = action;
  if (adminId) query.adminId = adminId;
  if (targetType) query.targetType = targetType;
  if (targetId) query.targetId = targetId;
  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort('-timestamp').skip(skip).limit(parseInt(limit)).lean(),
    AuditLog.countDocuments(query)
  ]);

  sendResponse(res, 200, {
    logs: logs.map(l => ({ ...l, id: l._id })),
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
  });
}));

// GET /api/v2/audit-logs/actions
router.get('/actions', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const actions = await AuditLog.distinct('action');
  sendResponse(res, 200, { actions });
}));

module.exports = router;
