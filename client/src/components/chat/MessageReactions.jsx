import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function MessageReactions({ messageId, reactions = [], onReact, isMe }) {
    const { user } = useAuth();
    const [showPicker, setShowPicker] = useState(false);

    // Group reactions by emoji and count
    const groupedReactions = reactions.reduce((acc, r) => {
        const hasReacted = r.users.some(u => u === user?._id || u?._id === user?._id);
        acc[r.emoji] = {
            count: r.users.length,
            hasReacted,
            users: r.users
        };
        return acc;
    }, {});

    const handleReact = (emoji) => {
        onReact(messageId, emoji);
        setShowPicker(false);
    };

    return (
        <div className={`relative mt-1.5 flex flex-wrap gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(groupedReactions).map(([emoji, data]) => (
                <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleReact(emoji)}
                    title={data.users.map(u => u?.name || u?.username || 'User').join(', ')}
                    className={`
            inline-flex items-center gap-1.5 rounded-[12px] border px-2 py-0.5 text-[13px] transition-all cursor-pointer
            ${data.hasReacted
                            ? 'border-[rgba(0,112,243,0.4)] bg-[rgba(0,112,243,0.15)] text-[var(--color-base-100)]'
                            : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] text-[var(--color-base-200)] hover:bg-[rgba(255,255,255,0.1)]'}
          `}
                >
                    <span className="leading-none">{emoji}</span>
                    <span className="leading-none font-medium">{data.count}</span>
                </motion.button>
            ))}

            <div className={`relative ${isMe ? 'order-first' : 'order-last'}`}>
                <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowPicker(!showPicker)}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-border/80 bg-background/70 text-muted-foreground opacity-0 shadow-sm transition-all hover:bg-accent/20 hover:text-foreground group-hover/msg:opacity-100"
                >
                    <Smile size={14} strokeWidth={2.5} />
                </motion.button>

                <AnimatePresence>
                    {showPicker && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-40"
                                onClick={() => setShowPicker(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                className={`absolute bottom-full z-50 mb-2 flex gap-1 rounded-xl border border-border bg-card/95 p-1.5 shadow-2xl shadow-black/35 backdrop-blur-xl ${isMe ? 'right-0' : 'left-0'}`}
                            >
                                {REACTION_EMOJIS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleReact(emoji)}
                                        className="rounded-lg p-1.5 text-base transition-all duration-200 hover:scale-110 hover:bg-accent/20"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
