const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'USER_BAN', 'USER_UNBAN', 'USER_BALANCE_ADD', 'USER_BALANCE_DEDUCT',
      'USER_ROLE_CHANGE', 'USER_DELETE',
      'LISTING_APPROVE', 'LISTING_REJECT', 'LISTING_FEATURED', 'LISTING_DELETE',
      'WITHDRAWAL_APPROVE', 'WITHDRAWAL_REJECT',
      'SETTINGS_UPDATE', 'POPUP_BROADCAST', 'MAINTENANCE_TOGGLE',
      'LOGIN', 'LOGIN_FAILED', 'LOGOUT'
    ]
  },
  targetType: {
    type: String,
    enum: ['user', 'listing', 'withdrawal', 'system', 'payment'],
  },
  targetId: String,
  adminId: { type: String, required: true },
  adminEmail: String,
  adminRole: String,
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: false });

auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
