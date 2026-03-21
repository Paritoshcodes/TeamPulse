/**
 * Auth controller: register, login, guest, me, logout, Google OAuth callback
 */
import User from '../models/User.js';
import {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  getTokenFromRequest,
} from '../middleware/auth.middleware.js';
import bcrypt from 'bcryptjs';
import emailService from '../services/emailService.js';
import { canSendOtp, canSendPasswordReset } from '../services/rateLimiter.js';

const OTP_EXPIRY_MINUTES = 10;
const RESET_OTP_EXPIRY_MINUTES = 10;
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sendUser(res, user, token) {
  setAuthCookie(res, token);
  const u = user.toJSON ? user.toJSON() : user;
  res.status(200).json({ success: true, user: u });
}

export async function register(req, res, next) {
  try {
    const { name, email, password, username } = req.body;
    const existing = await User.findOne({ email: email?.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Check username if provided
    if (username) {
      const usernameExists = await User.findOne({ username: username.toLowerCase().trim() });
      if (usernameExists) {
        return res.status(400).json({ success: false, message: 'Username already taken' });
      }
    }

    const user = await User.create({
      name: name?.trim(),
      email: email?.toLowerCase()?.trim(),
      password,
      username: username ? username.toLowerCase().trim() : undefined,
      usernameSetAt: username ? new Date() : undefined,
      authProvider: 'local',
      role: 'member',
    });
    // generate OTP and send email (rate-limited)
    try {
      const check = await canSendOtp(user._id.toString());
      if (!check.ok) {
        // do not block registration on rate-limit; log and continue
        console.warn('OTP send rate-limited during register for user', user._id.toString(), check);
      } else {
        const otp = generateOtp();
        const hashed = await bcrypt.hash(otp, 12);
        user.emailVerification = { otp: hashed, expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000), verified: false };
        await user.save();
        // enqueue email send (non-blocking to request flow)
        emailService.sendOtpEmail(user.email, otp).catch((e) => console.error('Send OTP enqueue failed:', e));
      }
    } catch (mailErr) {
      console.error('Failed to send OTP email:', mailErr.message || mailErr);
    }
    const token = signToken(user._id);
    sendUser(res, user, token);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(' ');
      return res.status(400).json({ success: false, message: msg || 'Validation failed' });
    }
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }
    next(err);
  }
}

/**
 * POST /api/auth/send-otp – resend OTP for authenticated user
 */
