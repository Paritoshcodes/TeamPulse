/**
 * Workspace Management Routes
 * Admin-only operations: rename, delete
 */
import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspaceOwner, requireWorkspaceAdmin } from '../middleware/rbac.middleware.js';
import { requireWorkspaceMember } from '../middleware/workspace.middleware.js';
import Workspace from '../models/Workspace.js';
import Team from '../models/Team.js';
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

function isWorkspaceOwner(workspace, userId) {
    return workspace.owner.toString() === userId.toString();
}

router.get('/:id/settings', requireWorkspaceMember, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.workspace._id)
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar username')
            .lean();

        const currentUserId = req.user._id.toString();
        const owner = workspace.owner?._id?.toString() === currentUserId;
        const admin = owner || workspace.members.some((m) => m.user?._id?.toString() === currentUserId && m.role === 'admin');

        res.json({
            success: true,
            workspace,
            permissions: {
                canManageWorkspace: admin,
                canManageMembers: admin,
                canTransferOwnership: owner,
            },
        });
    } catch (err) {
        console.error('Get workspace settings error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.patch(
    '/:id/settings',
    requireWorkspaceAdmin,
    [
        body('name').optional().trim().notEmpty().isLength({ max: 100 }).withMessage('Name too long'),
        body('description').optional().isString().isLength({ max: 500 }).withMessage('Description too long'),
        body('avatar').optional().isString().isLength({ max: 500 }).withMessage('Avatar URL too long'),
        body('settings.allowMemberInvites').optional().isBoolean().withMessage('allowMemberInvites must be boolean'),
        body('settings.defaultMemberRole').optional().isIn(['member', 'guest']).withMessage('defaultMemberRole must be member or guest'),
    ],
    handleValidation,
    async (req, res) => {
        try {
            const workspace = req.workspace;
            const { name, description, avatar, settings } = req.body || {};

            if (!workspace.settings) {
                workspace.settings = {
                    allowMemberInvites: false,
                    defaultMemberRole: 'member',
                };
            }

            if (typeof name === 'string' && name.trim()) {
                workspace.name = name.trim();
            }
            if (typeof description === 'string') {
                workspace.description = description.trim();
            }
            if (typeof avatar === 'string') {
                workspace.avatar = avatar.trim();
            }
            if (settings && typeof settings === 'object') {
                if (typeof settings.allowMemberInvites === 'boolean') {
                    workspace.settings.allowMemberInvites = settings.allowMemberInvites;
                }
                if (['member', 'guest'].includes(settings.defaultMemberRole)) {
                    workspace.settings.defaultMemberRole = settings.defaultMemberRole;
                }
            }

            await workspace.save();

            const populated = await Workspace.findById(workspace._id)
                .populate('owner', 'name email avatar')
                .populate('members.user', 'name email avatar username')
                .lean();

            res.json({ success: true, workspace: populated });
        } catch (err) {
            console.error('Update workspace settings error:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

router.patch(
    '/:id/members/:memberId/role',
    requireWorkspaceAdmin,
    [
        param('memberId').isMongoId().withMessage('Invalid member id'),
        body('role').isIn(['admin', 'member', 'guest']).withMessage('Invalid role'),
    ],
    handleValidation,
    async (req, res) => {
        try {
            const workspace = req.workspace;
            const { memberId } = req.params;
            const { role } = req.body;
            const currentUserId = req.user._id.toString();

            if (workspace.owner.toString() === memberId.toString()) {
                return res.status(400).json({ success: false, message: 'Cannot change owner role' });
            }

            const memberIndex = workspace.members.findIndex((m) => m.user.toString() === memberId.toString());
            if (memberIndex < 0) {
                return res.status(404).json({ success: false, message: 'Member not found' });
            }

            const actingOwner = isWorkspaceOwner(workspace, currentUserId);
            const targetMember = workspace.members[memberIndex];

            if (!actingOwner && targetMember.role === 'admin' && role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Only owner can demote another admin' });
            }

            workspace.members[memberIndex].role = role;
            await workspace.save();

            const populated = await Workspace.findById(workspace._id)
                .populate('owner', 'name email avatar')
                .populate('members.user', 'name email avatar username')
                .lean();

            res.json({ success: true, workspace: populated });
        } catch (err) {
            console.error('Update member role error:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

router.delete(
    '/:id/members/:memberId',
    requireWorkspaceAdmin,
    [param('memberId').isMongoId().withMessage('Invalid member id')],
    handleValidation,
    async (req, res) => {
        try {
            const workspace = req.workspace;
            const { memberId } = req.params;
            const currentUserId = req.user._id.toString();

            if (workspace.owner.toString() === memberId.toString()) {
                return res.status(400).json({ success: false, message: 'Cannot remove owner from workspace' });
            }

            const target = workspace.members.find((m) => m.user.toString() === memberId.toString());
            if (!target) {
                return res.status(404).json({ success: false, message: 'Member not found' });
            }

            if (target.role === 'admin' && !isWorkspaceOwner(workspace, currentUserId)) {
                return res.status(403).json({ success: false, message: 'Only owner can remove admins' });
            }

            workspace.members = workspace.members.filter((m) => m.user.toString() !== memberId.toString());
            await workspace.save();

            const populated = await Workspace.findById(workspace._id)
                .populate('owner', 'name email avatar')
                .populate('members.user', 'name email avatar username')
                .lean();

            res.json({ success: true, workspace: populated });
        } catch (err) {
            console.error('Remove workspace member error:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

router.delete('/:id/leave', requireWorkspaceMember, async (req, res) => {
    try {
        const workspace = req.workspace;
        const currentUserId = req.user._id.toString();

        if (isWorkspaceOwner(workspace, currentUserId)) {
            return res.status(400).json({ success: false, message: 'Owner cannot leave workspace. Transfer ownership first.' });
        }

        workspace.members = workspace.members.filter((m) => m.user.toString() !== currentUserId);
        await workspace.save();

        res.json({ success: true, message: 'You left the workspace' });
    } catch (err) {
        console.error('Leave workspace error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.patch(
    '/:id/transfer-owner',
    requireWorkspaceOwner,
    [body('newOwnerId').isMongoId().withMessage('Invalid new owner id')],
    handleValidation,
    async (req, res) => {
        try {
            const workspace = req.workspace;
            const { newOwnerId } = req.body;
            const currentOwnerId = req.user._id.toString();

            if (newOwnerId.toString() === currentOwnerId) {
                return res.status(400).json({ success: false, message: 'New owner is already current owner' });
            }

            const nextOwner = await User.findById(newOwnerId).select('_id');
            if (!nextOwner) {
                return res.status(404).json({ success: false, message: 'Target user not found' });
            }

            const isMember = workspace.members.some((m) => m.user.toString() === newOwnerId.toString());
            if (!isMember) {
                return res.status(400).json({ success: false, message: 'New owner must be a workspace member' });
            }

            workspace.owner = newOwnerId;
            const mappedMembers = workspace.members.map((m) => {
                if (m.user.toString() === newOwnerId.toString()) return { ...m.toObject(), role: 'admin' };
                if (m.user.toString() === currentOwnerId) return { ...m.toObject(), role: 'admin' };
                return m.toObject();
            });

            if (!mappedMembers.some((m) => m.user.toString() === currentOwnerId)) {
                mappedMembers.push({ user: currentOwnerId, role: 'admin', source: 'workspace' });
            }

            workspace.members = mappedMembers;

            await workspace.save();

            const populated = await Workspace.findById(workspace._id)
                .populate('owner', 'name email avatar')
                .populate('members.user', 'name email avatar username')
                .lean();

            res.json({ success: true, workspace: populated });
        } catch (err) {
            console.error('Transfer owner error:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

// Rename workspace (owner/admin only)
router.patch(
    '/:id/rename',
    requireWorkspaceAdmin,
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
            const workspace = req.workspace;

            workspace.name = name;
            await workspace.save();

            res.json({
                success: true,
                message: 'Workspace renamed successfully',
                workspace: {
                    _id: workspace._id,
                    name: workspace.name,
                    slug: workspace.slug,
                }
            });
        } catch (err) {
            console.error('Rename workspace error:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

// Delete workspace (owner only)
router.delete(
    '/:id',
    requireWorkspaceOwner,
    async (req, res) => {
        try {
            const workspace = req.workspace;

            // Find all teams in this workspace
            const teams = await Team.find({ workspace: workspace._id });
            const teamIds = teams.map(t => t._id);

            // Find all channels in these teams
            const channels = await Channel.find({ team: { $in: teamIds } });
            const channelIds = channels.map(c => c._id);

            // Delete all messages in these channels
            await Message.deleteMany({ channel: { $in: channelIds } });

            // Delete all channels
            await Channel.deleteMany({ team: { $in: teamIds } });

            // Delete all teams
            await Team.deleteMany({ workspace: workspace._id });

            // Delete the workspace
            await Workspace.findByIdAndDelete(workspace._id);

            res.json({
                success: true,
                message: 'Workspace deleted successfully',
                deletedWorkspaceId: workspace._id.toString()
            });
        } catch (err) {
            console.error('Delete workspace error:', err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

export default router;
