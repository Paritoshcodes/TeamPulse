import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Smile, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { groupMessages } from '../../utils/groupMessages';
import { reactToMessage, deleteMessage } from '../../services/messageService.js';
import DateSeparator from './DateSeparator.jsx';
import MessageInput from './MessageInput.jsx';
import MessageReactions from './MessageReactions.jsx';

const gradients = [
  'from-violet-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-purple-500 to-violet-600',
];

function getInitials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }
  return (name || 'U').slice(0, 2).toUpperCase();
}

function getGradientClass(name = '') {
  const index = name
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
}

function formatTimestamp(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatRelativeTime(dateStr) {
  const now = Date.now();
  const target = new Date(dateStr).getTime();
  const diffMinutes = Math.max(0, Math.floor((now - target) / 60000));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function ThreadLoadingSkeleton() {
  return (
    <div className="space-y-1 py-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex gap-2 px-4 py-2.5">
          <div className="h-7 w-7 rounded-full bg-[var(--color-base-700)] animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-24 rounded bg-[var(--color-base-700)] animate-pulse" />
            <div className="h-2.5 w-full rounded bg-[var(--color-base-700)]/70 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ThreadSidebar({
  parentMessage,
  threadMessages,
  isLoading,
  onClose,
  onSendReply,
}) {
  const { user } = useAuth();
  const groupedThreadMessages = useMemo(() => groupMessages(threadMessages || []), [threadMessages]);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  const uniqueParticipants = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const message of threadMessages || []) {
      const senderId = (message?.sender?._id || message?.sender)?.toString();
      if (!senderId || seen.has(senderId)) continue;
      seen.add(senderId);
      result.push({
        id: senderId,
        name: message?.sender?.name || 'Unknown',
        avatar: message?.sender?.avatar,
      });
      if (result.length >= 3) break;
    }
    return result;
  }, [threadMessages]);

  const handleReact = async (messageId, emoji = '👍') => {
    try {
      await reactToMessage(messageId, emoji);
    } catch {
      // keep UI resilient when reactions fail in thread panel
    }
  };

  const handleDelete = async (message) => {
    const senderId = (message?.sender?._id || message?.sender)?.toString();
    if (!message?._id || senderId !== user?._id?.toString()) return;

    try {
      await deleteMessage(message._id);
    } catch {
      // deletion sync is handled by socket updates in parent chat state
    }
  };

  return (
    <motion.aside
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute right-0 top-0 h-full z-10 w-[320px] flex flex-col bg-[var(--color-base-800)] border-l border-[var(--color-base-600)]/40 shadow-[-8px_0_24px_rgba(0,0,0,0.3)]"
    >
      <div className="h-[52px] flex items-center justify-between px-4 border-b border-[var(--color-base-600)]/40 flex-shrink-0">
        <span className="text-sm font-semibold text-[var(--color-base-100)]">Thread</span>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-base-400)] hover:text-[var(--color-base-200)] hover:bg-[var(--color-base-600)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {parentMessage && (
        <div className="mx-4 my-3 p-3 rounded-lg flex-shrink-0 bg-[var(--color-base-700)] border-l-[3px] border-[var(--color-brand-500)]">
          <div className="flex items-center gap-2 mb-1">
            {parentMessage?.sender?.avatar ? (
              <img
                src={parentMessage.sender.avatar}
                alt={parentMessage?.sender?.name || 'Unknown'}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${getGradientClass(parentMessage?.sender?.name || '')} text-[0.55rem] font-semibold text-white`}>
                {getInitials(parentMessage?.sender?.name || 'Unknown')}
              </span>
            )}
            <span className="text-xs font-semibold text-[var(--color-base-200)]">
              {parentMessage?.sender?.name || 'Unknown'}
            </span>
            <span className="ml-auto text-[0.6rem] text-[var(--color-base-500)]">
              {formatTimestamp(parentMessage?.createdAt)}
            </span>
          </div>
          <p className="text-xs text-[var(--color-base-300)] line-clamp-3">{parentMessage?.content || ''}</p>
        </div>
      )}

      {(threadMessages?.length || 0) > 0 && (
        <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0 border-b border-[var(--color-base-600)]/30">
          <div className="flex items-center">
            {uniqueParticipants.map((participant, index) => (
              <div
                key={participant.id}
                className={`h-5 w-5 rounded-full border border-[var(--color-base-700)] ${index > 0 ? '-ml-1.5' : ''}`}
              >
                {participant.avatar ? (
                  <img src={participant.avatar} alt={participant.name} className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${getGradientClass(participant.name)} text-[0.55rem] font-semibold text-white`}>
                    {getInitials(participant.name)}
                  </span>
                )}
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-[var(--color-base-300)]">
            {threadMessages.length} {threadMessages.length === 1 ? 'reply' : 'replies'}
          </span>
          <span className="text-[0.6rem] text-[var(--color-base-500)] ml-1">
            Last reply {formatRelativeTime(threadMessages[threadMessages.length - 1]?.createdAt)}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2 sidebar-scroll">
        {isLoading ? (
          <ThreadLoadingSkeleton />
        ) : groupedThreadMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <MessageSquare className="w-8 h-8 text-[var(--color-base-600)]" />
            <p className="text-sm text-[var(--color-base-400)] font-medium">No replies yet</p>
            <p className="text-xs text-[var(--color-base-500)]">Be the first to reply</p>
          </div>
        ) : (
          groupedThreadMessages.map((message) => {
            const senderName = message?.sender?.name || 'Unknown';
            const senderId = (message?.sender?._id || message?.sender)?.toString();
            const isOwn = senderId === user?._id?.toString();

            return (
              <div key={message._id}>
                {message.showDateSeparator && <DateSeparator date={message.createdAt} />}

                <div
                  className={`group relative flex gap-2 px-4 ${message.isGrouped ? 'pt-0.5' : 'pt-2.5'}`}
                  onMouseEnter={() => setHoveredMessageId(message._id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  {!message.isGrouped ? (
                    <div className="w-7 shrink-0 pt-0.5">
                      {message?.sender?.avatar ? (
                        <img
                          src={message.sender.avatar}
                          alt={senderName}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${getGradientClass(senderName)} text-[0.6rem] font-semibold text-white`}>
                          {getInitials(senderName)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-7 shrink-0" />
                  )}

                  <div className="min-w-0 flex-1">
                    {!message.isGrouped && (
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-semibold text-[var(--color-base-200)]">{senderName}</span>
                        <span className="text-[0.6rem] text-[var(--color-base-500)]">{formatTimestamp(message.createdAt)}</span>
                      </div>
                    )}

                    <p className="mt-0.5 text-xs leading-relaxed break-words text-[var(--color-base-300)]">
                      {message.content}
                    </p>

                    {Array.isArray(message.reactions) && message.reactions.length > 0 && (
                      <div className="mt-0.5">
                        <MessageReactions
                          messageId={message._id}
                          reactions={message.reactions}
                          onReact={handleReact}
                          isMe={isOwn}
                        />
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {hoveredMessageId === message._id && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-4 -top-3 z-10 flex items-center gap-1 rounded-lg border border-[var(--color-base-600)]/70 bg-[var(--color-base-600)]/95 px-1 py-1 shadow-lg"
                      >
                        <button
                          type="button"
                          onClick={() => handleReact(message._id, '👍')}
                          className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-700)] hover:text-[var(--color-base-100)]"
                        >
                          <Smile className="h-3.5 w-3.5" />
                        </button>
                        {isOwn && (
                          <button
                            type="button"
                            onClick={() => handleDelete(message)}
                            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-700)] hover:text-[var(--color-danger)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex-shrink-0 border-t border-[var(--color-base-600)]/40">
        <MessageInput
          compact={true}
          channelId={parentMessage?.channel || parentMessage?.channelId || 'thread'}
          onSend={(_, content) => onSendReply?.(content)}
        />
      </div>
    </motion.aside>
  );
}
