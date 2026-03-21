import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocketContext } from '../../context/SocketContext.jsx';
import MessageList from './MessageList.jsx';
import MessageInput from './MessageInput.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import ThreadSidebar from './ThreadSidebar.jsx';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import * as messageService from '../../services/messageService.js';

export default function ChatWindow({ channelId }) {
  const { user } = useAuth();
  const socketCtx = useSocketContext();
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [joinError, setJoinError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [replyContext, setReplyContext] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);

  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      setTypingUsers([]);
      setJoinError('');
      setIsLoading(false);
      setIsDragOver(false);
      setReplyContext(null);
      setActiveThread(null);
      setThreadMessages([]);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    messageService
      .getMessages(channelId)
      .then((data) => {
        if (!mounted) return;
        if (Array.isArray(data?.messages)) {
          setMessages(data.messages);
        }
      })
      .catch(() => {
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    setJoinError('');
    socketCtx
      .joinChannel(channelId, (history) => {
        setMessages(history || []);
        setIsLoading(false);
      })
      .catch((err) => setJoinError(err.message || 'Failed to join channel'));
    return () => {
      mounted = false;
      socketCtx.leaveChannel(channelId);
    };
  }, [channelId, socketCtx.joinChannel, socketCtx.leaveChannel, socketCtx.connected]);

  useEffect(() => {
    if (!channelId || !socketCtx?.onNewMessage) return;
    const unsubNew = socketCtx.onNewMessage(({ message }) => {
      if (message.channel === channelId) {
        setMessages((prev) => {
          // Prevent duplicates by checking message ID
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
      }

      if (activeThread?._id && message?.parentId?.toString() === activeThread._id?.toString()) {
        setThreadMessages((prev) => {
          const existsById = prev.some((item) => item._id === message._id);
          if (existsById) return prev;

          const optimisticIndex = prev.findIndex(
            (item) =>
              String(item._id || '').startsWith('temp-thread-') &&
              item?.content?.trim() === message?.content?.trim() &&
              (item?.sender?._id || item?.sender)?.toString() === (message?.sender?._id || message?.sender)?.toString()
          );

          if (optimisticIndex >= 0) {
            const next = [...prev];
            next[optimisticIndex] = message;
            return next;
          }

          return [...prev, message];
        });
      }
    });
    const unsubHistory = socketCtx.onHistory?.(({ channelId: cid, messages: hist }) => {
      if (cid === channelId && Array.isArray(hist)) setMessages(hist);
    });
    return () => {
      if (typeof unsubNew === 'function') unsubNew();
      if (typeof unsubHistory === 'function') unsubHistory();
    };
  }, [channelId, socketCtx, activeThread?._id]);

  useEffect(() => {
    const unsub = socketCtx.onThreadMessage?.(({ threadId, message }) => {
      if (!message || !threadId) return;
      setMessages((prev) => prev.map((item) => (
        (item._id === threadId || item.threadId === threadId)
          ? { ...item, replyCount: Number(item.replyCount || 0) + (item._id === threadId ? 1 : 0) }
          : item
      )));

      if (activeThread && (activeThread.threadId === threadId || activeThread._id === threadId)) {
        setThreadMessages((prev) => {
          if (prev.some((msg) => msg._id === message._id)) return prev;
          return [...prev, message];
        });
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [socketCtx, activeThread]);

  const handleOpenThread = useCallback(async (message) => {
    if (!message?._id) return;
    setActiveThread(message);
    setThreadLoading(true);

    try {
      const data = await messageService.getThreadMessages(message._id);
      setThreadMessages(data?.replies || []);
    } catch {
      setThreadMessages([]);
      toast.error('Failed to load thread replies');
    } finally {
      setThreadLoading(false);
    }
  }, []);

  const handleSendReply = useCallback(async (content) => {
    const trimmed = String(content || '').trim();
    if (!activeThread?._id || !trimmed) return;

    const tempId = `temp-thread-${Date.now()}`;
    const optimisticReply = {
      _id: tempId,
      content: trimmed,
      createdAt: new Date().toISOString(),
      sender: {
        _id: user?._id,
        name: user?.name || user?.username || 'You',
        avatar: user?.avatar,
      },
      parentId: activeThread._id,
    };

    setThreadMessages((prev) => [...prev, optimisticReply]);

    try {
      const data = await messageService.replyToMessage(activeThread._id, trimmed);
      const serverReply = data?.message;
      if (serverReply?._id) {
        setThreadMessages((prev) => prev.map((msg) => (msg._id === tempId ? serverReply : msg)));
      }
    } catch {
      setThreadMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      toast.error('Failed to send thread reply');
    }
  }, [activeThread?._id, user?._id, user?.name, user?.username, user?.avatar]);

  const handleCloseThread = useCallback(() => {
    setActiveThread(null);
    setThreadMessages([]);
  }, []);

  useEffect(() => {
    if (!channelId) return;
    const unsubUpdated = socketCtx.onMessageUpdated?.(({ message }) => {
      if (message?.channel === channelId) {
        setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
      }
    });
    const unsubDeleted = socketCtx.onMessageDeleted?.(({ messageId, channelId: cid }) => {
      if (cid === channelId) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    });
    return () => {
      if (typeof unsubUpdated === 'function') unsubUpdated();
      if (typeof unsubDeleted === 'function') unsubDeleted();
    };
  }, [channelId, socketCtx]);

  useEffect(() => {
    if (!channelId) return;
    const unsubTyping = socketCtx.onTyping(({ channelId: cid, user }) => {
      if (cid === channelId) {
        setTypingUsers((prev) => {
          const exists = prev.some((u) => u._id === user._id);
          if (exists) return prev;
          return [...prev, user];
        });
      }
    });
    const unsubStop = socketCtx.onStopTyping(({ channelId: cid, userId }) => {
      if (cid === channelId) {
        setTypingUsers((prev) => prev.filter((u) => u._id !== userId));
      }
    });

    if (!socketCtx?.onReaction) return;

    const unsubReaction = socketCtx.onReaction(({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map(m => m._id === messageId ? { ...m, reactions } : m)
      );
    });

    return () => {
      unsubTyping?.();
      unsubStop?.();
      if (typeof unsubReaction === 'function') unsubReaction();
    };
  }, [channelId, socketCtx]);

  const onReact = useCallback(async (messageId, emoji) => {
    try {
      const data = await messageService.reactToMessage(messageId, emoji);
      if (!data.success) {
        console.error('Failed to react:', data.message);
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
  }, []);

  const onEdit = useCallback(async (messageId, content) => {
    try {
      const data = await messageService.updateMessage(messageId, content);
      if (data?.success && data.message) {
        setMessages((prev) => prev.map((m) => (m._id === data.message._id ? data.message : m)));
      }
    } catch (err) {
      console.error('Failed to update message:', err);
    }
  }, []);

  const onDelete = useCallback(async (messageId) => {
    try {
      const data = await messageService.deleteMessage(messageId);
      if (data?.success) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  }, []);

  const onPin = useCallback(async () => {
    toast('Pinned messages are coming soon');
  }, []);

  const handleSendMessage = useCallback(async (content, fileData = null, meta = {}) => {
    const replyToMessage = meta?.replyContext;
    if (replyToMessage?._id) {
      const data = await messageService.replyToMessage(replyToMessage._id, content);
      const serverReply = data?.message;

      const threadRootId = replyToMessage?.threadId || replyToMessage?._id;
      setMessages((prev) => prev.map((item) => {
        if (item._id === threadRootId) {
          return { ...item, replyCount: Number(item.replyCount || 0) + 1 };
        }
        return item;
      }));

      if (activeThread && (activeThread._id === threadRootId || activeThread.threadId === threadRootId) && serverReply?._id) {
        setThreadMessages((prev) => (prev.some((msg) => msg._id === serverReply._id) ? prev : [...prev, serverReply]));
      }

      return;
    }

    const messagePayload = {
      channelId,
      content,
      ...(fileData && {
        fileUrl: fileData.url,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        fileMimeType: fileData.mimeType,
      }),
    };

    await socketCtx.sendMessage(messagePayload.channelId, messagePayload.content, {
      fileUrl: messagePayload.fileUrl,
      fileName: messagePayload.fileName,
      fileSize: messagePayload.fileSize,
      fileMimeType: messagePayload.fileMimeType,
    });
  }, [channelId, socketCtx, activeThread]);

  if (joinError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-4 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border">
          <AlertCircle size={20} className="text-muted" />
        </div>
        <h3 className="text-heading mb-1">Connection Error</h3>
        <p className="text-body text-muted">{joinError}</p>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden h-full w-full flex flex-col bg-[var(--color-base-900)]"
      onDragOver={(event) => {
        event.preventDefault();
        if (!isDragOver) setIsDragOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsDragOver(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        if (event.dataTransfer?.files?.length) {
          toast('File upload coming soon');
        }
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(90,120,255,0.08),_transparent_55%)]" />

      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-4 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/10 backdrop-blur-sm"
          >
            <div className="text-center text-sm font-medium text-[var(--color-base-100)]">
              Drop files to upload
              <p className="mt-1 text-xs font-normal text-[var(--color-base-300)]">Attachments are in progress</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-h-0 flex-1 flex-col">
        <MessageList
          messages={messages}
          currentUserId={user?._id}
          isLoading={isLoading}
          onReact={onReact}
          onEdit={onEdit}
          onDelete={onDelete}
          onReply={(msg) => setReplyContext(msg)}
          onThread={handleOpenThread}
          onPin={onPin}
        />

        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden flex-shrink-0"
            >
              <TypingIndicator typingUsers={typingUsers} />
            </motion.div>
          )}
        </AnimatePresence>

        <MessageInput
          channelId={channelId}
          onSend={handleSendMessage}
          onTyping={socketCtx.emitTyping}
          onStopTyping={socketCtx.emitStopTyping}
          disabled={!socketCtx.connected}
          replyContext={replyContext}
          onClearReply={() => setReplyContext(null)}
        />
      </div>

      <AnimatePresence>
        {activeThread && (
          <ThreadSidebar
            parentMessage={activeThread}
            threadMessages={threadMessages}
            isLoading={threadLoading}
            onClose={handleCloseThread}
            onSendReply={handleSendReply}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

