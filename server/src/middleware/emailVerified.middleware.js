import { requireAuth } from './auth.middleware.js';

export function requireEmailVerified(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
  const verified = req.user.emailVerification && req.user.emailVerification.verified;
  if (!verified) return res.status(403).json({ success: false, message: 'Email verification required' });
  next();
}
