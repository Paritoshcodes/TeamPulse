/**
 * Message controller: get history by channel (auth + workspace membership)
 */
import Message from '../models/Message.js';
import Channel from '../models/Channel.js';
import Team from '../models/Team.js';
import Workspace from '../models/Workspace.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getIO } from '../sockets/index.js';
import { canAccessChannel } from '../services/channelAccess.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

async function getChannelRole(userId, channelId) {
  const channel = await Channel.findById(channelId);
  if (!channel) return { ok: false, message: 'Channel not found' };

  if (channel.isDM) {
    return { ok: true, channel, role: 'dm' };
  }

  const team = await Team.findById(channel.team);
  if (!team) return { ok: false, message: 'Team not found' };
  const workspace = await Workspace.findById(team.workspace);
  if (!workspace) return { ok: false, message: 'Workspace not found' };

  const uid = userId.toString();
  const isOwner = workspace.owner.toString() === uid;
  const member = workspace.members.find((m) => m.user.toString() === uid);

  if (!isOwner && !member) return { ok: false, message: 'Not a member of this workspace' };

  return { ok: true, channel, role: isOwner ? 'owner' : member.role };
}

async function emitMessageEvent(channel, event, payload) {
  try {
    const io = getIO();
    io.to(`channel:${channel._id.toString()}`).emit(event, payload);

    if (channel.isDM && Array.isArray(channel.dmParticipants)) {
      channel.dmParticipants.forEach((p) => {
        io.to(`user:${p.toString()}`).emit(event, payload);
      });
    }
  } catch (err) {
    console.error('[Message] Emit error:', err);
  }
}

/**
 * GET /api/messages?channelId=&limit=&before=
 * before = message id or createdAt for cursor pagination (optional)
 */