export async function sendOtp(req, res, next) {
  try {
    const user = req.user;
    if (!user || !user.email) return res.status(400).json({ success: false, message: 'No email to send to' });

    // Rate-limit per user
    const check = await canSendOtp(user._id.toString());
    if (!check.ok) {
      if (check.reason === 'cooldown') {
        res.set('Retry-After', String(check.retryAfter));
        return res.status(429).json({ success: false, message: `Too many requests. Try again in ${check.retryAfter} seconds.` });
      }
      return res.status(429).json({ success: false, message: 'Too many OTP requests, please try again later' });
    }

    const otp = generateOtp();
    const hashed = await bcrypt.hash(otp, 12);
    user.emailVerification = { otp: hashed, expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000), verified: false };
    await user.save();
    // enqueue email send; do not block if enqueue fails
    try {
      await emailService.sendOtpEmail(user.email, otp);
      res.json({ success: true, message: 'OTP sent' });
    } catch (e) {
      console.error('Failed to enqueue OTP email:', e.message || e);
      // Inform client but do not leak mailer errors
      return res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-email – verify OTP for authenticated user
 * body: { otp }
 */
export async function verifyEmail(req, res, next) {
  try {
    const user = req.user;
    const { otp } = req.body;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    // Reload user with OTP field (it has select: false in schema)
    const userWithOtp = await User.findById(user._id).select('+emailVerification.otp');
    if (!userWithOtp || !userWithOtp.emailVerification || !userWithOtp.emailVerification.otp) {
      return res.status(400).json({ success: false, message: 'No OTP found for user' });
    }
    if (!otp || typeof otp !== 'string') return res.status(400).json({ success: false, message: 'OTP required' });
    const now = new Date();
    if (userWithOtp.emailVerification.expiresAt && new Date(userWithOtp.emailVerification.expiresAt) < now) {
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }
    const match = await bcrypt.compare(otp, userWithOtp.emailVerification.otp);
    if (!match) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    userWithOtp.emailVerification.verified = true;
    userWithOtp.emailVerification.otp = undefined;
    userWithOtp.emailVerification.expiresAt = undefined;
    await userWithOtp.save();
    res.json({ success: true, message: 'Email verified' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/request-password-reset
 * body: { email }
 */
export async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+resetPassword.otp');

    // Always respond success to avoid user enumeration
    if (!user || user.authProvider !== 'local') {
      return res.json({ success: true, message: 'If an account exists, a reset code has been sent.' });
    }

    const check = await canSendPasswordReset(user._id.toString());
    if (!check.ok) {
      if (check.reason === 'cooldown') {
        res.set('Retry-After', String(check.retryAfter));
      }
      return res.status(429).json({ success: false, message: 'Too many reset requests. Try again later.' });
    }

    const otp = generateOtp();
    const hashed = await bcrypt.hash(otp, 12);
    user.resetPassword = {
      otp: hashed,
      expiresAt: new Date(Date.now() + RESET_OTP_EXPIRY_MINUTES * 60000),
    };
    await user.save();

    try {
      await emailService.sendPasswordResetEmail(user.email, otp);
    } catch (err) {
      console.error('Failed to send password reset email:', err.message || err);
      return res.status(500).json({ success: false, message: 'Failed to send reset email' });
    }

    return res.json({ success: true, message: 'If an account exists, a reset code has been sent.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 * body: { email, otp, password }
 */
export async function resetPassword(req, res, next) {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ success: false, message: 'Email, code, and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+resetPassword.otp +password');
    if (!user || user.authProvider !== 'local') {
      return res.status(400).json({ success: false, message: 'Invalid reset request' });
    }

    const reset = user.resetPassword;
    if (!reset || !reset.otp) {
      return res.status(400).json({ success: false, message: 'Reset code is invalid or expired' });
    }

    if (reset.expiresAt && new Date(reset.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: 'Reset code expired' });
    }

    const match = await bcrypt.compare(String(otp), reset.otp);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid reset code' });
    }

    user.password = password;
    user.resetPassword = { otp: undefined, expiresAt: undefined };
    await user.save();

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');
    if (!user || user.authProvider !== 'local') {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    user.password = undefined;
    sendUser(res, user, token);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/guest
 */
export async function guest(req, res, next) {
  try {
    const name = `Guest_${Math.random().toString(36).slice(2, 9)}`;
    const user = await User.create({
      name,
      email: null,
      authProvider: 'guest',
      role: 'guest',
    });
    const token = signToken(user._id);
    sendUser(res, user, token);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me – use requireAuth before this
 */
export async function me(req, res) {
  const u = req.user.toJSON ? req.user.toJSON() : req.user;
  res.json({ success: true, user: u });
}

/**
 * POST /api/auth/logout
 */
export function logout(req, res) {
  clearAuthCookie(res);
  res.status(200).json({ success: true, message: 'Logged out' });
}

/**
 * GET /api/auth/socket-token – return token for Socket.io auth (client cannot read httpOnly cookie)
 */
export function socketToken(req, res) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  res.json({ success: true, token });
}

/**
 * GET /api/auth/google/callback – Passport will call this after strategy
 * We create or find user and set cookie + redirect to client with token in query for fallback
 */
export function googleCallback(req, res, next) {
  try {
    const user = req.user;
    const token = signToken(user._id);
    setAuthCookie(res, token);
    const redirect = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${redirect}/auth/callback?token=${token}`);
  } catch (err) {
    next(err);
  }
}
