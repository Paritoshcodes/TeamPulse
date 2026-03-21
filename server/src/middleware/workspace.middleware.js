/**
 * Workspace middleware: load workspace, require membership, require admin
 */
import Workspace from '../models/Workspace.js';
import Team from '../models/Team.js';
import Channel from '../models/Channel.js';

/**
 * Load workspace by id param and attach to req.workspace.
 * Require that req.user is owner or in members. 403 if not member.
 */
export async function requireWorkspaceMember(req, res, next) {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }
    const userId = req.user._id.toString();
    const isOwner = workspace.owner.toString() === userId;
    const member = workspace.members.find((m) => m.user.toString() === userId);
    if (!isOwner && !member) {
      // Not direct workspace member — check team membership
      const team = await Team.findOne({ workspace: workspace._id, 'members.user': userId }).lean();
      if (!team) {
        // Not a team member — check channel allowedUsers
        const channel = await Channel.findOne({ allowedUsers: userId }).populate({ path: 'team', select: 'workspace' }).lean();
        if (!channel || !channel.team || channel.team.workspace.toString() !== workspace._id.toString()) {
          return res.status(403).json({ success: false, message: 'Not a member of this workspace' });
        }
        // user is allowed on a channel in this workspace
        req.workspace = workspace;
        req.workspaceRole = 'member';
        return next();
      }
      // user is member of a team inside this workspace
      req.workspace = workspace;
      req.workspaceRole = 'member';
      return next();
    }
    req.workspace = workspace;
    req.workspaceRole = isOwner ? 'admin' : member.role;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require workspace admin (owner or member with role admin). Use after requireWorkspaceMember.
 */
export function requireWorkspaceAdmin(req, res, next) {
  if (req.workspaceRole !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}
