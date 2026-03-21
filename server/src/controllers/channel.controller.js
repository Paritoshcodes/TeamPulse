/**
 * Channel controller: create channel, get channels by team
 */
import Channel from '../models/Channel.js';
import Team from '../models/Team.js';
import Workspace from '../models/Workspace.js';

/**
 * POST /api/channels – body: name, type, teamId. User must be member of workspace.
 */
export async function createChannel(req, res, next) {
  try {
    const { name, type, teamId, isPrivate } = req.body;
    const team = await Team.findById(teamId).populate('workspace');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    const workspace = team.workspace;
    const userId = req.user._id.toString();
    const isOwner = workspace.owner.toString() === userId;
    const member = workspace.members.find((m) => m.user.toString() === userId);
    if (!isOwner && !member) {
      return res.status(403).json({ success: false, message: 'Not a member of this workspace' });
    }

    if (!isOwner && member?.role === 'guest') {
      return res.status(403).json({ success: false, message: 'Guests cannot create channels' });
    }

    const privateChannel = Boolean(isPrivate);

    const channel = await Channel.create({
      name: name?.trim(),
      type: type === 'voice' || type === 'video' ? type : 'text',
      isPrivate: privateChannel,
      allowedUsers: privateChannel ? [req.user._id] : [],
      team: team._id,
      createdBy: req.user._id,
    });
    const populated = await Channel.findById(channel._id)
      .populate('team', 'name workspace')
      .populate('createdBy', 'name email')
      .lean();
    res.status(201).json({ success: true, channel: populated });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(' ');
      return res.status(400).json({ success: false, message: msg || 'Validation failed' });
    }
    next(err);
  }
}

/**
 * GET /api/channels?teamId= – channels in team. User must be member of workspace.
 */
export async function getChannelsByTeam(req, res, next) {
  try {
    const { teamId } = req.query;
    if (!teamId) {
      return res.status(400).json({ success: false, message: 'teamId is required' });
    }
    const team = await Team.findById(teamId).populate('workspace');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    const workspace = team.workspace;
    const userId = req.user._id.toString();
    const isOwner = workspace.owner.toString() === userId;
    const member = workspace.members.find((m) => m.user.toString() === userId);

    if (!isOwner && !member) {
      // Not a workspace member — allow if user has explicit channel access in this team
      const allowedChannels = await Channel.find({ team: teamId, allowedUsers: userId })
        .populate('team', 'name workspace')
        .populate('createdBy', 'name email')
        .sort({ updatedAt: -1 })
        .lean();
      if (!allowedChannels || allowedChannels.length === 0) {
        return res.status(403).json({ success: false, message: 'Not a member of this workspace' });
      }
      return res.json({ success: true, channels: allowedChannels });
    }

    // Role-based filtering
    const role = isOwner ? 'owner' : member.role;

    let query = { team: teamId };

    if (role === 'guest') {
      // Guests only see channels they are explicitly allowed on
      query.allowedUsers = userId;
    } else if (role === 'member') {
      // Members see all public channels OR private ones they are allowed on
      query.$or = [
        { isPrivate: { $ne: true } },
        { allowedUsers: userId }
      ];
    }
    // Owners and Admins see everything in the team (no extra query filters)

    const channels = await Channel.find(query)
      .populate('team', 'name workspace')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, channels });
  } catch (err) {
    next(err);
  }
}
