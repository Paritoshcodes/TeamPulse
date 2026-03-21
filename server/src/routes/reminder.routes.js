import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.middleware.js';
import Reminder from '../models/Reminder.js';
import ScheduledMessage from '../models/ScheduledMessage.js';
import Channel from '../models/Channel.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { canAccessChannel } from '../services/channelAccess.js';

const router = Router();
router.use(requireAuth);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array().map((e) => e.msg).join(' ');
    return res.status(400).json({ success: false, message: msg });
  }
  next();
}

router.get('/', async (req, res) => {
  try {
    const reminders = await Reminder.find({ userId: req.user._id, status: 'pending' })
      .sort({ remindAt: 1 })
      .limit(100)
      .populate('messageId', 'content channel')
      .populate('channelId', 'name isDM')
      .lean();

    const scheduled = await ScheduledMessage.find({ userId: req.user._id, status: 'pending' })
      .sort({ sendAt: 1 })
      .limit(100)
      .populate('channelId', 'name isDM')
      .lean();

    res.json({ success: true, reminders, scheduledMessages: scheduled });
  } catch (err) {
    console.error('Get reminders error:', err);
    res.status(500).json({ success: false, message: 'Failed to load reminders' });
  }
});

router.post(
  '/',
  [
    body('messageId').optional().isMongoId().withMessage('Invalid message id'),
    body('channelId').optional().isMongoId().withMessage('Invalid channel id'),
    body('remindAt').notEmpty().withMessage('remindAt is required').isISO8601().withMessage('remindAt must be a valid date'),
    body('title').optional().isString().isLength({ max: 120 }).withMessage('Title too long'),
    body('note').optional().isString().isLength({ max: 500 }).withMessage('Note too long'),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { messageId, channelId, remindAt, title, note } = req.body;
      const remindDate = new Date(remindAt);
      if (remindDate.getTime() <= Date.now()) {
        return res.status(400).json({ success: false, message: 'remindAt must be in the future' });
      }

      let finalChannelId = channelId;

      if (messageId) {
        const message = await Message.findById(messageId).select('channel content').lean();
        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
        const access = await canAccessChannel(req.user._id, message.channel);
        if (!access.ok) return res.status(403).json({ success: false, message: access.message });
        finalChannelId = message.channel;
      }

      if (finalChannelId) {
        const access = await canAccessChannel(req.user._id, finalChannelId);
        if (!access.ok) return res.status(403).json({ success: false, message: access.message });
      }

      const reminder = await Reminder.create({
        userId: req.user._id,
        messageId: messageId || null,
        channelId: finalChannelId || null,
        remindAt: remindDate,
        title: title || 'Reminder',
        note: note || '',
        kind: 'message',
      });

      res.status(201).json({ success: true, reminder });
    } catch (err) {
      console.error('Create reminder error:', err);
      res.status(500).json({ success: false, message: 'Failed to create reminder' });
    }
  }
);

router.post(
  '/follow-up',
  [
    body('channelId').isMongoId().withMessage('Invalid channel id'),
    body('hours').optional().isInt({ min: 1, max: 168 }).withMessage('hours must be between 1 and 168'),
    body('note').optional().isString().isLength({ max: 500 }).withMessage('Note too long'),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const hours = Number(req.body.hours || 2);
      const remindAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      const { channelId, note } = req.body;

      const access = await canAccessChannel(req.user._id, channelId);
      if (!access.ok) return res.status(403).json({ success: false, message: access.message });

      const reminder = await Reminder.create({
        userId: req.user._id,
        channelId,
        remindAt,
        title: 'Follow-up reminder',
        note: note || 'Check this conversation for unanswered messages.',
        kind: 'followup',
      });

      res.status(201).json({ success: true, reminder });
    } catch (err) {
      console.error('Create follow-up reminder error:', err);
      res.status(500).json({ success: false, message: 'Failed to create follow-up reminder' });
    }
  }
);

