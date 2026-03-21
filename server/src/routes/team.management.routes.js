/**
 * Team Management Routes
 * Admin-only operations: rename, delete
 */
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireTeamAdmin } from '../middleware/rbac.middleware.js';
import Team from '../models/Team.js';
import Channel from '../models/Channel.js';
import Message from '../models/Message.js';

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

// Rename team (workspace owner/admin only)
router.patch(
    '/:id/rename',
    requireTeamAdmin,
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
            const team = req.team;

            team.name = name;
            await team.save();

            res.json({
                success: true,
                message: 'Team renamed successfully',
                team: {
                    _id: team._id,
                    name: team.name,
                    workspace: team.workspace,
                }
            });
        } catch (err) {
            console.error('Rename team error:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

// Delete team (workspace owner/admin only)
router.delete(
    '/:id',
    requireTeamAdmin,
    async (req, res) => {
        try {
            const team = req.team;

            // Find all channels in this team
            const channels = await Channel.find({ team: team._id });
            const channelIds = channels.map(c => c._id);

            // Delete all messages in these channels
            await Message.deleteMany({ channel: { $in: channelIds } });

            // Delete all channels
            await Channel.deleteMany({ team: team._id });

            // Delete the team
            await Team.findByIdAndDelete(team._id);

            res.json({
                success: true,
                message: 'Team deleted successfully',
                deletedTeamId: team._id.toString()
            });
        } catch (err) {
            console.error('Delete team error:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

export default router;
