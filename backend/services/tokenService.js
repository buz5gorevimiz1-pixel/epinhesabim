const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'itemci_secret_123_gizli_anahtar';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'itemci_refresh_secret_456_gizli_anahtar';

const ACCESS_TOKEN_EXPIRY = '15m';    // 15 dakika
const REFRESH_TOKEN_EXPIRY = '7d';    // 7 gün

// In-memory refresh token store (production'da Redis kullanın)
const refreshTokens = new Map();

function generateAccessToken(payload) {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(payload) {
  const tokenId = crypto.randomUUID();
  const token = jwt.sign(
    { ...payload, type: 'refresh', tokenId },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  
  refreshTokens.set(tokenId, {
    userId: payload.id,
    token,
    createdAt: new Date(),
  });
  
  return { token, tokenId };
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  const stored = refreshTokens.get(decoded.tokenId);
  if (!stored) {
    throw new Error('Refresh token revoked');
  }
  return decoded;
}

function revokeRefreshToken(tokenId) {
  return refreshTokens.delete(tokenId);
}

function revokeAllUserTokens(userId) {
  for (const [id, data] of refreshTokens.entries()) {
    if (data.userId === String(userId)) {
      refreshTokens.delete(id);
    }
  }
}

function generateTokens(user) {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  };
  
  const accessToken = generateAccessToken(payload);
  const { token: refreshToken, tokenId } = generateRefreshToken(payload);
  
  return {
    accessToken,
    refreshToken,
    tokenId,
    expiresIn: 900, // 15 dakika (saniye)
  };
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  generateTokens,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
};
