/**
 * Invitation controller functions (ESM)
 */
import Invitation from '../models/Invitation.js';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import Team from '../models/Team.js';
import Channel from '../models/Channel.js';
import Notification from '../models/Notification.js';
import { getIO } from '../sockets/index.js';

export async function getMyInvitations(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const invitations = await Invitation.find({
      inviteeEmail: user.email.toLowerCase(),
      status: 'pending',
    })
      .populate('inviterId', 'name email')
      .populate('workspace', 'name')
      .populate('team', 'name')
      .populate('channel', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, invitations });
  } catch (err) {
    next(err);
  }
}

export async function createInvitation(req, res, next) {
  try {
    const inviterId = req.user && req.user._id;
    const { inviteeEmail, scope, workspaceId, teamId, channelId, role } = req.body;
    if (!inviterId) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (!inviteeEmail || !scope) return res.status(400).json({ success: false, message: 'inviteeEmail and scope required' });

    // validate target based on scope
    let workspace = null;
    let team = null;
    let channel = null;

    if (scope === 'workspace') {
      if (!workspaceId) return res.status(400).json({ success: false, message: 'workspaceId required for workspace invite' });
      workspace = await Workspace.findById(workspaceId);
      if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    } else if (scope === 'team') {
      if (!teamId) return res.status(400).json({ success: false, message: 'teamId required for team invite' });
      team = await Team.findById(teamId);
      if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
      workspace = await Workspace.findById(team.workspace);
      if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    } else if (scope === 'channel') {
      if (!channelId) return res.status(400).json({ success: false, message: 'channelId required for channel invite' });
      channel = await Channel.findById(channelId);
      if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
      team = await Team.findById(channel.team);
      if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
      workspace = await Workspace.findById(team.workspace);
      if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid scope' });
    }

    const uid = inviterId.toString();
    const isOwner = workspace.owner.toString() === uid;
    const inviterMember = workspace.members.find((m) => m.user.toString() === uid);
    if (!isOwner && (!inviterMember || inviterMember.role === 'guest')) {
      return res.status(403).json({ success: false, message: 'Not authorized to invite to this workspace' });
    }

    // --- INSTANT ADDITION LOGIC ---
    // Check if user already exists in system
    const targetUser = await User.findOne({ email: inviteeEmail.toLowerCase() });
    if (targetUser) {
      const targetUserId = targetUser._id.toString();
      const existingWorkspaceMember = workspace.members.find(m => m.user.toString() === targetUserId);

      if (existingWorkspaceMember) {
        // If they are a full Member/Admin, just add them to team/channel directly
        if (existingWorkspaceMember.role !== 'guest') {
          if (scope === 'team') {
            const alreadyInTeam = team.members.find(m => m.user.toString() === targetUserId);
            if (!alreadyInTeam) {
              team.members.push({ user: targetUser._id, role: 'member' });
              await team.save();
            }
            return res.status(200).json({ success: true, message: 'User added to team instantly', instant: true });
          }
          if (scope === 'channel') {
            const alreadyInChannel = (channel.allowedUsers || []).some(id => id.toString() === targetUserId);
            if (!alreadyInChannel) {
              channel.allowedUsers.push(targetUser._id);
              await channel.save();
            }
            return res.status(200).json({ success: true, message: 'User added to channel instantly', instant: true });
          }
          return res.status(400).json({ success: false, message: 'User is already a full member of this workspace' });
        }

        // If they are a Guest, we can only add them instantly to a channel/team if they aren't in it.
        // But if the invite is for "Workspace" (to upgrade them), we proceed with the invitation.
        if (scope === 'workspace') {
          // Proceed to create invitation for upgrade
        } else if (scope === 'team') {
          const alreadyInTeam = team.members.find(m => m.user.toString() === targetUserId);
          if (alreadyInTeam) return res.status(400).json({ success: false, message: 'Guest is already in this team' });
          // Note: We could add guest to team instantly too, but usually invites are preferred for auditing.
          // Let's stick to invitation for guests to be safe, OR allow instant add if already in workspace.
          team.members.push({ user: targetUser._id, role: 'member' });
          await team.save();
          return res.status(200).json({ success: true, message: 'Guest added to team instantly', instant: true });
        } else if (scope === 'channel') {
          const alreadyInChannel = (channel.allowedUsers || []).some(id => id.toString() === targetUserId);
          if (alreadyInChannel) return res.status(400).json({ success: false, message: 'Guest is already in this channel' });
          channel.allowedUsers.push(targetUser._id);
          await channel.save();
          return res.status(200).json({ success: true, message: 'Guest added to channel instantly', instant: true });
        }
      }
    }

    // check existing pending invite for same target
    const query = { inviteeEmail: inviteeEmail.toLowerCase(), status: 'pending' };
    if (scope === 'workspace') query.workspace = workspace._id;
    if (scope === 'team') query.team = team._id;
    if (scope === 'channel') query.channel = channel._id;
    const existing = await Invitation.findOne(query);
    if (existing) return res.status(409).json({ success: false, message: 'An invitation is already pending for this user' });

    // Determine target role: team/channel invites for non-members default to 'guest'
    let targetRole = role || 'member';
    if (scope !== 'workspace') {
      targetRole = 'guest';
    }

    const invitation = await Invitation.create({
      inviterId,
      inviteeEmail: inviteeEmail.toLowerCase(),
      scope,
      workspace: workspace?._id,
      team: team?._id,
      channel: channel?._id,
      role: targetRole,
    });

    if (targetUser) {
      const actionUrl = workspace ? `/` : undefined;
      const notification = await Notification.create({
        recipient: targetUser._id,
        type: 'invitation',
        title: 'New Invitation',
        message: `${req.user.name} invited you to ${workspace?.name || 'TeamPulse'}`,
        sender: inviterId,
        relatedInvitation: invitation._id,
        relatedWorkspace: workspace?._id,
        relatedChannel: channel?._id,
        actionUrl,
      });
      try {
        const io = getIO();
        io.to(`user:${targetUser._id.toString()}`).emit('new_notification', notification);
      } catch (err) {
        console.error('Invite notification emit failed:', err);
      }
    }

    res.status(201).json({ success: true, invitation });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvitation(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const invitation = await Invitation.findById(id);
    if (!invitation) return res.status(404).json({ success: false, message: 'Invitation not found' });
    if (invitation.status !== 'pending') return res.status(400).json({ success: false, message: 'Invitation not pending' });
    if (user.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) {
      return res.status(403).json({ success: false, message: 'This invitation is not for your account' });
    }

    // Grant access depending on scope
    if (invitation.scope === 'workspace') {
      const workspace = await Workspace.findById(invitation.workspace);
      if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });

      const memberIndex = workspace.members.findIndex((m) => m.user.toString() === user._id.toString());
      if (memberIndex === -1) {
        workspace.members.push({ user: user._id, role: invitation.role || 'member' });
      } else {
        // Upgrade existing member (e.g. guest -> member)
        workspace.members[memberIndex].role = invitation.role || 'member';
      }
      await workspace.save();
    } else if (invitation.scope === 'team') {
      const team = await Team.findById(invitation.team);
      if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
      const workspace = await Workspace.findById(team.workspace);

      // ensure workspace membership exists
      const memberIndex = workspace.members.findIndex((m) => m.user.toString() === user._id.toString());
      if (memberIndex === -1) {
        // Guest entry
        workspace.members.push({ user: user._id, role: 'guest', source: 'team' });
        await workspace.save();
      }

      // add to team members
      const alreadyTeamMember = team.members.find((m) => m.user.toString() === user._id.toString());
      if (!alreadyTeamMember) {
        team.members.push({ user: user._id, role: 'member' });
        await team.save();
      }
    } else if (invitation.scope === 'channel') {
      const channel = await Channel.findById(invitation.channel);
      if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
      const team = await Team.findById(channel.team);
      const workspace = await Workspace.findById(team.workspace);

      // ensure workspace membership exists
      const memberIndex = workspace.members.findIndex((m) => m.user.toString() === user._id.toString());
      if (memberIndex === -1) {
        // Guest entry
        workspace.members.push({ user: user._id, role: 'guest', source: 'channel' });
        await workspace.save();
      }

      // ensure team membership exists (even for channel guest, we usually want them in the team list for simplicity, or we can keep them out)
      // For now, let's keep them in the team members list if they are in a channel.
      const alreadyTeamMember = team.members.find((m) => m.user.toString() === user._id.toString());
      if (!alreadyTeamMember) {
        team.members.push({ user: user._id, role: 'member' });
        await team.save();
      }

      // add to channel allowedUsers
      const alreadyAllowed = (channel.allowedUsers || []).some((u) => u.toString() === user._id.toString());
      if (!alreadyAllowed) {
        channel.allowedUsers.push(user._id);
        await channel.save();
      }
    }

    invitation.status = 'accepted';
    await invitation.save();
    // Optionally remove invitation: await Invitation.findByIdAndDelete(id);

    res.json({ success: true, message: 'Invitation accepted' });
  } catch (err) {
    next(err);
  }
}

export async function expireInvitation(req, res, next) {
  try {
    const { id } = req.params;
    const invitation = await Invitation.findById(id);
    if (!invitation) return res.status(404).json({ success: false, message: 'Invitation not found' });
    // Only inviter or workspace owner can expire
    const requester = req.user;
    if (requester) {
      const workspace = await Workspace.findById(invitation.workspace);
      const isOwner = workspace && workspace.owner.toString() === requester._id.toString();
      const isInviter = invitation.inviterId.toString() === requester._id.toString();
      if (!isOwner && !isInviter) return res.status(403).json({ success: false, message: 'Not authorized to expire this invitation' });
    }

    await Invitation.findByIdAndDelete(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}