const bcrypt = require('bcryptjs');
const tokenService = require('./tokenService');
const AppError = require('../utils/appError');

// Mevcut in-memory users referansı (server.js tarafından doldurulacak)
let users = [];
let mongoConnected = false;
let User = null;

function setUsers(u) { users = u; }
function setMongoStatus(status) { mongoConnected = status; }
function setUserModel(model) { User = model; }

async function findUserByIdentifier(identifier) {
  const normalized = String(identifier).toLowerCase().trim();
  
  // Önce memory'den ara
  let user = users.find(
    u => u.email === normalized || u.username === normalized
  );
  
  // MongoDB'den ara (eğer bağlıysa)
  if (!user && mongoConnected && User) {
    try {
      user = await User.findOne({
        $or: [{ email: normalized }, { username: normalized }]
      }).lean();
    } catch (err) {
      console.log('Mongo find error:', err.message);
    }
  }
  
  return user;
}

async function validatePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

async function login(identifier, password) {
  const user = await findUserByIdentifier(identifier);
  
  if (!user) {
    throw new AppError('Kullanıcı bulunamadı.', 401, 'USER_NOT_FOUND');
  }
  
  if (user.status === 'banned') {
    throw new AppError('Hesabınız engellenmiştir.', 403, 'ACCOUNT_BANNED');
  }
  
  const passwordMatch = await validatePassword(password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError('Şifre yanlış.', 401, 'INVALID_PASSWORD');
  }
  
  const tokens = tokenService.generateTokens(user);
  
  return {
    tokens,
    user: {
      id: user._id || user.id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      role: user.role,
      avatar: user.avatar || '',
    },
  };
}

async function adminLogin(identifier, password) {
  const result = await login(identifier, password);
  
  if (result.user.role !== 'admin' && result.user.role !== 'super_admin') {
    throw new AppError('Admin yetkisi yok.', 403, 'NOT_ADMIN');
  }
  
  return result;
}

async function refreshAccessToken(refreshToken) {
  const decoded = tokenService.verifyRefreshToken(refreshToken);
  
  const user = await findUserByIdentifier(decoded.email);
  if (!user || user.status === 'banned') {
    throw new AppError('Geçersiz refresh token.', 401, 'INVALID_REFRESH');
  }
  
  tokenService.revokeRefreshToken(decoded.tokenId);
  
  const tokens = tokenService.generateTokens(user);
  return { tokens, user };
}

async function logout(refreshToken) {
  if (refreshToken) {
    try {
      const decoded = tokenService.verifyRefreshToken(refreshToken);
      tokenService.revokeRefreshToken(decoded.tokenId);
    } catch {
      // Token zaten geçersiz, sorun değil
    }
  }
  return true;
}

function logoutAll(userId) {
  tokenService.revokeAllUserTokens(userId);
  return true;
}

module.exports = {
  setUsers,
  setMongoStatus,
  setUserModel,
  findUserByIdentifier,
  login,
  adminLogin,
  refreshAccessToken,
  logout,
  logoutAll,
};
