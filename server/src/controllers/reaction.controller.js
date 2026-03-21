import Message from '../models/Message.js';
import { getIO } from '../sockets/index.js';

/**
 * React to a message
 * POST /api/messages/:id/react
 * body: { emoji: '👍' }
 */
export async function reactToMessage(req, res, next) {
    try {
        const { id } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(id);
        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

        // Ensure "reactions" array exists
        if (!message.reactions) {
            message.reactions = [];
        }

        // Find existing reaction group
        const existingReaction = message.reactions.find(r => r.emoji === emoji);

        if (existingReaction) {
            // Toggle: remove if present, add if not
            const userIndex = existingReaction.users.indexOf(userId);
            if (userIndex > -1) {
                existingReaction.users.splice(userIndex, 1);
                // Remove empty reaction group
                if (existingReaction.users.length === 0) {
                    message.reactions = message.reactions.filter(r => r.emoji !== emoji);
                }
            } else {
                existingReaction.users.push(userId);
            }
        } else {
            // New reaction
            message.reactions.push({ emoji, users: [userId] });
        }

        await message.save();

        // Emit socket event
        const io = getIO();
        io.to(`channel:${message.channel}`).emit('message:reaction', {
            messageId: message._id,
            reactions: message.reactions
        });

        // Return updated reactions
        res.json({ success: true, reactions: message.reactions });
    } catch (error) {
        next(error);
    }
}
