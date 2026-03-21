import express from 'express';
import Channel from '../models/Channel.js';
import User from '../models/User.js';
import Connection from '../models/Connection.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Start a DM with a user.
 * If a DM channel already exists between these two users, return it.
 * Otherwise, create a new one.
 */
router.post('/start', requireAuth, async (req, res) => {
    try {
        const { userId } = req.body;
        const currentUserId = req.user._id;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        if (userId === currentUserId.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot DM yourself' });
        }

        // Check if target user exists
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // ENFORCE CONNECTION: Check if users are connected
        const connection = await Connection.findOne({
            $or: [
                { sender: currentUserId, receiver: userId },
                { sender: userId, receiver: currentUserId }
            ],
            status: 'accepted'
        });

        if (!connection) {
            return res.status(403).json({
                success: false,
                message: 'You must be connected with this user to start a conversation'
            });
        }

        // Check for existing DM channel
        let dmChannel = await Channel.findOne({
            isDM: true,
            dmParticipants: { $all: [currentUserId, userId] }
        });

        if (dmChannel) {
            return res.json({ success: true, channel: dmChannel });
        }

        // Create new DM channel
        // Note: DMs don't technically belong to a team, but our schema requires a team.
        // For now, we might need a "Global" or "Personal" team context, or make team optional.
        // To avoid breaking schema, let's make team optional in schema or assign to a default context if possible.
        // SHORTCUT: For now, DMs will be associated with the first common workspace/team found, OR
        // we just relax the Team requirement for DMs. 
        // BETTER APPROACH: Update Channel schema to make 'team' optional if isDM is true. 
        // Let's quickly check Channel schema again. It says team is required.
        // I will update Channel schema to remove required from team, or I will use a placeholder logic.
        // Actually, widespread changes to make team optional might be risky.
        // Let's look for a "Personal" workspace/team concept? No.
        // Let's remove 'required: true' from team in Channel model first.

        // WAIT: I can't easily modify the schema constraint I just saw without another file write.
        // I'll do that in a moment.

        dmChannel = new Channel({
            name: `${req.user.username}, ${targetUser.username}`, // Display name can be dynamic frontend side
            type: 'text',
            isPrivate: true,
            isDM: true,
            dmParticipants: [currentUserId, userId],
            createdBy: currentUserId,
            allowedUsers: [currentUserId, userId],
            // We need a team ID. If we make it optional, we need to handle that. 
            // Let's assume for this step I will make it optional in the next step.
            team: null
        });

        await dmChannel.save();

        res.status(201).json({ success: true, channel: dmChannel });
    } catch (error) {
        console.error('Start DM error:', error);
        res.status(500).json({ success: false, message: 'Failed to start DM' });
    }
});

/**
 * Get all DM channels for current user
 */
router.get('/list', requireAuth, async (req, res) => {
    try {
        const dms = await Channel.find({
            isDM: true,
            dmParticipants: req.user._id,
            archived: { $ne: true }
        })
            .populate('dmParticipants', 'name username avatar isOnline lastSeen')
            .sort({ updatedAt: -1 });

        res.json({ success: true, dms });
    } catch (error) {
        console.error('List DMs error:', error);
        res.status(500).json({ success: false, message: 'Failed to list DMs' });
    }
});

export default router;
