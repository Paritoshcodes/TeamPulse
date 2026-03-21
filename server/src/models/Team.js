/**
 * Team model – name, workspace ref, createdBy
 */
import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: {
      type: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          role: { type: String, enum: ['admin', 'member'], default: 'member' },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

teamSchema.index({ workspace: 1 });
teamSchema.index({ 'members.user': 1 });

const Team = mongoose.model('Team', teamSchema);
export default Team;
