/**
 * Message model – content, channel, sender, attachments (optional), readBy, timestamps
 */
import mongoose from 'mongoose';

const readBySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      default: '',
      trim: true,
      maxlength: 10000,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    fileMimeType: {
      type: String,
      default: null,
    },
    attachments: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    ],
    readBy: {
      type: [readBySchema],
      default: [],
    },
    reactions: [
      {
        emoji: String,
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
      }
    ],
    parentMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
      index: true,
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
      index: true,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    editedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ content: 'text' });

const Message = mongoose.model('Message', messageSchema);
export default Message;