export async function getMessages(req, res, next) {
  try {
    const { channelId, limit, before, includeReplies } = req.query;
    if (!channelId) {
      return res.status(400).json({ success: false, message: 'channelId is required' });
    }
    const access = await canAccessChannel(req.user._id, channelId);
    if (!access.ok) {
      return res.status(access.message === 'Channel not found' ? 404 : 403).json({
        success: false,
        message: access.message,
      });
    }
    const lim = Math.min(parseInt(limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
    const query = { channel: channelId };
    if (!includeReplies) query.parentMessageId = null;
    if (before) {
      const beforeDoc = await Message.findById(before);
      if (beforeDoc) query.createdAt = { $lt: beforeDoc.createdAt };
    }
    const messages = await Message.find(query)
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .limit(lim)
      .lean();
    const ordered = messages.reverse();
    res.json({ success: true, messages: ordered });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/messages/thread/:id
 */
export async function getThreadMessages(req, res, next) {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, MAX_LIMIT);

    const root = await Message.findById(id).populate('sender', 'name email avatar username').lean();
    if (!root) return res.status(404).json({ success: false, message: 'Message not found' });

    const access = await canAccessChannel(req.user._id, root.channel);
    if (!access.ok) {
      return res.status(access.message === 'Channel not found' ? 404 : 403).json({
        success: false,
        message: access.message,
      });
    }

    const threadRootId = root.threadId || root._id;
    const replies = await Message.find({ threadId: threadRootId, parentMessageId: { $ne: null } })
      .populate('sender', 'name email avatar username')
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    res.json({ success: true, root, replies, threadId: threadRootId });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/messages/:id/reply
 */
export async function replyToMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const parent = await Message.findById(id).lean();
    if (!parent) return res.status(404).json({ success: false, message: 'Parent message not found' });

    const access = await canAccessChannel(req.user._id, parent.channel);
    if (!access.ok) {
      return res.status(access.message === 'Channel not found' ? 404 : 403).json({
        success: false,
        message: access.message,
      });
    }

    const threadId = parent.threadId || parent._id;

    const reply = await Message.create({
      content: content.trim().slice(0, 10000),
      channel: parent.channel,
      sender: req.user._id,
      parentMessageId: parent._id,
      threadId,
    });

    await Message.updateOne({ _id: threadId }, { $inc: { replyCount: 1 } });

    const populated = await Message.findById(reply._id)
      .populate('sender', 'name email avatar username')
      .lean();

    const savedMessage = populated;
    const mentionRegex = /@(\w+)/g;
    const mentions = [...String(content || '').matchAll(mentionRegex)].map((match) => match[1]);

    if (mentions.length > 0) {
      const mentionedUsers = await User.find({
        username: { $in: mentions },
        _id: { $ne: req.user._id },
      }).select('_id');

      const mentionTitleName = req.user?.displayName || req.user?.name || 'Someone';
      const notifications = mentionedUsers.map((mentioned) => ({
        recipient: mentioned._id,
        sender: req.user._id,
        type: 'mention',
        title: `${mentionTitleName} mentioned you`,
        message: String(content || '').slice(0, 100),
        relatedMessage: savedMessage?._id,
        relatedChannel: parent.channel,
        read: false,
      }));

      if (notifications.length > 0) {
        const created = await Notification.insertMany(notifications);
        try {
          const io = getIO();
          created.forEach((notif) => {
            io.to(`user:${notif.recipient}`).emit('new_notification', notif);
          });
        } catch {
        }
      }
    }

    const channel = await Channel.findById(parent.channel).select('isDM dmParticipants').lean();
    if (channel) {
      await emitMessageEvent(channel, 'thread:message:new', {
        threadId,
        parentMessageId: parent._id,
        message: populated,
      });
    }

    if (parent.sender.toString() !== req.user._id.toString()) {
      const parentSender = await User.findById(parent.sender).select('_id settings.snoozedChannels').lean();
      const snoozed = (parentSender?.settings?.snoozedChannels || []).some(
        (item) => item.channelId?.toString() === parent.channel.toString() && new Date(item.until).getTime() > Date.now()
      );

      if (!snoozed) {
        const notification = await Notification.create({
          recipient: parent.sender,
          type: 'reply',
          title: `${req.user.name} replied in a thread`,
          message: content.trim().slice(0, 140),
          sender: req.user._id,
          relatedMessage: reply._id,
          relatedChannel: parent.channel,
          actionUrl: '/',
        });

        try {
          const io = getIO();
          io.to(`user:${parent.sender.toString()}`).emit('new_notification', notification);
        } catch {
        }
      }
    }

    res.status(201).json({ success: true, message: populated, threadId });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/messages/:id – update a message (sender only)
 */
export async function updateMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    const access = await canAccessChannel(req.user._id, message.channel);
    if (!access.ok) {
      return res.status(access.message === 'Channel not found' ? 404 : 403).json({
        success: false,
        message: access.message,
      });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the sender can edit this message' });
    }

    message.content = content.trim().slice(0, 10000);
    message.editedAt = new Date();
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'name email')
      .lean();

    const channel = await Channel.findById(message.channel).select('isDM dmParticipants').lean();
    if (channel) await emitMessageEvent(channel, 'message:updated', { message: populated });

    res.json({ success: true, message: populated });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/messages/:id – delete a message (sender or owner/admin)
 */
export async function deleteMessage(req, res, next) {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    const access = await canAccessChannel(req.user._id, message.channel);
    if (!access.ok) {
      return res.status(access.message === 'Channel not found' ? 404 : 403).json({
        success: false,
        message: access.message,
      });
    }

    const roleInfo = await getChannelRole(req.user._id, message.channel);
    if (!roleInfo.ok) {
      return res.status(roleInfo.message === 'Channel not found' ? 404 : 403).json({
        success: false,
        message: roleInfo.message,
      });
    }

    const isSender = message.sender.toString() === req.user._id.toString();
    const canAdminDelete = roleInfo.role === 'owner' || roleInfo.role === 'admin';

    if (!isSender && roleInfo.role !== 'dm' && !canAdminDelete) {
      return res.status(403).json({ success: false, message: 'Not allowed to delete this message' });
    }

    await Message.deleteOne({ _id: message._id });

    if (message.parentMessageId && message.threadId) {
      await Message.updateOne({ _id: message.threadId }, { $inc: { replyCount: -1 } });
    }

    const channel = await Channel.findById(message.channel).select('isDM dmParticipants').lean();
    if (channel) await emitMessageEvent(channel, 'message:deleted', { messageId: message._id, channelId: message.channel });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
