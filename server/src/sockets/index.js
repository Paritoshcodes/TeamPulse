/**
 * Socket.io server – auth, channel rooms, messaging, typing
 */
import { Server } from 'socket.io';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Channel from '../models/Channel.js';
import Team from '../models/Team.js';
import Workspace from '../models/Workspace.js';
import Notification from '../models/Notification.js';
import { canAccessChannel } from '../services/channelAccess.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const HISTORY_LIMIT = 50;
const CALL_RING_TIMEOUT_MS = Number(process.env.CALL_RING_TIMEOUT_MS) || 45000;

function isPrivateNetworkOrigin(origin) {
  try {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;

    const host = parsed.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.startsWith('10.')) return true;
    if (host.startsWith('192.168.')) return true;

    if (host.startsWith('172.')) {
      const parts = host.split('.');
      const secondOctet = Number(parts[1]);
      if (!Number.isNaN(secondOctet) && secondOctet >= 16 && secondOctet <= 31) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function parseAllowedOrigins() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const defaults = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ].filter(Boolean);

  return Array.from(new Set([...defaults, ...fromEnv]));
}

const allowedOrigins = parseAllowedOrigins();

let io = null;
const onlineUsers = new Map(); // userId -> Set of socketIds
const callParticipants = new Map(); // roomId -> Map(socketId -> participant)
const callSessions = new Map(); // roomId -> call session

function parseCallRoom(roomId) {
  if (!roomId || typeof roomId !== 'string') return null;
  const [scope, targetId] = roomId.split(':');
  if (!scope || !targetId) return null;
  if (scope !== 'channel' && scope !== 'dm') return null;
  return { scope, targetId };
}

async function getCallAudienceUserIds(roomId, callerUserId) {
  const parsed = parseCallRoom(roomId);
  if (!parsed) {
    return { ok: false, message: 'Invalid room id' };
  }

  const { targetId } = parsed;
  const access = await canAccessChannel(callerUserId, targetId);
  if (!access.ok) {
    return { ok: false, message: access.message || 'Access denied' };
  }

  const channel = await Channel.findById(targetId)
    .select('isDM dmParticipants isPrivate allowedUsers team')
    .lean();
  if (!channel) {
    return { ok: false, message: 'Channel not found' };
  }

  const recipients = new Set();

  if (channel.isDM) {
    const dmAudience = (channel.dmParticipants || []).map((id) => id?.toString()).filter(Boolean);
    if (dmAudience.length < 2) {
      return { ok: false, message: 'DM channel is missing participants' };
    }

    dmAudience.forEach((userId) => {
      const id = userId?.toString();
      if (id) recipients.add(id);
    });
  } else {
    const team = await Team.findById(channel.team).select('workspace').lean();
    if (!team?.workspace) {
      return { ok: false, message: 'Team not found' };
    }
    const workspace = await Workspace.findById(team.workspace).select('owner members').lean();
    if (!workspace) {
      return { ok: false, message: 'Workspace not found' };
    }

    const ownerId = workspace.owner?.toString();
    if (ownerId) recipients.add(ownerId);

    if (channel.isPrivate) {
      (channel.allowedUsers || []).forEach((userId) => {
        const id = userId?.toString();
        if (id) recipients.add(id);
      });
      (workspace.members || [])
        .filter((member) => member?.role === 'admin')
        .forEach((member) => {
          const id = member?.user?.toString();
          if (id) recipients.add(id);
        });
    } else {
      (workspace.members || []).forEach((member) => {
        const id = member?.user?.toString();
        if (id) recipients.add(id);
      });
    }
  }

  recipients.delete(callerUserId.toString());

  return { ok: true, userIds: Array.from(recipients) };
}

function roomName(channelId) {
  return `channel:${channelId}`;
}

function callRoomName(roomId) {
  return `call:${roomId}`;
}

function getRoomParticipants(roomId) {
  const room = callParticipants.get(roomId);
  if (!room) return [];
  return Array.from(room.values());
}

