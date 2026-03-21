/**
 * Auth routes: register, login, guest, me, logout, Google OAuth
 */
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import passport from 'passport';
import {
  register,
  login,
  guest,
  me,
  logout,
  socketToken,
  googleCallback,
  sendOtp,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const passwordResetRequestValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail(),
];

const passwordResetValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('otp').trim().notEmpty().withMessage('Reset code is required').isLength({ min: 6, max: 6 }).withMessage('Reset code must be 6 digits'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array().map((e) => e.msg).join(' ');
    return res.status(400).json({ success: false, message: msg });
  }
  next();
}

router.post('/register', registerValidation, handleValidation, register);
router.post('/login', loginValidation, handleValidation, login);
router.post('/guest', guest);
router.get('/me', requireAuth, me);
router.get('/socket-token', requireAuth, socketToken);
router.post('/logout', logout);
router.post('/send-otp', requireAuth, sendOtp);
router.post('/verify-email', requireAuth, verifyEmail);
router.post('/request-password-reset', passwordResetRequestValidation, handleValidation, requestPasswordReset);
router.post('/reset-password', passwordResetValidation, handleValidation, resetPassword);

router.get('/google', (req, res, next) => {
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        const message = info?.message || 'Google sign-in failed';
        const redirect = process.env.CLIENT_URL || 'http://localhost:5173';
        return res.redirect(`${redirect}/login?error=${encodeURIComponent(message)}`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  googleCallback
);

export default router;
