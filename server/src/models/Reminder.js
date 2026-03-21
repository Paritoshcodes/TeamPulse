import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', default: null },
    title: { type: String, default: 'Reminder' },
    note: { type: String, default: '' },
    remindAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'sent', 'cancelled'], default: 'pending', index: true },
    kind: { type: String, enum: ['message', 'followup'], default: 'message' },
  },
  { timestamps: true }
);

reminderSchema.index({ userId: 1, status: 1, remindAt: 1 });

export default mongoose.model('Reminder', reminderSchema);
