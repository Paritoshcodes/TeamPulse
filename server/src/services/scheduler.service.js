import Reminder from '../models/Reminder.js';
import ScheduledMessage from '../models/ScheduledMessage.js';
import Notification from '../models/Notification.js';
import Message from '../models/Message.js';
import Channel from '../models/Channel.js';
import { getIO } from '../sockets/index.js';

let reminderTimer = null;
let scheduledMessageTimer = null;

async function processDueReminders() {
  const now = new Date();
  const due = await Reminder.find({ status: 'pending', remindAt: { $lte: now } })
    .limit(100)
    .lean();

  if (!due.length) return;

  const io = getIO();

  for (const reminder of due) {
    const notification = await Notification.create({
      recipient: reminder.userId,
      type: 'reminder',
      title: reminder.title || 'Reminder',
      message: reminder.note || 'Your reminder is due.',
      relatedMessage: reminder.messageId || null,
      relatedChannel: reminder.channelId || null,
      actionUrl: '/',
    });

    io.to(`user:${reminder.userId.toString()}`).emit('new_notification', notification);

    await Reminder.updateOne({ _id: reminder._id }, { status: 'sent' });
  }
}

async function processScheduledMessages() {
  const now = new Date();
  const due = await ScheduledMessage.find({ status: 'pending', sendAt: { $lte: now } })
    .limit(100)
    .lean();

  if (!due.length) return;

  const io = getIO();

  for (const item of due) {
    const message = await Message.create({
      channel: item.channelId,
      sender: item.userId,
      content: item.content,
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'name email avatar username')
      .lean();

    io.to(`channel:${item.channelId.toString()}`).emit('message:new', { message: populated });

    const channel = await Channel.findById(item.channelId).select('isDM dmParticipants').lean();
    if (channel?.isDM && Array.isArray(channel.dmParticipants)) {
      channel.dmParticipants.forEach((participant) => {
        io.to(`user:${participant.toString()}`).emit('message:new', { message: populated });
      });
    }

    await ScheduledMessage.updateOne({ _id: item._id }, { status: 'sent' });
  }
}

export function startSchedulers() {
  if (!reminderTimer) {
    reminderTimer = setInterval(() => {
      processDueReminders().catch((err) => console.error('Reminder scheduler error:', err));
    }, 15000);
  }

  if (!scheduledMessageTimer) {
    scheduledMessageTimer = setInterval(() => {
      processScheduledMessages().catch((err) => console.error('Scheduled message scheduler error:', err));
    }, 10000);
  }
}

export function stopSchedulers() {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
  if (scheduledMessageTimer) {
    clearInterval(scheduledMessageTimer);
    scheduledMessageTimer = null;
  }
}