async function emitMessageToChannelAudience(channelId, message, senderUserId) {
  if (!channelId || !message) return;

  io.to(roomName(channelId)).emit('message:new', { message });

  try {
    const channel = await Channel.findById(channelId).select('isDM dmParticipants').lean();
    if (channel?.isDM && channel.dmParticipants) {
      channel.dmParticipants.forEach((participantId) => {
        const id = participantId?.toString();
        if (!id || id === senderUserId?.toString()) return;
        io.to(`user:${id}`).emit('message:new', { message });
      });
    }
  } catch (err) {
    console.error('[Socket] Failed to notify DM participants for system message:', err);
  }
}

async function createAndBroadcastCallSystemMessage({ roomId, content, senderObjectId, senderUserId }) {
  const parsed = parseCallRoom(roomId);
  if (!parsed?.targetId || !content || !senderObjectId) return;

  const msg = await Message.create({
    content,
    channel: parsed.targetId,
    sender: senderObjectId,
  });

  const populated = await Message.findById(msg._id)
    .populate('sender', 'name email avatar username')
    .lean();

  await emitMessageToChannelAudience(parsed.targetId, populated, senderUserId);
}

async function finalizeCallSessionIfNeeded(roomId) {
  if (!roomId) return;

  const participantsMap = callParticipants.get(roomId);
  if (participantsMap && participantsMap.size > 0) {
    return;
  }

  await endCallSession(roomId, 'ended');
}

function clearCallRingingTimer(session) {
  if (session?.ringingTimer) {
    clearTimeout(session.ringingTimer);
    session.ringingTimer = null;
  }
}

function emitToCallParticipants(session, eventName, payload) {
  if (!session) return;
  session.invitedUserIds.forEach((userId) => {
    io.to(`user:${userId}`).emit(eventName, payload);
  });
  io.to(`user:${session.initiatedByUserId}`).emit(eventName, payload);
  io.to(callRoomName(session.roomId)).emit(eventName, payload);
}

function buildCallSession(roomId, callerUser, audienceUserIds) {
  const parsed = parseCallRoom(roomId);
  return {
    callId: randomUUID(),
    roomId,
    channelId: parsed?.targetId || '',
    scope: parsed?.scope || 'channel',
    initiatedByObjectId: callerUser._id,
    initiatedByUserId: callerUser._id.toString(),
    initiatedByName: callerUser?.name || 'User',
    invitedUserIds: new Set((audienceUserIds || []).map((id) => id.toString())),
    acceptedUserIds: new Set(),
    declinedUserIds: new Set(),
    status: 'ringing',
    startedLogged: false,
    startedAt: new Date().toISOString(),
    ringingTimer: null,
  };
}

function startCallRingingTimer(session) {
  clearCallRingingTimer(session);
  session.ringingTimer = setTimeout(async () => {
    const current = callSessions.get(session.roomId);
    if (!current || current.callId !== session.callId || current.status !== 'ringing') return;
    await endCallSession(session.roomId, 'missed');
  }, CALL_RING_TIMEOUT_MS);
}

async function endCallSession(roomId, reason = 'ended') {
  const session = callSessions.get(roomId);
  if (!session) return;

  if (session.status === 'ended') {
    callSessions.delete(roomId);
    return;
  }

  session.status = 'ended';
  clearCallRingingTimer(session);

  emitToCallParticipants(session, 'call:ended', {
    callId: session.callId,
    roomId: session.roomId,
    reason,
    endedAt: new Date().toISOString(),
  });

  try {
    if (session.startedLogged) {
      await createAndBroadcastCallSystemMessage({
        roomId: session.roomId,
        content: '[Call] Video call ended',
        senderObjectId: session.initiatedByObjectId,
        senderUserId: session.initiatedByUserId,
      });
    }
  } catch (err) {
    console.error('[Socket] Failed to create call ended message:', err);
  }

  callSessions.delete(roomId);
}

