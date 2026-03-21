/**
 * Workspace model – name, slug (unique), owner, members, timestamps
 */
import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member', 'guest'], default: 'member' },
    source: { type: String, enum: ['workspace', 'team', 'channel'], default: 'workspace' },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    avatar: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: {
      type: [memberSchema],
      default: [],
    },
    settings: {
      allowMemberInvites: { type: Boolean, default: false },
      defaultMemberRole: { type: String, enum: ['member', 'guest'], default: 'member' },
    },
  },
  { timestamps: true }
);

workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });

const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
