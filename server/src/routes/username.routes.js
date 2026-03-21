import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.middleware.js';
import User from '../models/User.js';

const router = Router();

// Rate limiting for username checks (public endpoint)
const checkRateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_CHECKS_PER_WINDOW = 30;

function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const msg = errors.array().map((e) => e.msg).join(' ');
        return res.status(400).json({ success: false, message: msg });
    }
    next();
}

// Check username availability (public, rate-limited)
router.get(
    '/check/:username',
    [
        param('username')
            .trim()
            .toLowerCase()
            .isLength({ min: 3, max: 20 })
            .withMessage('Username must be 3-20 characters')
            .matches(/^[a-z0-9_]+$/)
            .withMessage('Username can only contain lowercase letters, numbers, and underscores'),
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { username } = req.params;
            const clientIp = req.ip || req.connection.remoteAddress;

            // Rate limiting
            const now = Date.now();
            const clientKey = `${clientIp}`;
            const clientChecks = checkRateLimit.get(clientKey) || [];
            const recentChecks = clientChecks.filter(time => now - time < RATE_LIMIT_WINDOW);

            if (recentChecks.length >= MAX_CHECKS_PER_WINDOW) {
                return res.status(429).json({
                    success: false,
                    message: 'Too many requests. Please try again later.'
                });
            }

            recentChecks.push(now);
            checkRateLimit.set(clientKey, recentChecks);

            // Check availability
            const existingUser = await User.findOne({ username });
            const available = !existingUser;

            res.json({ success: true, available, username });
        } catch (err) {
            console.error('Username check error:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

// Set username for current user (authenticated)
router.post(
    '/set',
    requireAuth,
    [
        body('username')
            .trim()
            .toLowerCase()
            .isLength({ min: 3, max: 20 })
            .withMessage('Username must be 3-20 characters')
            .matches(/^[a-z0-9_]+$/)
            .withMessage('Username can only contain lowercase letters, numbers, and underscores'),
    ],
    handleValidation,
    async (req, res) => {
        try {
            const userId = req.user._id;
            const { username } = req.body;

            // Check if user already has a username
            const user = await User.findById(userId);
            if (user.username) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already set. Contact support to change it.'
                });
            }

            // Check if username is taken
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Username is already taken'
                });
            }

            // Set username
            user.username = username;
            user.usernameSetAt = new Date();
            await user.save();

            res.json({
                success: true,
                message: 'Username set successfully',
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    avatar: user.avatar,
                }
            });
        } catch (err) {
            console.error('Set username error:', err);
            if (err.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'Username is already taken'
                });
            }
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

export default router;
