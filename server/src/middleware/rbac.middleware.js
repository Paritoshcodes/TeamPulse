/**
 * RBAC Middleware - Role-Based Access Control
 * Verifies user permissions for workspace/team/channel operations
 */
import Workspace from '../models/Workspace.js';
import Team from '../models/Team.js';
import Channel from '../models/Channel.js';

/**
 * Check if user is workspace owner
 */
export async function requireWorkspaceOwner(req, res, next) {
    try {
        const userId = req.user._id.toString();
        const workspaceId = req.params.id || req.params.workspaceId || req.body.workspaceId;

        if (!workspaceId) {
            return res.status(400).json({ success: false, message: 'Workspace ID required' });
        }

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ success: false, message: 'Workspace not found' });
        }

        const isOwner = workspace.owner.toString() === userId;
        if (!isOwner) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only workspace owners can perform this action.'
            });
        }

        req.workspace = workspace;
        next();
    } catch (err) {
        console.error('RBAC owner check error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

/**
 * Check if user is workspace owner or admin
 */
export async function requireWorkspaceAdmin(req, res, next) {
    try {
        const userId = req.user._id.toString();
        const workspaceId = req.params.id || req.params.workspaceId || req.body.workspaceId;

        if (!workspaceId) {
            return res.status(400).json({ success: false, message: 'Workspace ID required' });
        }

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ success: false, message: 'Workspace not found' });
        }

        const isOwner = workspace.owner.toString() === userId;
        const member = workspace.members.find(m => m.user.toString() === userId);
        const isAdmin = member && member.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only workspace owners and admins can perform this action.'
            });
        }

        req.workspace = workspace;
        req.isOwner = isOwner;
        req.isAdmin = isAdmin;
        next();
    } catch (err) {
        console.error('RBAC admin check error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

/**
 * Check if user is workspace admin for a team operation
 */
export async function requireTeamAdmin(req, res, next) {
    try {
        const userId = req.user._id.toString();
        const teamId = req.params.id || req.params.teamId;

        if (!teamId) {
            return res.status(400).json({ success: false, message: 'Team ID required' });
        }

        const team = await Team.findById(teamId).populate('workspace');
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        const workspace = team.workspace;
        const isOwner = workspace.owner.toString() === userId;
        const member = workspace.members.find(m => m.user.toString() === userId);
        const isAdmin = member && member.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only workspace owners and admins can perform this action.'
            });
        }

        req.team = team;
        req.workspace = workspace;
        next();
    } catch (err) {
        console.error('RBAC team admin check error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

/**
 * Check if user is workspace admin for a channel operation
 */
export async function requireChannelAdmin(req, res, next) {
    try {
        const userId = req.user._id.toString();
        const channelId = req.params.id || req.params.channelId;

        if (!channelId) {
            return res.status(400).json({ success: false, message: 'Channel ID required' });
        }

        const channel = await Channel.findById(channelId).populate({
            path: 'team',
            populate: { path: 'workspace' }
        });

        if (!channel) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        const workspace = channel.team.workspace;
        const isOwner = workspace.owner.toString() === userId;
        const member = workspace.members.find(m => m.user.toString() === userId);
        const isAdmin = member && member.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only workspace owners and admins can perform this action.'
            });
        }

        req.channel = channel;
        req.team = channel.team;
        req.workspace = workspace;
        next();
    } catch (err) {
        console.error('RBAC channel admin check error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}
