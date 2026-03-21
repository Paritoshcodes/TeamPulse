import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Avatar } from './ui'; // Assuming Avatar is exported from ui/index.js
import * as dmService from '../services/dmService';
import { useSocketContext } from '../context/SocketContext';
import OnlineStatusIndicator from './OnlineStatusIndicator';

export default function DirectMessages({ selectedDmId, onSelectDm, onStartDm, currentUser }) {
    const [dms, setDms] = useState([]);
    const [loading, setLoading] = useState(true);
    const { onNewMessage } = useSocketContext();

    useEffect(() => {
        loadDMs();
    }, [currentUser]);

    // Listen for new messages to update DM list order or unread counts
    useEffect(() => {
        const unsub = onNewMessage(({ message }) => {
            // If new message is in one of our DMs or a new DM involving us, refresh list
            // Optimization: Check if message.channel is in our list or isDM type
            // For now, simple reload
            loadDMs();
        });
        return unsub;
    }, [onNewMessage]);

    const loadDMs = async () => {
        if (!currentUser) return;
        try {
            setLoading(true);
            const data = await dmService.getDMs();
            if (data.success) {
                setDms(data.dms || []);
            }
        } catch (err) {
            console.error('Failed to load DMs:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between px-2">
                <h3 className="pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-base-400)]">Direct Messages</h3>
                <button
                    onClick={onStartDm}
                    className="group rounded-lg p-1.5 text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-700)]/70 hover:text-[var(--color-base-200)]"
                >
                    <Plus size={14} strokeWidth={3} />
                </button>
            </div>

            <div className="space-y-0.5">
                {loading ? (
                    <div className="px-4 py-2 text-[11px] font-medium italic text-[var(--color-base-400)]">Loading chats...</div>
                ) : dms.length === 0 ? (
                    <div className="px-4 py-2 text-[11px] font-medium italic text-[var(--color-base-400)]">No conversations yet</div>
                ) : (
                    dms.map(dm => {
                        const otherUser = dm.dmParticipants.find(p => p._id.toString() !== currentUser._id.toString());
                        if (!otherUser) return null;

                        const isActive = selectedDmId === dm._id;

                        return (
                            <div
                                key={dm._id}
                                onClick={() => onSelectDm(dm)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer group relative
                                    ${isActive
                                        ? 'border border-[var(--color-base-600)] bg-[var(--color-base-700)] text-[var(--color-base-100)] shadow-sm'
                                        : 'text-[var(--color-base-300)] hover:bg-[var(--color-base-700)]/55 hover:text-[var(--color-base-100)]'
                                    }`}
                            >
                                <div className="relative flex-shrink-0">
                                    <Avatar
                                        name={otherUser.name}
                                        src={otherUser.avatar}
                                        size="sm"
                                        className={isActive ? 'border-[var(--color-base-500)]' : 'border-[var(--color-base-700)]'}
                                    />
                                    <OnlineStatusIndicator
                                        userId={otherUser._id}
                                        className={`absolute -bottom-0.5 -right-0.5 ring-2 rounded-full h-2.5 w-2.5
                                            ${isActive ? 'ring-[var(--color-base-700)]' : 'ring-[var(--color-base-800)]'} bg-[var(--color-base-800)]`}
                                    />
                                </div>

                                <div className="flex-1 min-w-0 text-left">
                                    <span className={`block text-[13px] font-bold truncate transition-colors
                                        ${isActive ? 'text-[var(--color-base-100)]' : 'text-[var(--color-base-300)] group-hover:text-[var(--color-base-100)]'}`}>
                                        {otherUser.name}
                                    </span>
                                    <span className="block truncate text-[10px] font-medium text-[var(--color-base-400)]">
                                        @{otherUser.username}
                                    </span>
                                </div>

                                {dm.unreadCount > 0 && (
                                    <div className="absolute right-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-brand-500)]">
                                        <span className="text-[10px] font-black text-white">{dm.unreadCount}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
