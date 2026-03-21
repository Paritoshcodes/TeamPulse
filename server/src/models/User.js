import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: function () {
        return this.authProvider === 'local' || this.authProvider === 'google';
      },
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider === 'local';
      },
      minlength: 6,
      select: false,
    },
    avatar: {
      type: String,
      default: null,
      maxlength: 500,
    },
    username: {
      type: String,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z0-9_]+$/, // Only lowercase alphanumeric and underscore
    },
    usernameSetAt: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'guest'],
      default: 'member',
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'guest'],
      required: true,
    },
    emailVerification: {
      otp: { type: String, select: false },
      expiresAt: { type: Date },
      verified: { type: Boolean, default: false },
    },
    settings: {
      notifications: {
        email: { type: Boolean, default: true },
        desktop: { type: Boolean, default: true },
        sound: { type: Boolean, default: true },
        mentions: { type: Boolean, default: true }
      },
      appearance: {
        theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
        fontScale: { type: Number, default: 100 } // percentage
      },
      presence: {
        status: { type: String, enum: ['available', 'busy', 'away'], default: 'available' },
        updatedAt: { type: Date, default: Date.now },
      },
      pinnedConversations: {
        type: [{
          kind: { type: String, enum: ['channel', 'dm'], required: true },
          channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
          name: { type: String, default: '' },
          pinnedAt: { type: Date, default: Date.now },
        }],
        default: [],
      },
      snoozedChannels: {
        type: [{
          channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
          until: { type: Date, required: true },
        }],
        default: [],
      }
    },
    resetPassword: {
      otp: { type: String, select: false },
      expiresAt: { type: Date }
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.password;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.virtual('invitations', {
  ref: 'Invitation',
  localField: '_id',
  foreignField: 'inviterId',
  justOne: false,
});

userSchema.virtual('isEmailVerified').get(function () {
  return !!this.emailVerification?.verified;
});

userSchema.index({ name: 'text', username: 'text' });

const User = mongoose.model('User', userSchema);
export default User;
