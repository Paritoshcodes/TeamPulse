import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Update user settings
router.patch('/settings', requireAuth, async (req, res) => {
    try {
        const { notifications, appearance } = req.body;

        // Construct update object to avoid overwriting other fields
        const update = {};
        if (notifications) update['settings.notifications'] = notifications;
        if (appearance) update['settings.appearance'] = appearance;

        // Use $set to update nested fields efficiently without replacing entire object
        // Or just merge deeply. Mongoose map/object update:
        // Actually, simple way:
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Merge settings
        if (notifications) {
            user.settings.notifications = { ...user.settings.notifications, ...notifications };
        }
        if (appearance) {
            user.settings.appearance = { ...user.settings.appearance, ...appearance };
        }

        await user.save();

        res.json({ success: true, settings: user.settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update profile (name, avatar)
router.patch('/profile', requireAuth, async (req, res) => {
    try {
        const { name, avatar } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (typeof name === 'string' && name.trim()) {
            user.name = name.trim().slice(0, 100);
        }
        if (typeof avatar === 'string') {
            user.avatar = avatar.trim() || null;
        }

        await user.save();

        res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                avatar: user.avatar,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Change password (local auth only)
router.patch('/password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password are required' });
        }

        const user = await User.findById(req.user._id).select('+password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (user.authProvider !== 'local') {
            return res.status(400).json({ success: false, message: 'Password change is only available for local accounts' });
        }

        const ok = await bcrypt.compare(currentPassword, user.password || '');
        if (!ok) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Search users by username
router.get('/search', requireAuth, async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({ success: true, users: [] });
        }

        const searchQuery = q.trim().toLowerCase();

        // Search by username (case-insensitive, partial match)
        const users = await User.find({
            username: { $regex: searchQuery, $options: 'i' }
        })
            .select('name email username avatar')
            .limit(10)
            .lean();

        res.json({ success: true, users });
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
