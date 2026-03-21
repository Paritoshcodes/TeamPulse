import mongoose from 'mongoose';

const scheduledMessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 10000 },
    sendAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'sent', 'cancelled'], default: 'pending', index: true },
  },
  { timestamps: true }
);

scheduledMessageSchema.index({ status: 1, sendAt: 1 });

export default mongoose.model('ScheduledMessage', scheduledMessageSchema);
