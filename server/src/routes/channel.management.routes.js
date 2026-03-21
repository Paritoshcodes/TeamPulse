/**
 * Channel Management Routes
 * Admin-only operations: rename, delete, view members
 */
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireChannelAdmin } from '../middleware/rbac.middleware.js';
import Channel from '../models/Channel.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const router = Router();
router.use(requireAuth);

function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const msg = errors.array().map((e) => e.msg).join(' ');
        return res.status(400).json({ success: false, message: msg });
    }
    next();
}

// Rename channel (workspace owner/admin only)
router.patch(
    '/:id/rename',
    requireChannelAdmin,
    [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Name is required')
            .isLength({ max: 100 })
            .withMessage('Name too long'),
    ],
    handleValidation,
    async (req, res) => {
        try {
            const { name } = req.body;
            const channel = req.channel;

            channel.name = name;
            await channel.save();

            res.json({
                success: true,
                message: 'Channel renamed successfully',
                channel: {
                    _id: channel._id,
                    name: channel.name,
                    team: channel.team,
                    isPrivate: channel.isPrivate,
                }
            });
        } catch (err) {
            console.error('Rename channel error:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

// Delete channel (workspace owner/admin only)
router.delete(
    '/:id',
    requireChannelAdmin,
    async (req, res) => {
        try {
            const channel = req.channel;

            // Delete all messages in this channel
            await Message.deleteMany({ channel: channel._id });

            // Delete the channel
            await Channel.findByIdAndDelete(channel._id);

            res.json({
                success: true,
                message: 'Channel deleted successfully',
                deletedChannelId: channel._id.toString()
            });
        } catch (err) {
            console.error('Delete channel error:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

// Get channel members (any member can view)
router.get(
    '/:id/members',
    requireAuth,
    async (req, res) => {
        try {
            const channelId = req.params.id;
            const userId = req.user._id.toString();

            const channel = await Channel.findById(channelId).populate({
                path: 'team',
                populate: { path: 'workspace' }
            });

            if (!channel) {
                return res.status(404).json({ success: false, message: 'Channel not found' });
            }

            // Special handling for DMs
            if (channel.isDM) {
                const isParticipant = (channel.dmParticipants || []).some(p => p.toString() === userId);
                if (!isParticipant) {
                    return res.status(403).json({ success: false, message: 'Access denied: Not a participant' });
                }

                const members = await User.find({ _id: { $in: channel.dmParticipants } })
                    .select('name email username avatar')
                    .lean();

                return res.json({
                    success: true,
                    members: members.map(m => ({ ...m, role: 'member', isOwner: false })),
                    channelName: channel.name,
                    isPrivate: true,
                });
            }

            const workspace = channel.team.workspace;

            // Check if user has access to this channel
            const member = workspace.members.find(m => m.user.toString() === userId);
            if (!member) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            // For private channels, check if user is in allowedUsers
            if (channel.isPrivate) {
                const isAllowed = (channel.allowedUsers || []).some(id => id.toString() === userId);
                const isOwner = workspace.createdBy.toString() === userId;
                const isAdmin = member.role === 'admin';

                if (!isAllowed && !isOwner && !isAdmin) {
                    return res.status(403).json({ success: false, message: 'Access denied' });
                }
            }

            // Get members based on channel type
            let memberIds = [];

            if (channel.isPrivate) {
                // Private channel: only allowedUsers
                memberIds = channel.allowedUsers || [];
            } else {
                // Public channel: all workspace members
                memberIds = workspace.members.map(m => m.user);
            }

            // Populate member details
            const members = await User.find({ _id: { $in: memberIds } })
                .select('name email username avatar')
                .lean();

            // Add role information from workspace
            const membersWithRoles = members.map(m => {
                const workspaceMember = workspace.members.find(wm => wm.user.toString() === m._id.toString());
                return {
                    ...m,
                    role: workspaceMember ? workspaceMember.role : 'guest',
                    isOwner: workspace.owner.toString() === m._id.toString(),
                };
            });

            res.json({
                success: true,
                members: membersWithRoles,
                channelName: channel.name,
                isPrivate: channel.isPrivate,
            });
        } catch (err) {
            console.error('Get channel members error:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

export default router;