async function removeSocketFromAllCallRooms(socket) {
  for (const [roomId, participantsMap] of callParticipants.entries()) {
    if (!participantsMap.has(socket.id)) continue;

    const participant = participantsMap.get(socket.id);
    participantsMap.delete(socket.id);
    socket.leave(callRoomName(roomId));

    socket.to(callRoomName(roomId)).emit('call:user-left', {
      roomId,
      socketId: socket.id,
      userId: participant?.userId,
    });

    if (participantsMap.size === 0) {
      callParticipants.delete(roomId);
      await finalizeCallSessionIfNeeded(roomId);
    }
  }
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        const isDevLanAllowed = process.env.NODE_ENV !== 'production' && origin && isPrivateNetworkOrigin(origin);
        if (!origin || allowedOrigins.includes(origin) || isDevLanAllowed) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('name email emailVerification.verified');
      if (!user) return next(new Error('User not found'));
      socket.data.user = user;
      socket.data.userId = user._id.toString();
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id, socket.data.userId);

    // Join user-specific room for notifications
    socket.join(`user:${socket.data.userId}`);

    // Track online status
    if (!onlineUsers.has(socket.data.userId)) {
      onlineUsers.set(socket.data.userId, new Set());
      // Broadcast user online, but simple debounce? No need for now.
      io.emit('user:online', { userId: socket.data.userId });
    }
    onlineUsers.get(socket.data.userId).add(socket.id);

    // Send current online users to the connected client
    socket.emit('users:online', Array.from(onlineUsers.keys()));

    socket.on('join-channel', async (channelId, cb) => {
      if (!channelId) {
        cb?.({ success: false, message: 'channelId is required' });
        return;
      }
      try {
        const access = await canAccessChannel(socket.data.userId, channelId);
        if (!access.ok) {
          cb?.({ success: false, message: access.message });
          return;
        }
        const room = roomName(channelId);
        await socket.join(room);
        const messages = await Message.find({ channel: channelId })
          .where('parentMessageId').equals(null)
          .populate('sender', 'name email')
          .sort({ createdAt: 1 })
          .limit(HISTORY_LIMIT)
          .lean();
        socket.emit('message:history', { channelId, messages });
        cb?.({ success: true, messages });
      } catch (err) {
        console.error('[Socket] join-channel error:', err);
        cb?.({ success: false, message: err.message || 'Failed to join' });
      }
    });

    socket.on('leave-channel', (channelId) => {
      if (channelId) socket.leave(roomName(channelId));
    });

    socket.on('send-message', async (payload, cb) => {
      const {
        channelId,
        content,
        fileUrl = null,
        fileName = null,
        fileSize = null,
        fileMimeType = null,
      } = payload || {};

      const normalizedContent = typeof content === 'string' ? content.trim().slice(0, 10000) : '';
      const hasFile = Boolean(fileUrl);

      if (!channelId || (!normalizedContent && !hasFile)) {
        cb?.({ success: false, message: 'channelId and either content or file are required' });
        return;
      }
      try {
        const access = await canAccessChannel(socket.data.userId, channelId);
        if (!access.ok) {
          cb?.({ success: false, message: access.message });
          return;
        }
        // require email verified for sending messages
        if (!socket.data.user.emailVerification || !socket.data.user.emailVerification.verified) {
          cb?.({ success: false, message: 'Email verification required to send messages' });
          return;
        }
        const msg = await Message.create({
          content: normalizedContent,
          channel: channelId,
          sender: socket.data.user._id,
          fileUrl,
          fileName,
          fileSize,
          fileMimeType,
        });
        const populated = await Message.findById(msg._id)
          .populate('sender', 'name email avatar username')
          .lean();

        // Mention notifications
        try {
          const mentionMatches = normalizedContent.match(/@([a-z0-9_]{3,20})/gi) || [];
          const mentionUsernames = Array.from(new Set(
            mentionMatches.map((m) => m.slice(1).toLowerCase())
          ));

          if (mentionUsernames.length > 0) {
            const channel = await Channel.findById(channelId)
              .select('isDM isPrivate dmParticipants allowedUsers team')
              .lean();

            let allowedUserIds = new Set();

            if (channel?.isDM) {
              (channel.dmParticipants || []).forEach((p) => allowedUserIds.add(p.toString()));
            } else if (channel?.team) {
              const team = await Team.findById(channel.team).select('workspace').lean();
              if (team?.workspace) {
                const workspace = await Workspace.findById(team.workspace)
                  .select('owner members')
                  .lean();
                if (workspace) {
                  const ownerId = workspace.owner.toString();
                  const adminIds = (workspace.members || [])
                    .filter((m) => m.role === 'admin')
                    .map((m) => m.user.toString());

                  if (channel.isPrivate) {
                    (channel.allowedUsers || []).forEach((u) => allowedUserIds.add(u.toString()));
                    allowedUserIds.add(ownerId);
                    adminIds.forEach((id) => allowedUserIds.add(id));
                  } else {
                    allowedUserIds.add(ownerId);
                    (workspace.members || []).forEach((m) => {
                      allowedUserIds.add(m.user.toString());
                    });
                  }
                }
              }
            }

            const mentionedUsers = await User.find({ username: { $in: mentionUsernames } })
              .select('_id username settings')
              .lean();

            for (const mentioned of mentionedUsers) {
              const mentionedId = mentioned._id.toString();
              if (mentionedId === socket.data.userId) continue;
              if (allowedUserIds.size > 0 && !allowedUserIds.has(mentionedId)) continue;
              if (mentioned?.settings?.notifications?.mentions === false) continue;

              const snoozed = (mentioned?.settings?.snoozedChannels || []).some(
                (item) => item.channelId?.toString() === channelId.toString() && new Date(item.until).getTime() > Date.now()
              );
              if (snoozed) continue;

              const notification = await Notification.create({
                recipient: mentioned._id,
                type: 'mention',
                title: `${socket.data.user.name} mentioned you`,
                message: normalizedContent.slice(0, 140),
                sender: socket.data.user._id,
                relatedMessage: msg._id,
                relatedChannel: channelId,
                actionUrl: '/',
              });

              io.to(`user:${mentionedId}`).emit('new_notification', notification);
            }
          }
        } catch (err) {
          console.error('[Socket] Mention notification error:', err);
        }

        await emitMessageToChannelAudience(channelId, populated, socket.data.userId);

        cb?.({ success: true, message: populated });
      } catch (err) {
        console.error('[Socket] send-message error:', err);
        cb?.({ success: false, message: err.message || 'Failed to send' });
      }
    });

    socket.on('call:join', (payload, cb) => {
      const roomId = payload?.roomId;
      if (!roomId) {
        cb?.({ success: false, message: 'roomId is required' });
        return;
      }

      const session = callSessions.get(roomId);
      if (!session || session.status === 'ended') {
        cb?.({ success: false, message: 'Call session not found' });
        return;
      }

      const userId = socket.data.userId;
      const isInitiator = session.initiatedByUserId === userId;
      const wasInvited = session.invitedUserIds.has(userId);
      const accepted = session.acceptedUserIds.has(userId);

      if (!isInitiator && (!wasInvited || (session.status === 'active' && !accepted))) {
        cb?.({ success: false, message: 'Not allowed to join this call' });
        return;
      }

      const participant = {
        socketId: socket.id,
        userId: socket.data.userId,
        name: socket.data.user?.name || 'User',
        avatar: payload?.avatar || null,
      };

      if (!callParticipants.has(roomId)) {
        callParticipants.set(roomId, new Map());
      }

      const participantsMap = callParticipants.get(roomId);
      const existingParticipants = Array.from(participantsMap.values());
      participantsMap.set(socket.id, participant);

      socket.join(callRoomName(roomId));
      socket.to(callRoomName(roomId)).emit('call:user-joined', { roomId, participant });

      cb?.({ success: true, participants: existingParticipants, self: participant });
    });

    socket.on('call:leave', async (payload, cb) => {
      const roomId = payload?.roomId;
      if (!roomId) {
        cb?.({ success: false, message: 'roomId is required' });
        return;
      }

      const participantsMap = callParticipants.get(roomId);
      if (!participantsMap || !participantsMap.has(socket.id)) {
        cb?.({ success: true });
        return;
      }

      const participant = participantsMap.get(socket.id);
      participantsMap.delete(socket.id);
      socket.leave(callRoomName(roomId));

      socket.to(callRoomName(roomId)).emit('call:user-left', {
        roomId,
        socketId: socket.id,
        userId: participant?.userId,
      });

      if (participantsMap.size === 0) {
        callParticipants.delete(roomId);
        await finalizeCallSessionIfNeeded(roomId);
      }

      cb?.({ success: true });
    });

    socket.on('call:signal', (payload, cb) => {
      const roomId = payload?.roomId;
      const targetSocketId = payload?.targetSocketId;
      const signal = payload?.signal;

      if (!roomId || !targetSocketId || !signal) {
        cb?.({ success: false, message: 'roomId, targetSocketId and signal are required' });
        return;
      }

      const participantsMap = callParticipants.get(roomId);
      if (!participantsMap || !participantsMap.has(socket.id) || !participantsMap.has(targetSocketId)) {
        cb?.({ success: false, message: 'Call participant not found in room' });
        return;
      }

      const senderParticipant = participantsMap.get(socket.id);

      io.to(targetSocketId).emit('call:signal', {
        roomId,
        fromSocketId: socket.id,
        fromUserId: socket.data.userId,
        fromUserName: senderParticipant?.name || socket.data.user?.name || 'User',
        signal,
      });

      cb?.({ success: true });
    });

    socket.on('call:get-participants', (payload, cb) => {
      const roomId = payload?.roomId;
      if (!roomId) {
        cb?.({ success: false, message: 'roomId is required' });
        return;
      }

      cb?.({ success: true, participants: getRoomParticipants(roomId) });
    });

    socket.on('call:respond', async (payload, cb) => {
      const roomId = payload?.roomId;
      const callId = payload?.callId;
      const accept = Boolean(payload?.accept);

      if (!roomId || !callId) {
        cb?.({ success: false, message: 'roomId and callId are required' });
        return;
      }

      const session = callSessions.get(roomId);
      if (!session || session.callId !== callId || session.status === 'ended') {
        cb?.({ success: false, message: 'Call session is no longer available' });
        return;
      }

      const userId = socket.data.userId;
      if (!session.invitedUserIds.has(userId)) {
        cb?.({ success: false, message: 'You are not invited to this call' });
        return;
      }

      if (accept) {
        session.acceptedUserIds.add(userId);
        session.declinedUserIds.delete(userId);
        session.status = 'active';
        clearCallRingingTimer(session);

        emitToCallParticipants(session, 'call:accepted', {
          callId: session.callId,
          roomId: session.roomId,
          userId,
          acceptedAt: new Date().toISOString(),
        });

        cb?.({ success: true, status: 'accepted' });
        return;
      }

      session.declinedUserIds.add(userId);
      emitToCallParticipants(session, 'call:declined', {
        callId: session.callId,
        roomId: session.roomId,
        userId,
        declinedAt: new Date().toISOString(),
      });

      const everyoneDeclined =
        session.acceptedUserIds.size === 0 &&
        session.declinedUserIds.size >= session.invitedUserIds.size;

      if (everyoneDeclined) {
        await endCallSession(roomId, 'declined');
      }

      cb?.({ success: true, status: 'declined' });
    });

    socket.on('call:end', async (payload, cb) => {
      const roomId = payload?.roomId;
      if (!roomId) {
        cb?.({ success: false, message: 'roomId is required' });
        return;
      }

      const session = callSessions.get(roomId);
      if (!session) {
        cb?.({ success: true });
        return;
      }

      const userId = socket.data.userId;
      const authorized =
        userId === session.initiatedByUserId ||
        session.invitedUserIds.has(userId) ||
        session.acceptedUserIds.has(userId);

      if (!authorized) {
        cb?.({ success: false, message: 'Not allowed to end this call' });
        return;
      }

      await endCallSession(roomId, 'ended');
      cb?.({ success: true });
    });

    socket.on('call:invite', async (payload, cb) => {
      const roomId = payload?.roomId;
      if (!roomId) {
        cb?.({ success: false, message: 'roomId is required' });
        return;
      }

      try {
        const audience = await getCallAudienceUserIds(roomId, socket.data.userId);
        if (!audience.ok) {
          cb?.({ success: false, message: audience.message || 'Cannot invite to call' });
          return;
        }

        if (!Array.isArray(audience.userIds) || audience.userIds.length === 0) {
          cb?.({ success: false, message: 'No recipients found for this call' });
          return;
        }

        let session = callSessions.get(roomId);
        const shouldCreateSession = !session || session.status === 'ended';

        if (shouldCreateSession) {
          session = buildCallSession(roomId, socket.data.user, audience.userIds);
          callSessions.set(roomId, session);
          startCallRingingTimer(session);
        }

        if (session.status === 'ringing') {
          session.invitedUserIds = new Set(audience.userIds.map((id) => id.toString()));
          session.declinedUserIds.clear();
        }

        if (!session.startedLogged) {
          try {
            await createAndBroadcastCallSystemMessage({
              roomId,
              content: `[Call] ${socket.data.user?.name || 'User'} started a video call`,
              senderObjectId: socket.data.user._id,
              senderUserId: socket.data.userId,
            });
            session.startedLogged = true;
          } catch (err) {
            console.error('[Socket] Failed to create call started message:', err);
          }
        }

        const incomingPayload = {
          callId: session.callId,
          roomId,
          title: payload?.title || 'Incoming call',
          scope: session.scope,
          from: {
            userId: socket.data.userId,
            name: socket.data.user?.name || 'User',
          },
          createdAt: new Date().toISOString(),
        };

        session.invitedUserIds.forEach((userId) => {
          io.to(`user:${userId}`).emit('call:incoming', incomingPayload);
        });

        cb?.({ success: true, callId: session.callId, recipients: session.invitedUserIds.size });
      } catch (err) {
        console.error('[Socket] call:invite error:', err);
        cb?.({ success: false, message: 'Failed to invite to call' });
      }
    });

    socket.on('call:raise-hand', (payload, cb) => {
      const roomId = payload?.roomId;
      const raised = Boolean(payload?.raised);
      if (!roomId) {
        cb?.({ success: false, message: 'roomId is required' });
        return;
      }

      const participantsMap = callParticipants.get(roomId);
      if (!participantsMap || !participantsMap.has(socket.id)) {
        cb?.({ success: false, message: 'Not joined in call room' });
        return;
      }

      io.to(callRoomName(roomId)).emit('call:raise-hand', {
        roomId,
        socketId: socket.id,
        userId: socket.data.userId,
        name: socket.data.user?.name || 'User',
        raised,
        createdAt: new Date().toISOString(),
      });

      cb?.({ success: true });
    });

    socket.on('call:reaction', (payload, cb) => {
      const roomId = payload?.roomId;
      const emoji = String(payload?.emoji || '').slice(0, 8);

      if (!roomId || !emoji) {
        cb?.({ success: false, message: 'roomId and emoji are required' });
        return;
      }

      const participantsMap = callParticipants.get(roomId);
      if (!participantsMap || !participantsMap.has(socket.id)) {
        cb?.({ success: false, message: 'Not joined in call room' });
        return;
      }

      io.to(callRoomName(roomId)).emit('call:reaction', {
        roomId,
        socketId: socket.id,
        userId: socket.data.userId,
        name: socket.data.user?.name || 'User',
        emoji,
        createdAt: new Date().toISOString(),
      });

      cb?.({ success: true });
    });

    socket.on('user:typing', (channelId) => {
      if (channelId) {
        socket.to(roomName(channelId)).emit('user:typing', {
          channelId,
          user: { _id: socket.data.user._id, name: socket.data.user.name },
        });
      }
    });

    socket.on('user:stopTyping', (channelId) => {
      if (channelId) {
        socket.to(roomName(channelId)).emit('user:stopTyping', {
          channelId,
          userId: socket.data.userId,
        });
      }
    });

    socket.on('disconnect', async () => {
      console.log('[Socket] Client disconnected:', socket.id);

      await removeSocketFromAllCallRooms(socket);

      const userId = socket.data.userId;
      if (userId && onlineUsers.has(userId)) {
        const userSockets = onlineUsers.get(userId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user:offline', { userId });
        }
      }
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}
