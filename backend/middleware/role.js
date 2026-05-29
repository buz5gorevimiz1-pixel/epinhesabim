const sendResponse = require('../utils/sendResponse');

const ADMIN_ROLES = ['admin', 'super_admin', 'support_admin', 'moderator', 'finance_admin', 'security_admin'];
const SUPER_ADMIN_ROLES = ['super_admin'];
const FINANCE_ROLES = ['super_admin', 'admin', 'finance_admin'];
const MODERATOR_ROLES = ['super_admin', 'admin', 'moderator'];
const SECURITY_ROLES = ['super_admin', 'admin', 'security_admin'];

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res, 401, null, 'Oturum gerekli.');
    }
    
    if (!roles.includes(req.user.role)) {
      return sendResponse(res, 403, null, 'Bu işlem için yetkiniz yok.');
    }
    
    next();
  };
}

const requireAdmin = requireRole(...ADMIN_ROLES);
const requireSuperAdmin = requireRole(...SUPER_ADMIN_ROLES);
const requireFinance = requireRole(...FINANCE_ROLES);
const requireModerator = requireRole(...MODERATOR_ROLES);
const requireSecurity = requireRole(...SECURITY_ROLES);

module.exports = { requireRole, requireAdmin, requireSuperAdmin, requireFinance, requireModerator, requireSecurity };
