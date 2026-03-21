/**
 * Team controller: create team, get teams by workspace
 */
import Team from '../models/Team.js';
import Workspace from '../models/Workspace.js';

/**
 * POST /api/teams – body: name, workspaceId. User must be member of workspace.
 */
export async function createTeam(req, res, next) {
  try {
    const { name, workspaceId } = req.body;
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }
    const userId = req.user._id.toString();
    const isOwner = workspace.owner.toString() === userId;
    const member = workspace.members.find((m) => m.user.toString() === userId);
    if (!isOwner && !member) {
      return res.status(403).json({ success: false, message: 'Not a member of this workspace' });
    }
    const team = await Team.create({
      name: name?.trim(),
      workspace: workspace._id,
      createdBy: req.user._id,
    });
    const populated = await Team.findById(team._id)
      .populate('workspace', 'name slug')
      .populate('createdBy', 'name email')
      .lean();
    res.status(201).json({ success: true, team: populated });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(' ');
      return res.status(400).json({ success: false, message: msg || 'Validation failed' });
    }
    next(err);
  }
}

/**
 * GET /api/teams?workspaceId= – teams in workspace. User must be member of workspace.
 */
export async function getTeamsByWorkspace(req, res, next) {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'workspaceId is required' });
    }
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }
    const userId = req.user._id.toString();
    const isOwner = workspace.owner.toString() === userId;
    const memberRecord = workspace.members.find((m) => m.user.toString() === userId);

    if (!isOwner && !memberRecord) {
      return res.status(403).json({ success: false, message: 'Not a member of this workspace' });
    }

    const role = isOwner ? 'owner' : memberRecord.role;

    // Owners and Admins see all teams in the workspace
    if (role === 'owner' || role === 'admin') {
      const teams = await Team.find({ workspace: workspaceId })
        .populate('workspace', 'name slug')
        .populate('createdBy', 'name email')
        .sort({ updatedAt: -1 })
        .lean();
      return res.json({ success: true, teams });
    }

    // Members see all teams they are part of (or all if we want public teams, but current model is invite-only for teams)
    // Actually, based on current model: members see all teams in workspace? 
    // Let's assume Members see all teams in workspace, but Guests only see teams where they have channel access.
    if (role === 'member') {
      const teams = await Team.find({ workspace: workspaceId })
        .populate('workspace', 'name slug')
        .populate('createdBy', 'name email')
        .sort({ updatedAt: -1 })
        .lean();
      return res.json({ success: true, teams });
    }

    // Guest logic:
    const Channel = await import('../models/Channel.js').then(m => m.default);

    // 1. Teams where user is an explicit member
    const explicitTeams = await Team.find({ workspace: workspaceId, 'members.user': userId }).select('_id');
    const explicitTeamIds = explicitTeams.map(t => t._id);

    // 2. Teams associated with channels user is allowed in
    const allowedChannels = await Channel.find({ allowedUsers: userId }).populate('team').lean();
    const teamIdsFromChannels = allowedChannels
      .filter(c => c.team && c.team.workspace.toString() === workspaceId)
      .map(c => c.team._id);

    const mergedTeamIds = [...new Set([...explicitTeamIds, ...teamIdsFromChannels])];

    const teams = await Team.find({ _id: { $in: mergedTeamIds } })
      .populate('workspace', 'name slug')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, teams });
  } catch (err) {
    next(err);
  }
}
