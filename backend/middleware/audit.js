const AuditLog = require('../models/AuditLog');

function auditLog(action, options = {}) {
  return async (req, res, next) => {
    const originalJson = res.json;
    res.json = function(body) {
      res.json = originalJson;
      res.json(body);

      if (options.onlyOnSuccess !== false || body.success !== false) {
        const log = new AuditLog({
          action,
          targetType: options.targetType || req.params.targetType,
          targetId: options.getTargetId ? options.getTargetId(req) : (req.params.id || req.body.userId || req.body.id),
          adminId: req.user?.id || req.user?._id || 'unknown',
          adminEmail: req.user?.email,
          adminRole: req.user?.role,
          details: {
            body: sanitizeBody(req.body),
            params: req.params,
            query: req.query,
            result: body.success,
            ...options.extraDetails
          },
          ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        });
        log.save().catch(() => {});
      }
    };
    next();
  };
}

function sanitizeBody(body) {
  if (!body) return {};
  const clone = { ...body };
  delete clone.password;
  delete clone.passwordHash;
  delete clone.token;
  return clone;
}

module.exports = { auditLog };
