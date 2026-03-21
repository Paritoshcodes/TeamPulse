/**
 * OnlineStatusContext - Manages real-time user online status
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { useSocketContext } from './SocketContext.jsx';

const OnlineStatusContext = createContext(null);

export function OnlineStatusProvider({ children }) {
    const { socket } = useSocketContext();
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [statusByUserId, setStatusByUserId] = useState({});

    useEffect(() => {
        if (!socket) return;

        // Initialize with current online users if provided by server
        // (This would typically happen on connection or initial data fetch)

        const handleUserOnline = ({ userId }) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.add(userId);
                return next;
            });
            setStatusByUserId((prev) => ({
                ...prev,
                [userId]: { ...(prev[userId] || {}), online: true },
            }));
        };

        const handleUserOffline = ({ userId }) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
            setStatusByUserId((prev) => ({
                ...prev,
                [userId]: { ...(prev[userId] || {}), online: false },
            }));
        };

        // Initial sync event
        const handleOnlineUsers = (users) => {
            if (!Array.isArray(users)) {
                setOnlineUsers(new Set());
                return;
            }

            const ids = users.map((entry) => (typeof entry === 'string' ? entry : entry?.userId || entry?._id)).filter(Boolean);
            setOnlineUsers(new Set(ids));

            setStatusByUserId((prev) => {
                const next = { ...prev };
                users.forEach((entry) => {
                    if (typeof entry === 'string') {
                        next[entry] = { ...(next[entry] || {}), online: true };
                        return;
                    }
                    const id = entry?.userId || entry?._id;
                    if (!id) return;
                    next[id] = {
                        ...(next[id] || {}),
                        ...entry,
                        online: true,
                    };
                });
                return next;
            });
        };

        socket.on('user:online', handleUserOnline);
        socket.on('user:offline', handleUserOffline);
        socket.on('users:online', handleOnlineUsers); // Batch update

        return () => {
            socket.off('user:online', handleUserOnline);
            socket.off('user:offline', handleUserOffline);
            socket.off('users:online', handleOnlineUsers);
        };
    }, [socket]);

    const isUserOnline = (userId) => onlineUsers.has(userId);

    const members = Object.entries(statusByUserId).map(([id, meta]) => ({
        id,
        userId: id,
        _id: id,
        name: meta?.name || meta?.username || 'Unknown',
        avatar: meta?.avatar || meta?.photo || null,
        status: meta?.status || (meta?.online ? 'online' : 'away'),
        online: Boolean(meta?.online),
    }));

    const getUserStatus = (userId) => {
        const key = userId?.toString?.() || userId;
        const meta = key ? statusByUserId[key] : null;
        if (!meta) return onlineUsers.has(key) ? 'online' : 'away';
        if (meta.status) return meta.status;
        return meta.online ? 'online' : 'away';
    };

    return (
        <OnlineStatusContext.Provider value={{ isUserOnline, onlineUsers, members, getUserStatus }}>
            {children}
        </OnlineStatusContext.Provider>
    );
}

export function useOnlineStatus() {
    const ctx = useContext(OnlineStatusContext);
    if (!ctx) throw new Error('useOnlineStatus must be used within OnlineStatusProvider');
    return ctx;
}
