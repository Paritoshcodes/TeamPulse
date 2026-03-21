import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['mention', 'reply', 'invitation', 'channel_add', 'message', 'connection_request', 'reminder'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: String,
    read: {
        type: Boolean,
        default: false
    },
    actionUrl: String,
    relatedMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    relatedChannel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel'
    },
    relatedWorkspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace'
    },
    relatedInvitation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invitation'
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
