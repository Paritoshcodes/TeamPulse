import express from 'express';
import Connection from '../models/Connection.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getIO } from '../sockets/index.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(requireAuth);

/**
 * POST /api/connections/request
 * Send a connection request
 */
router.post('/request', async (req, res, next) => {
    try {
        const { userId } = req.body;
        const senderId = req.user._id;

        if (userId === senderId.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot connect with yourself' });
        }

        // Check for existing connection (any status)
        const existing = await Connection.findOne({
            $or: [
                { sender: senderId, receiver: userId },
                { sender: userId, receiver: senderId }
            ]
        });

        if (existing) {
            if (existing.status === 'accepted') {
                return res.status(400).json({ success: false, message: 'Already connected' });
            }
            if (existing.status === 'pending' && existing.sender.toString() === senderId.toString()) {
                return res.status(400).json({ success: false, message: 'Request already sent' });
            }
            if (existing.status === 'pending') {
                return res.status(400).json({ success: false, message: 'You have a pending request from this user' });
            }
            // If rejected, we allow resending (sender doesn't know it was rejected)
            if (existing.status === 'rejected') {
                existing.status = 'pending';
                existing.sender = senderId;
                existing.receiver = userId;
                await existing.save();
            }
        } else {
            await Connection.create({
                sender: senderId,
                receiver: userId,
                status: 'pending'
            });
        }

        // Create notification for receiver
        const sender = await User.findById(senderId).select('name username');
        const notification = await Notification.create({
            recipient: userId,
            type: 'connection_request',
            title: 'New Connection Request',
            message: `${sender.name} (@${sender.username}) wants to connect with you.`,
            sender: senderId
        });

        // Real-time notification
        try {
            const io = getIO();
            io.to(`user:${userId}`).emit('new_notification', notification);
        } catch (err) { }

        res.json({ success: true, message: 'Connection request sent' });
    } catch (err) {
        console.error('[ConnectionRoute] Request Error:', err);
        res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
});

/**
 * POST /api/connections/accept/:id (Notification ID or Connection sender ID? Let's use sender ID for simplicity)
 */
router.post('/accept/:userId', async (req, res, next) => {
    try {
        const senderId = req.params.userId;
        const receiverId = req.user._id;

        const connection = await Connection.findOne({
            sender: senderId,
            receiver: receiverId,
            status: 'pending'
        });

        if (!connection) {
            return res.status(404).json({ success: false, message: 'Connection request not found' });
        }

        connection.status = 'accepted';
        connection.connectedAt = new Date();
        await connection.save();

        // Clear notification(s)
        await Notification.deleteMany({
            recipient: receiverId,
            sender: senderId,
            type: 'connection_request'
        });

        res.json({ success: true, message: 'Connection accepted' });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/connections/reject/:userId
 */
router.post('/reject/:userId', async (req, res, next) => {
    try {
        const senderId = req.params.userId;
        const receiverId = req.user._id;

        const connection = await Connection.findOne({
            sender: senderId,
            receiver: receiverId,
            status: 'pending'
        });

        if (!connection) {
            return res.status(404).json({ success: false, message: 'Connection request not found' });
        }

        connection.status = 'rejected';
        await connection.save();

        // Clear notification
        await Notification.deleteMany({
            recipient: receiverId,
            sender: senderId,
            type: 'connection_request'
        });

        res.json({ success: true, message: 'Connection request rejected' });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/connections/cancel/:userId
 */
router.post('/cancel/:userId', async (req, res, next) => {
    try {
        const receiverId = req.params.userId;
        const senderId = req.user._id;

        const connection = await Connection.findOne({
            sender: senderId,
            receiver: receiverId,
            status: 'pending'
        });

        if (!connection) {
            return res.status(404).json({ success: false, message: 'Connection request not found' });
        }

        // Delete the connection instead of setting to rejected so sender can try again easily later if they want
        await Connection.deleteOne({ _id: connection._id });

        // Clear notification for receiver
        await Notification.deleteMany({
            recipient: receiverId,
            sender: senderId,
            type: 'connection_request'
        });

        res.json({ success: true, message: 'Connection request cancelled' });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/connections/status/:userId
 */
router.get('/status/:userId', async (req, res, next) => {
    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.user._id;

        const connection = await Connection.findOne({
            $or: [
                { sender: currentUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: currentUserId }
            ]
        });

        if (!connection) {
            return res.json({ success: true, status: 'none' });
        }

        // Return status and who is sender (to differentiate Cancel vs Accept on frontend)
        res.json({
            success: true,
            status: connection.status,
            isSender: connection.sender.toString() === currentUserId.toString()
        });
    } catch (err) {
        console.error('[ConnectionRoute] Status Error:', err);
        res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
});

export default router;
