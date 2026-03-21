import Notification from '../models/Notification.js';

// Call this function when creating a notification
export async function sendNotification(io, notificationData) {
    try {
        const notification = await Notification.create(notificationData);

        // Emit to specific user if they are online
        // Assuming socket.io room format is `user:userId` or simply relying on client joining personal room
        // The previous implementation of socket.js didn't explicitly join user room but we can add it or emit to all sockets of that user.
        // Let's ensure we target the user correctly.

        // We need to look up sockets for the recipient
        // For now, let's assume we implement a user room join in the main socket file, or we loop through connected sockets.

        // Best practice: All users should join a room with their User ID upon connection.
        // "user:USER_ID"

        const populated = await notification.populate([
            { path: 'sender', select: 'name avatar' },
            { path: 'relatedChannel', select: 'name' },
            { path: 'relatedWorkspace', select: 'name' }
        ]);

        io.to(`user:${notificationData.recipient}`).emit('new_notification', {
            notification: populated
        });

        return notification;
    } catch (err) {
        console.error('Error sending notification:', err);
    }
}
