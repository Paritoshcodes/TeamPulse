/**
 * Connection model - tracks social connections between users for DM authorization
 */
import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending',
        },
        connectedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

// Index for checking connection status between two users (order independent lookup)
connectionSchema.index({ sender: 1, receiver: 1 });
connectionSchema.index({ receiver: 1, sender: 1 });

const Connection = mongoose.model('Connection', connectionSchema);
export default Connection;
