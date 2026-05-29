const AppError = require('../utils/appError');

function globalErrorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Operational errors (programmed by us)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code || null,
    });
  }

  // Programming or unknown errors
  console.error('ERROR:', err);
  return res.status(500).json({
    success: false,
    message: 'Sunucu hatası.',
    code: 'INTERNAL_ERROR',
  });
}

module.exports = globalErrorHandler;
