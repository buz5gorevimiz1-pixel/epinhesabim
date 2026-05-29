const express = require('express');
const authService = require('../services/authService');
const tokenService = require('../services/tokenService');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { authenticate } = require('../middleware/auth');
const AppError = require('../utils/appError');

const router = express.Router();

// Cookie options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
};

// POST /api/auth/login
router.post('/login', catchAsync(async (req, res) => {
  const { identifier, password } = req.body;
  
  if (!identifier || !password) {
    throw new AppError('Kullanıcı adı/e-posta ve şifre gerekli.', 400, 'MISSING_CREDENTIALS');
  }
  
  const result = await authService.login(identifier, password);
  
  res.cookie('refreshToken', result.tokens.refreshToken, COOKIE_OPTIONS);
  
  sendResponse(res, 200, {
    user: result.user,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    expiresIn: result.tokens.expiresIn,
  }, 'Giriş başarılı.');
}));

// POST /api/auth/admin-login
router.post('/admin-login', catchAsync(async (req, res) => {
  const { identifier, password } = req.body;
  
  if (!identifier || !password) {
    throw new AppError('Bilgiler gerekli.', 400, 'MISSING_CREDENTIALS');
  }
  
  const result = await authService.adminLogin(identifier, password);
  
  res.cookie('refreshToken', result.tokens.refreshToken, COOKIE_OPTIONS);
  
  sendResponse(res, 200, {
    user: result.user,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    expiresIn: result.tokens.expiresIn,
  }, 'Admin girişi başarılı.');
}));

// POST /api/auth/refresh
router.post('/refresh', catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  
  if (!refreshToken) {
    throw new AppError('Refresh token gerekli.', 401, 'MISSING_REFRESH');
  }
  
  const result = await authService.refreshAccessToken(refreshToken);
  
  res.cookie('refreshToken', result.tokens.refreshToken, COOKIE_OPTIONS);
  
  sendResponse(res, 200, {
    user: result.user,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    expiresIn: result.tokens.expiresIn,
  }, 'Token yenilendi.');
}));

// POST /api/auth/logout
router.post('/logout', catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  await authService.logout(refreshToken);
  
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  
  sendResponse(res, 200, null, 'Çıkış yapıldı.');
}));

// POST /api/auth/logout-all
router.post('/logout-all', authenticate, catchAsync(async (req, res) => {
  authService.logoutAll(req.user.id);
  
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  
  sendResponse(res, 200, null, 'Tüm cihazlardan çıkış yapıldı.');
}));

// GET /api/auth/me
router.get('/me', authenticate, catchAsync(async (req, res) => {
  const user = await authService.findUserByIdentifier(req.user.email);
  
  if (!user) {
    throw new AppError('Kullanıcı bulunamadı.', 404, 'USER_NOT_FOUND');
  }
  
  sendResponse(res, 200, {
    id: user._id || user.id,
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    role: user.role,
    avatar: user.avatar || '',
    status: user.status,
  });
}));

module.exports = router;
