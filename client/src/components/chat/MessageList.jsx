import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOnlineStatus } from '../../context/OnlineStatusContext.jsx';
import { groupMessages } from '../../utils/groupMessages';
import { scaleIn } from '../../utils/motionPresets';
import DateSeparator from './DateSeparator.jsx';
import MessageHoverActions from './MessageHoverActions.jsx';
import MessageReactions from './MessageReactions.jsx';
import UnreadDivider from './UnreadDivider.jsx';
import FileMessage from './FileMessage.jsx';

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

function formatMessageTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (diffDays < 1 && date.toDateString() === now.toDateString()) {
    return time;
  }
  if (diffDays < 7) {
    return `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`;
  }
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

function renderMessageContent(content, currentUsername) {
  const lines = String(content || '').split('\n');

  return lines.map((line, lineIndex) => (
    <span key={`line-${lineIndex}`}>
      {line.split(/(@\w+)/g).map((part, partIndex) => {
        if (/^@\w+$/.test(part)) {
          const mentionedUsername = part.slice(1).toLowerCase();
          const isCurrentUserMention =
            String(currentUsername || '').toLowerCase() === mentionedUsername;

          return (
            <span
              key={`mention-${lineIndex}-${partIndex}`}
              className={`cursor-pointer rounded px-0.5 font-medium text-[var(--color-brand-400)] bg-[var(--color-brand-500)]/10 ${
                isCurrentUserMention
                  ? 'bg-[var(--color-brand-500)]/20 text-[var(--color-brand-300)]'
                  : ''
              }`}
            >
              {part}
            </span>
          );
        }

        return <span key={`text-${lineIndex}-${partIndex}`}>{part}</span>;
      })}
      {lineIndex < lines.length - 1 && <br />}
    </span>
  ));
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1 py-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex gap-3 px-4 py-3">
          <div className="h-9 w-9 rounded-full bg-[var(--color-base-700)] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-[var(--color-base-700)] animate-pulse" />
            <div className="h-3 w-full rounded bg-[var(--color-base-700)]/70 animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-[var(--color-base-700)]/50 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MessageList({
  messages,
  currentUserId,
  onReact,
  onEdit,
  onDelete,
  onReply,
  onThread,
  onPin,
  isLoading,
}) {
  const { user } = useAuth();
  const { isUserOnline } = useOnlineStatus();
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const didInitialLoadRef = useRef(false);
  const previousCountRef = useRef(0);

  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [animateFromIndex, setAnimateFromIndex] = useState(Number.POSITIVE_INFINITY);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [hoverAnchor, setHoverAnchor] = useState({ id: null, x: 0, y: 0 });

  const groupedMessages = useMemo(() => groupMessages(messages || []), [messages]);

  const unreadDividerIndex = useMemo(() => {
    const userId = user?._id?.toString();
    if (!userId) return -1;

    return groupedMessages.findIndex((message) => {
      const senderId = (message?.sender?._id || message?.sender)?.toString();
      if (!senderId || senderId === userId) return false;

      if (message?.unread === true) return true;
      if (message?.read === false) return true;

      if (Array.isArray(message?.readBy)) {
        return !message.readBy.some((entry) => {
          const readById = (entry?._id || entry?.user || entry)?.toString();
          return readById === userId;
        });
      }

      return false;
    });
  }, [groupedMessages, user?._id]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => {
      const atBottom =
        container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
      setIsAtBottom(atBottom);
      if (atBottom) {
        setShowNewMessagesButton(false);
      }
    };

    container.addEventListener('scroll', onScroll);
    onScroll();
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const nextCount = groupedMessages.length;

    if (!didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
      previousCountRef.current = nextCount;
      setAnimateFromIndex(Number.POSITIVE_INFINITY);
      if (isAtBottom) {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }
      return;
    }

    if (nextCount > previousCountRef.current) {
      setAnimateFromIndex(previousCountRef.current);
      if (isAtBottom) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setShowNewMessagesButton(true);
      }
    }

    previousCountRef.current = nextCount;
  }, [groupedMessages, isAtBottom]);

  const startEdit = (message) => {
    setEditingMessageId(message._id);
    setEditingContent(message.content || '');
  };

  const submitEdit = async (messageId) => {
    const trimmed = editingContent.trim();
    if (!trimmed) return;
    await onEdit?.(messageId, trimmed);
    setEditingMessageId(null);
    setEditingContent('');
  };

  const getReactionSummary = (reactions = []) =>
    reactions.map((reaction) => ({
      emoji: reaction.emoji,
      count: Array.isArray(reaction.users) ? reaction.users.length : 0,
      reacted: Array.isArray(reaction.users)
        ? reaction.users.some((u) => (u._id || u)?.toString() === user?._id?.toString())
        : false,
    }));

  return (
    <div className="relative flex min-h-0 flex-1">
      <div ref={scrollRef} className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto py-2">
        {isLoading ? (
          <LoadingSkeleton />
        ) : groupedMessages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <p className="text-sm text-[var(--color-base-400)]">No messages yet</p>
            <p className="mt-1 text-xs text-[var(--color-base-500)]">Start the conversation</p>
          </div>
        ) : (
          groupedMessages.map((message, index) => {
            const senderId = message?.sender?._id || message?.sender;
            const viewerId = currentUserId || user?._id;
            const isOwnMessage = senderId?.toString() === viewerId?.toString();
            const senderName = message?.sender?.name || 'Unknown';
            const avatarSrc = message?.sender?.avatar;
            const hasAnimatedEntry = index >= animateFromIndex;

            const messageRow = (
              <div
                className={`group relative flex gap-3 px-4 transition-colors duration-100 hover:bg-[var(--color-base-800)]/40 rounded-lg ${
                  message.isGrouped ? 'pt-0.5' : 'pt-3'
                }`}
                onMouseEnter={(event) => {
                  setHoveredMessageId(message._id);
                  setHoverAnchor({ id: message._id, x: event.clientX, y: event.clientY });
                }}
                onMouseMove={(event) => {
                  if (hoveredMessageId === message._id) {
                    setHoverAnchor({ id: message._id, x: event.clientX, y: event.clientY });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredMessageId(null);
                  setHoverAnchor((prev) => (prev.id === message._id ? { id: null, x: 0, y: 0 } : prev));
                }}
              >
                {!message.isGrouped ? (
                  <div className="w-9 shrink-0 pt-0.5">
                    <div className="relative h-9 w-9">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={senderName}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${getGradientClass(senderName)} text-xs font-bold text-white`}>
                          {getInitials(senderName)}
                        </span>
                      )}
                      <span
                        className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[var(--color-base-800)]"
                        style={{
                          backgroundColor: isUserOnline(senderId)
                            ? 'var(--status-online)'
                            : 'var(--status-away)',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-9 shrink-0" />
                )}

                <div className="min-w-0 flex-1">
                  {!message.isGrouped && (
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--color-base-100)]">
                        {senderName}
                      </span>
                      <span className="text-[0.65rem] text-[var(--color-base-500)]">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  )}

                  <div className="pt-0.5">
                    {editingMessageId === message._id ? (
                      <div className="flex items-start gap-2">
                        <textarea
                          value={editingContent}
                          onChange={(event) => setEditingContent(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              setEditingMessageId(null);
                              setEditingContent('');
                            }
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              submitEdit(message._id);
                            }
                          }}
                          className="min-h-[36px] w-full resize-none rounded-lg border border-[var(--color-base-600)]/60 bg-[var(--color-base-800)] px-2.5 py-2 text-sm text-[var(--color-base-200)] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => submitEdit(message._id)}
                          className="rounded-md bg-[var(--color-brand-500)] px-2 py-1 text-xs text-white"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed text-[var(--color-base-200)] break-words">
                        {renderMessageContent(message.content, user?.username)}
                        {message.editedAt && (
                          <span className="ml-1 text-[0.6rem] text-[var(--color-base-500)]">
                            (edited)
                          </span>
                        )}
                      </p>
                    )}

                    {message.fileUrl && (
                      <FileMessage
                        fileUrl={message.fileUrl}
                        fileName={message.fileName}
                        fileSize={message.fileSize}
                        fileMimeType={message.fileMimeType}
                        isOwn={isOwnMessage}
                      />
                    )}
                  </div>

                  {Array.isArray(message.reactions) && message.reactions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {getReactionSummary(message.reactions).map((reaction) => (
                        <button
                          key={`${message._id}-${reaction.emoji}`}
                          type="button"
                          onClick={() => onReact?.(message._id, reaction.emoji)}
                          className={`flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                            reaction.reacted
                              ? 'border-[var(--color-brand-500)]/60 bg-[var(--color-brand-500)]/15'
                              : 'border-[var(--color-base-600)]/60 bg-[var(--color-base-700)] hover:border-[var(--color-brand-500)]/40 hover:bg-[var(--color-brand-500)]/10'
                          }`}
                        >
                          <span>{reaction.emoji}</span>
                          <span>{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-0.5">
                    <MessageReactions
                      messageId={message._id}
                      reactions={message.reactions || []}
                      onReact={onReact}
                      isMe={isOwnMessage}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {hoveredMessageId === message._id && (
                    <MessageHoverActions
                      message={message}
                      anchor={hoverAnchor.id === message._id ? hoverAnchor : { x: 0, y: 0 }}
                      isOwnMessage={isOwnMessage}
                      onReact={onReact}
                      onReply={onReply}
                      onThread={onThread}
                      onEdit={startEdit}
                      onDelete={onDelete}
                      onPin={onPin}
                    />
                  )}
                </AnimatePresence>
              </div>
            );

            return (
              <div key={message._id}>
                {index === unreadDividerIndex && <UnreadDivider />}
                {message.showDateSeparator && <DateSeparator date={message.createdAt} />}
                {hasAnimatedEntry ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {messageRow}
                  </motion.div>
                ) : (
                  messageRow
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} className="h-2" />
      </div>

      <AnimatePresence>
        {showNewMessagesButton && (
          <motion.button
            {...scaleIn}
            type="button"
            className="absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[var(--color-brand-500)] px-3 py-1.5 text-xs font-medium text-white shadow-lg flex items-center gap-1.5"
            onClick={() => {
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
              setShowNewMessagesButton(false);
            }}
          >
            <ArrowDown className="h-3 w-3" />
            New messages
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
