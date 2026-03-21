import express from 'express';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get user notifications (last 20, unread first)
router.get('/', requireAuth, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ read: 1, createdAt: -1 })
            .limit(20)
            .populate('sender', 'name avatar')
            .populate('relatedChannel', 'name')
            .populate('relatedWorkspace', 'name');

        const unreadCount = await Notification.countDocuments({
            recipient: req.user._id,
            read: false
        });

        res.json({ success: true, notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Mark notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { read: true },
            { new: true }
        );
        res.json({ success: true, notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Mark all as read
router.patch('/read-all', requireAuth, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, read: false },
            { read: true }
        );
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
