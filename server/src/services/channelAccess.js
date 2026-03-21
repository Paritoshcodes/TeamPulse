/**
 * Channel access checks shared by REST and Socket handlers.
 */
import Channel from '../models/Channel.js';
import Team from '../models/Team.js';
import Workspace from '../models/Workspace.js';

export async function canAccessChannel(userId, channelId) {
  const channel = await Channel.findById(channelId);
  if (!channel) return { ok: false, message: 'Channel not found' };

  const uid = userId.toString();

  if (channel.isDM) {
    const isParticipant = (channel.dmParticipants || []).some((p) => p.toString() === uid);
    if (!isParticipant) return { ok: false, message: 'Access denied: Not a participant in this DM' };
    return { ok: true };
  }

  const team = await Team.findById(channel.team);
  if (!team) return { ok: false, message: 'Team not found' };
  const workspace = await Workspace.findById(team.workspace);
  if (!workspace) return { ok: false, message: 'Workspace not found' };

  const isOwner = workspace.owner.toString() === uid;
  const member = workspace.members.find((m) => m.user.toString() === uid);

  if (!isOwner && !member) return { ok: false, message: 'Not a member of this workspace' };
  if (isOwner || member.role === 'admin') return { ok: true };

  if (member.role === 'guest') {
    const isAllowed = (channel.allowedUsers || []).some((id) => id.toString() === uid);
    if (!isAllowed) return { ok: false, message: 'Access denied: Guest access restricted to specific channels' };
    return { ok: true };
  }

  if (channel.isPrivate) {
    const isAllowed = (channel.allowedUsers || []).some((id) => id.toString() === uid);
    if (!isAllowed) return { ok: false, message: 'Access denied: Private channel' };
  }

  return { ok: true };
}