router.post(
  '/schedule-message',
  [
    body('channelId').isMongoId().withMessage('Invalid channel id'),
    body('content').trim().notEmpty().withMessage('content is required').isLength({ max: 10000 }).withMessage('Message too long'),
    body('sendAt').notEmpty().withMessage('sendAt is required').isISO8601().withMessage('sendAt must be a valid date'),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { channelId, content, sendAt } = req.body;
      const sendDate = new Date(sendAt);
      if (sendDate.getTime() <= Date.now()) {
        return res.status(400).json({ success: false, message: 'sendAt must be in the future' });
      }

      const access = await canAccessChannel(req.user._id, channelId);
      if (!access.ok) return res.status(403).json({ success: false, message: access.message });

      const scheduled = await ScheduledMessage.create({
        userId: req.user._id,
        channelId,
        content,
        sendAt: sendDate,
        status: 'pending',
      });

      res.status(201).json({ success: true, scheduledMessage: scheduled });
    } catch (err) {
      console.error('Schedule message error:', err);
      res.status(500).json({ success: false, message: 'Failed to schedule message' });
    }
  }
);

router.post(
  '/snooze-channel',
  [
    body('channelId').isMongoId().withMessage('Invalid channel id'),
    body('minutes').optional().isInt({ min: 5, max: 10080 }).withMessage('minutes must be between 5 and 10080'),
    body('forever').optional().isBoolean().withMessage('forever must be a boolean'),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const channelId = req.body.channelId;
      const forever = Boolean(req.body.forever);
      const minutes = Number(req.body.minutes || 60);
      const until = forever
        ? new Date('9999-12-31T23:59:59.999Z')
        : new Date(Date.now() + minutes * 60 * 1000);

      const access = await canAccessChannel(req.user._id, channelId);
      if (!access.ok) return res.status(403).json({ success: false, message: access.message });

      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const existingIndex = (user.settings.snoozedChannels || []).findIndex((item) => item.channelId.toString() === channelId.toString());
      if (existingIndex >= 0) {
        user.settings.snoozedChannels[existingIndex].until = until;
      } else {
        user.settings.snoozedChannels.push({ channelId, until });
      }

      await user.save();

      res.json({ success: true, channelId, until, forever });
    } catch (err) {
      console.error('Snooze channel error:', err);
      res.status(500).json({ success: false, message: 'Failed to snooze channel' });
    }
  }
);

router.get('/snooze-channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    if (!channelId?.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid channel id' });
    }

    const user = await User.findById(req.user._id).select('settings.snoozedChannels').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const entry = (user.settings?.snoozedChannels || []).find(
      (item) => item.channelId?.toString() === channelId.toString()
    );

    if (!entry) {
      return res.json({ success: true, snoozed: false, channelId });
    }

    const untilTime = new Date(entry.until).getTime();
    const active = Number.isFinite(untilTime) && untilTime > Date.now();
    const forever = active && untilTime > new Date('9999-01-01T00:00:00.000Z').getTime();

    if (!active) {
      return res.json({ success: true, snoozed: false, channelId });
    }

    res.json({
      success: true,
      snoozed: true,
      channelId,
      until: entry.until,
      forever,
    });
  } catch (err) {
    console.error('Get snooze channel state error:', err);
    res.status(500).json({ success: false, message: 'Failed to load snooze state' });
  }
});

router.delete('/snooze-channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    if (!channelId?.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid channel id' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.settings.snoozedChannels = (user.settings.snoozedChannels || []).filter(
      (item) => item.channelId?.toString() !== channelId.toString()
    );
    await user.save();

    res.json({ success: true, channelId, snoozed: false });
  } catch (err) {
    console.error('Unsnooze channel error:', err);
    res.status(500).json({ success: false, message: 'Failed to unsnooze channel' });
  }
});

router.patch('/:id/cancel', async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, status: 'pending' },
      { status: 'cancelled' },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.json({ success: true, reminder });
  } catch (err) {
    console.error('Cancel reminder error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel reminder' });
  }
});

export default router;
