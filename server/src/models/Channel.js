/**
 * Channel model – name, type (text/voice/video), team ref, createdBy
 */
import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ['text', 'voice', 'video'],
      default: 'text',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: function () { return !this.isDM; }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    allowedUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    isDM: {
      type: Boolean,
      default: false,
    },
    dmParticipants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    archived: {
      type: Boolean,
      default: false
    },
    archivedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

channelSchema.index({ team: 1 });
channelSchema.index({ allowedUsers: 1 });
channelSchema.index({ name: 'text' });

const Channel = mongoose.model('Channel', channelSchema);
export default Channel;
