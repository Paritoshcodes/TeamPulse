import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import Workspace from '../models/Workspace.js';
import Team from '../models/Team.js';
import Channel from '../models/Channel.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getOnlineUserIds } from '../sockets/index.js';
import { canAccessChannel } from '../services/channelAccess.js';

const router = Router();
router.use(requireAuth);

async function getWorkspaceScope(userId, workspaceId) {
  const uid = userId.toString();
  const all = await Workspace.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
  }).select('_id owner members name').lean();

  if (workspaceId) {
    const selected = all.find((w) => w._id.toString() === workspaceId.toString());
    if (!selected) return { ok: false, message: 'Workspace not found or inaccessible' };
    return { ok: true, workspaces: [selected] };
  }

  return { ok: true, workspaces: all };
}

router.get('/overview', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const scope = await getWorkspaceScope(req.user._id, workspaceId);
    if (!scope.ok) {
      return res.status(403).json({ success: false, message: scope.message });
    }

    const workspaceIds = scope.workspaces.map((w) => w._id);
    const teams = await Team.find({ workspace: { $in: workspaceIds } }).select('_id workspace name').lean();
    const teamIds = teams.map((t) => t._id);

    const teamChannels = await Channel.find({ team: { $in: teamIds } })
      .select('_id name team isDM dmParticipants')
      .lean();

    const teamChannelsAccess = await Promise.all(
      teamChannels.map(async (channel) => ({
        channel,
        access: await canAccessChannel(req.user._id, channel._id),
      }))
    );
    const accessibleTeamChannels = teamChannelsAccess
      .filter((item) => item.access.ok)
      .map((item) => item.channel);

    const dmChannels = await Channel.find({ isDM: true, dmParticipants: req.user._id })
      .select('_id name isDM dmParticipants')
      .lean();

    const allChannels = [...accessibleTeamChannels, ...dmChannels];
    const channelIds = allChannels.map((c) => c._id);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [messagesToday, unreadCount] = await Promise.all([
      Message.countDocuments({ channel: { $in: channelIds }, createdAt: { $gte: startOfDay } }),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
    ]);

    const timelineRaw = await Message.find({ channel: { $in: channelIds } })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('sender', 'name avatar username')
      .populate('channel', 'name isDM')
      .lean();

    const username = (req.user.username || '').toLowerCase();
    const activityTimeline = timelineRaw.map((item) => {
      const text = item.content || '';
      const mentionTag = username && text.toLowerCase().includes(`@${username}`);
      const hasFiles = Array.isArray(item.attachments) && item.attachments.length > 0;
      let type = 'message';
      if (mentionTag) type = 'mention';
      else if (hasFiles) type = 'file_upload';
      return {
        _id: item._id,
        type,
        content: text,
        createdAt: item.createdAt,
        sender: item.sender,
        channel: item.channel,
      };
    });

    const recentActivity = activityTimeline.slice(0, 5);

    const onlineSet = new Set(getOnlineUserIds());
    const selectedWorkspace = scope.workspaces[0] || null;

    let availability = [];
    let activeUsersNow = 0;

    if (selectedWorkspace) {
      const memberIds = [
        selectedWorkspace.owner,
        ...selectedWorkspace.members.map((m) => m.user),
      ];
      const deduped = Array.from(new Set(memberIds.map((id) => id.toString())));
      const users = await User.find({ _id: { $in: deduped } })
        .select('name avatar username settings.presence')
        .lean();

      availability = users.map((u) => ({
        _id: u._id,
        name: u.name,
        avatar: u.avatar,
        username: u.username,
        status: u?.settings?.presence?.status || 'available',
        online: onlineSet.has(u._id.toString()),
      }));

      activeUsersNow = availability.filter((u) => u.online).length;
    } else {
      activeUsersNow = onlineSet.size;
    }

    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const weeklyAgg = await Message.aggregate([
      { $match: { channel: { $in: channelIds }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            y: { $year: '$createdAt' },
            m: { $month: '$createdAt' },
            d: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
    ]);

    const weeklyMap = new Map(
      weeklyAgg.map((entry) => {
        const date = `${entry._id.y}-${String(entry._id.m).padStart(2, '0')}-${String(entry._id.d).padStart(2, '0')}`;
        return [date, entry.count];
      })
    );

    const weeklyMessages = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(since);
      d.setDate(since.getDate() + idx);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        date: key,
        label: d.toLocaleDateString([], { weekday: 'short' }),
        count: weeklyMap.get(key) || 0,
      };
    });

    const me = await User.findById(req.user._id).select('settings.pinnedConversations settings.presence').lean();
    const pinnedConversations = me?.settings?.pinnedConversations || [];

    const unreadByWorkspace = await Notification.aggregate([
      { $match: { recipient: req.user._id, read: false, relatedWorkspace: { $ne: null } } },
      { $group: { _id: '$relatedWorkspace', count: { $sum: 1 } } },
    ]);
    const workspaceUnread = unreadByWorkspace.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});

    res.json({
      success: true,
      quickStats: {
        messagesToday,
        activeUsersNow,
        unreadCount,
      },
      activityTimeline,
      recentActivity,
      availability,
      weeklyMessages,
      pinnedConversations,
      workspaceUnread,
      status: me?.settings?.presence?.status || 'available',
    });
  } catch (err) {
    console.error('Dashboard overview error:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard overview' });
  }
});

router.patch('/status', async (req, res) => {
  try {
    const status = String(req.body?.status || '').toLowerCase();
    if (!['available', 'busy', 'away'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.settings.presence = {
      status,
      updatedAt: new Date(),
    };
    await user.save();

    res.json({ success: true, status });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

router.post('/pins', async (req, res) => {
  try {
    const kind = String(req.body?.kind || '').toLowerCase();
    const channelId = req.body?.channelId;
    const name = String(req.body?.name || '').slice(0, 100);

    if (!['channel', 'dm'].includes(kind) || !channelId) {
      return res.status(400).json({ success: false, message: 'kind and channelId are required' });
    }

    const channel = await Channel.findById(channelId).select('_id name isDM dmParticipants').lean();
    if (!channel) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const existingIndex = (user.settings.pinnedConversations || []).findIndex(
      (item) => item.channelId.toString() === channelId.toString() && item.kind === kind
    );

    if (existingIndex >= 0) {
      user.settings.pinnedConversations.splice(existingIndex, 1);
    } else {
      user.settings.pinnedConversations.unshift({
        kind,
        channelId,
        name: name || channel.name,
        pinnedAt: new Date(),
      });
      user.settings.pinnedConversations = user.settings.pinnedConversations.slice(0, 20);
    }

    await user.save();

    res.json({ success: true, pinnedConversations: user.settings.pinnedConversations });
  } catch (err) {
    console.error('Toggle pin error:', err);
    res.status(500).json({ success: false, message: 'Failed to update pins' });
  }
});

export default router;
