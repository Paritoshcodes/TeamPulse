import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema(
  {
    inviterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    inviteeEmail: { type: String, required: true, lowercase: true, trim: true },
    // scope: workspace | team | channel
    scope: { type: String, enum: ['workspace', 'team', 'channel'], default: 'workspace' },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
    role: { type: String, enum: ['admin', 'member', 'guest'], default: 'member' },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  },
  {
    timestamps: true,
  }
);

// expire pending invitations after 7 days
invitationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

const Invitation = mongoose.model('Invitation', invitationSchema);
export default Invitation;
