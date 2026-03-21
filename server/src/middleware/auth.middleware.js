/**
 * Auth middleware: requireAuth, optionalAuth, requireRole
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_NAME = 'token';

export function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/', httpOnly: true });
}

export function getTokenFromRequest(req) {
  return req.cookies?.[COOKIE_NAME] || req.headers?.authorization?.replace('Bearer ', '');
}

export { COOKIE_NAME };

/**
 * Require authenticated user. Attaches req.user. Fails with 401 if no valid token.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    next(err);
  }
}

/**
 * Optional auth. Attaches req.user if valid token present; does not fail if missing.
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return next();
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
}

/**
 * Require one of the given roles. Use after requireAuth.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}
