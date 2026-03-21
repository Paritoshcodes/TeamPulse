import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import Workspace from '../models/Workspace.js';
import Team from '../models/Team.js';
import Channel from '../models/Channel.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { canAccessChannel } from '../services/channelAccess.js';

const router = Router();
router.use(requireAuth);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseFilters(rawFilters) {
  if (!rawFilters) return {};
  if (typeof rawFilters === 'object') return rawFilters;
  try {
    return JSON.parse(rawFilters);
  } catch {
    return {};
  }
}

async function getScope(userId, workspaceId) {
  const workspaces = await Workspace.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
  }).select('_id owner members').lean();

  const scopedWorkspaces = workspaceId
    ? workspaces.filter((w) => w._id.toString() === workspaceId.toString())
    : workspaces;

  if (!scopedWorkspaces.length) return { workspaces: [], teamIds: [], channelIds: [] };

  const teams = await Team.find({ workspace: { $in: scopedWorkspaces.map((w) => w._id) } }).select('_id workspace').lean();
  const teamIds = teams.map((t) => t._id);

  const channels = await Channel.find({ team: { $in: teamIds } }).select('_id name team').lean();
  const channelsWithAccess = await Promise.all(
    channels.map(async (channel) => ({
      channel,
      access: await canAccessChannel(userId, channel._id),
    }))
  );
  const accessibleChannels = channelsWithAccess
    .filter((item) => item.access.ok)
    .map((item) => item.channel);
  const dmChannels = await Channel.find({ isDM: true, dmParticipants: userId }).select('_id name').lean();

  return {
    workspaces: scopedWorkspaces,
    teamIds,
    channelIds: [...accessibleChannels.map((c) => c._id), ...dmChannels.map((d) => d._id)],
  };
}

router.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, results: { messages: [], people: [], channels: [], files: [] } });
    }

    const filters = parseFilters(req.query.filters);
    const workspaceId = req.query.workspaceId || filters.workspaceId;
    const { channelIds, workspaces } = await getScope(req.user._id, workspaceId);

    if (!channelIds.length && !workspaces.length) {
      return res.json({ success: true, results: { messages: [], people: [], channels: [], files: [] } });
    }

    const regex = new RegExp(escapeRegExp(q), 'i');

    const messageQuery = { channel: { $in: channelIds }, content: { $regex: regex } };
    if (filters.channelId) messageQuery.channel = filters.channelId;
    if (filters.personId) messageQuery.sender = filters.personId;
    if (filters.dateFrom || filters.dateTo) {
      messageQuery.createdAt = {};
      if (filters.dateFrom) messageQuery.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) messageQuery.createdAt.$lte = new Date(filters.dateTo);
    }

    const messageDocs = await Message.find(messageQuery)
      .sort({ createdAt: -1 })
      .limit(40)
      .populate('sender', 'name avatar username')
      .populate('channel', 'name isDM')
      .lean();

    const messages = messageDocs.map((item) => {
      const content = item.content || '';
      const match = content.toLowerCase().indexOf(q.toLowerCase());
      const start = Math.max(0, match - 35);
      const end = Math.min(content.length, match + q.length + 35);
      return {
        _id: item._id,
        sender: item.sender,
        channel: item.channel,
        createdAt: item.createdAt,
        content,
        contextBefore: content.slice(start, Math.max(start, match)),
        contextMatch: match >= 0 ? content.slice(match, match + q.length) : '',
        contextAfter: match >= 0 ? content.slice(match + q.length, end) : '',
      };
    });

    const people = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        { $or: [{ name: { $regex: regex } }, { username: { $regex: regex } }] },
      ],
    })
      .select('name avatar username')
      .limit(20)
      .lean();

    const channels = await Channel.find({
      _id: { $in: channelIds },
      name: { $regex: regex },
    })
      .select('name isDM')
      .limit(20)
      .lean();

    let filesQuery = {
      channel: { $in: channelIds },
      attachments: { $exists: true, $not: { $size: 0 } },
    };
    if (filters.fileType) {
      filesQuery = {
        ...filesQuery,
        content: { $regex: new RegExp(escapeRegExp(filters.fileType), 'i') },
      };
    }

    const files = await Message.find(filesQuery)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('sender', 'name avatar username')
      .populate('channel', 'name isDM')
      .lean();

    res.json({
      success: true,
      results: {
        messages,
        people,
        channels,
        files,
      },
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

export default router;
