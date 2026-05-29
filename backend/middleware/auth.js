const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const sendResponse = require('../utils/sendResponse');

const JWT_SECRET = process.env.JWT_SECRET || 'itemci_secret_123_gizli_anahtar';

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendResponse(res, 401, null, 'Token gerekli.');
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendResponse(res, 401, null, 'Token süresi doldu.');
    }
    return sendResponse(res, 401, null, 'Geçersiz token.');
  }
}

function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    }
    next();
  } catch {
    next();
  }
}

module.exports = { authenticate, optionalAuth };
