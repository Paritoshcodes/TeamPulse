import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AtSign,
  Bold,
  Clock,
  Code,
  File,
  Italic,
  Paperclip,
  SendHorizontal,
  Smile,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadFile } from '../../services/uploadService.js';
import { scaleIn } from '../../utils/motionPresets.js';
import * as userService from '../../services/userService.js';

const TYPING_DEBOUNCE_MS = 500;
const gradients = [
  'from-violet-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-purple-500 to-violet-600',
];

const getInitials = (name = '') => {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }
  return (name || 'U').slice(0, 2).toUpperCase();
};

const getGradientClass = (name = '') => {
  const index = String(name)
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
};

export default function MessageInput({
  channelId,
  onSend,
  onTyping,
  onStopTyping,
  disabled,
  replyContext,
  onClearReply,
  compact = false,
}) {
  const [content, setContent] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [focusedMentionIndex, setFocusedMentionIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const typingTimeoutRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!replyContext || !textareaRef.current) return;
    textareaRef.current.focus();
  }, [replyContext]);

  const resizeTextarea = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [content]);

  useEffect(() => {
    let cancelled = false;

    const loadMentionSuggestions = async () => {
      try {
        const data = await userService.searchUsers(mentionQuery || '');
        if (!cancelled) {
          const users = Array.isArray(data?.users) ? data.users.slice(0, 6) : [];
          setMentionSuggestions(users);
          setFocusedMentionIndex(0);
        }
      } catch {
        if (!cancelled) {
          setMentionSuggestions([]);
          setFocusedMentionIndex(0);
        }
      }
    };

    if (showMentionPopup && mentionQuery.length >= 0) {
      loadMentionSuggestions();
    }

    return () => {
      cancelled = true;
    };
  }, [mentionQuery, showMentionPopup]);

  const pendingPreviewUrl = useMemo(() => {
    if (!pendingFile || !pendingFile.type?.startsWith('image/')) return null;
    return URL.createObjectURL(pendingFile);
  }, [pendingFile]);

  useEffect(() => () => {
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }
  }, [pendingPreviewUrl]);

  const formatFileSize = (size) => {
    const bytes = Number(size || 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const insertWrapped = (prefix, suffix = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const next = `${content.slice(0, start)}${prefix}${selected}${suffix}${content.slice(end)}`;
    setContent(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + prefix.length + selected.length + suffix.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const insertText = (value) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${content.slice(0, start)}${value}${content.slice(end)}`;
    setContent(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + value.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if ((!trimmed && !pendingFile) || disabled || uploading) return;

    try {
      let fileData = null;
      if (pendingFile) {
        setUploading(true);
        fileData = await uploadFile(pendingFile);
      }

      await onSend?.(trimmed, fileData, { replyContext });
      setContent('');
      setPendingFile(null);
      if (replyContext) {
        onClearReply?.();
      }
      if (channelId) {
        onStopTyping?.(channelId);
      }
      requestAnimationFrame(() => resizeTextarea());
    } catch (err) {
      toast.error(err?.message || 'Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setContent(value);

    if (!channelId || disabled) return;
    onTyping?.(channelId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping?.(channelId);
      typingTimeoutRef.current = null;
    }, TYPING_DEBOUNCE_MS);
  };

  const handleMentionKeyUp = (event) => {
    const value = event.target.value;
    const cursorPos = event.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionPopup(true);
      return;
    }

    setShowMentionPopup(false);
    setMentionQuery('');
    setMentionSuggestions([]);
    setFocusedMentionIndex(0);
  };

  const selectMention = (selectedUser) => {
    const textarea = textareaRef.current;
    if (!textarea || !selectedUser?.username) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (!mentionMatch) return;

    const mentionStart = cursorPos - mentionMatch[0].length;
    const replacement = `@${selectedUser.username} `;
    const next = `${content.slice(0, mentionStart)}${replacement}${content.slice(cursorPos)}`;

    setContent(next);
    setShowMentionPopup(false);
    setMentionQuery('');
    setMentionSuggestions([]);
    setFocusedMentionIndex(0);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = mentionStart + replacement.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleKeyDown = (event) => {
    if (showMentionPopup) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedMentionIndex((prev) => Math.min(prev + 1, Math.max(mentionSuggestions.length - 1, 0)));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedMentionIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if ((event.key === 'Enter' || event.key === 'Tab') && mentionSuggestions.length > 0) {
        event.preventDefault();
        selectMention(mentionSuggestions[focusedMentionIndex]);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setShowMentionPopup(false);
        setMentionQuery('');
        setMentionSuggestions([]);
        setFocusedMentionIndex(0);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      setPendingFile(file);
    }
    event.target.value = '';
  };

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0 bg-[var(--color-base-900)]">
      <div
        className={`relative rounded-xl border bg-[var(--color-base-800)] transition-all duration-200 ${
          isFocused
            ? 'border-[var(--color-brand-500)]/60 shadow-[0_0_0_3px_var(--color-brand-glow)]'
            : 'border-[var(--color-base-600)]/60'
        }`}
      >
        {replyContext && (
          <div className="flex items-center justify-between border-b border-[var(--color-base-600)]/40 px-3 py-2 text-xs text-[var(--color-base-400)]">
            <span className="truncate">
              Replying to <span className="font-semibold text-[var(--color-base-200)]">{replyContext?.sender?.name || 'Unknown'}</span>
            </span>
            <button
              type="button"
              onClick={onClearReply}
              className="rounded px-1.5 py-0.5 transition-colors hover:bg-[var(--color-base-700)] hover:text-[var(--color-base-200)]"
            >
              Clear
            </button>
          </div>
        )}

        <AnimatePresence>
          {!compact && isFocused && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-0.5 px-3 pt-2.5">
                <button
                  type="button"
                  onClick={() => insertWrapped('**')}
                  className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)]/60 hover:text-[var(--color-base-200)]"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertWrapped('*')}
                  className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)]/60 hover:text-[var(--color-base-200)]"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertWrapped('`')}
                  className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)]/60 hover:text-[var(--color-base-200)]"
                >
                  <Code className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertText('@')}
                  className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)]/60 hover:text-[var(--color-base-200)]"
                >
                  <AtSign className="h-3.5 w-3.5" />
                </button>
                <div className="mx-1 h-4 w-px bg-[var(--color-base-600)]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {pendingFile && (
          <div className="flex items-center gap-2 px-3 pb-0 pt-2.5">
            {pendingFile.type?.startsWith('image/') ? (
              <div className="relative">
                <img
                  src={pendingPreviewUrl || ''}
                  alt={pendingFile.name}
                  className="h-16 w-16 rounded-lg border border-[var(--color-base-500)]/50 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-base-600)]"
                >
                  <X className="h-3 w-3 text-[var(--color-base-200)]" />
                </button>
              </div>
            ) : (
              <div className="relative flex min-w-0 items-center gap-2 rounded-lg border border-[var(--color-base-500)]/50 bg-[var(--color-base-700)]/60 px-2 py-2">
                <File className="h-8 w-8 text-[var(--color-brand-400)]" />
                <div className="min-w-0">
                  <p className="truncate text-xs text-[var(--color-base-300)]">{pendingFile.name}</p>
                  <p className="text-[0.6rem] text-[var(--color-base-500)]">{formatFileSize(pendingFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-base-600)]"
                >
                  <X className="h-3 w-3 text-[var(--color-base-200)]" />
                </button>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {showMentionPopup && (
            <motion.div
              {...scaleIn}
              className="sidebar-scroll absolute bottom-full left-3 z-50 mb-2 max-h-[220px] w-[240px] overflow-y-auto rounded-xl border border-[var(--color-base-600)]/60 bg-[var(--color-base-700)] shadow-lg"
              style={{ transformOrigin: 'bottom left' }}
            >
              {mentionSuggestions.length > 0 ? (
                mentionSuggestions.map((suggestion, index) => {
                  const name = suggestion?.name || suggestion?.username || 'User';
                  const username = suggestion?.username || 'user';
                  const isFocused = index === focusedMentionIndex;

                  return (
                    <button
                      key={suggestion._id || username}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectMention(suggestion)}
                      className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                        isFocused
                          ? 'bg-[var(--color-base-600)]/60'
                          : 'hover:bg-[var(--color-base-600)]/60'
                      }`}
                    >
                      {suggestion?.avatar ? (
                        <img
                          src={suggestion.avatar}
                          alt={name}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${getGradientClass(name)} text-[10px] font-bold text-white`}>
                          {getInitials(name)}
                        </span>
                      )}

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[var(--color-base-200)]">{name}</span>
                        <span className="block truncate text-xs text-[var(--color-base-400)]">@{username}</span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-4 text-sm text-[var(--color-base-500)]">No users found</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleMentionKeyUp}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            setTimeout(() => setShowMentionPopup(false), 120);
          }}
          disabled={disabled}
          rows={1}
          placeholder={compact ? 'Reply in thread...' : 'Type a message...'}
          className="sidebar-scroll min-h-[42px] max-h-[200px] w-full resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-sm text-[var(--color-base-200)] outline-none placeholder:text-[var(--color-base-500)]"
        />

        <div className="flex items-center gap-1 px-3 pb-2.5 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)]/60 hover:text-[var(--color-base-200)]"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => toast('Emoji picker coming soon')}
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)]/60 hover:text-[var(--color-base-200)]"
          >
            <Smile className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => toast('Scheduled messages coming soon')}
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)]/60 hover:text-[var(--color-base-200)]"
          >
            <Clock className="h-4 w-4" />
          </button>

          <div className="flex-1 text-center text-[0.6rem] text-[var(--color-base-600)]">
            ↵ send  ·  ⇧↵ new line
          </div>

          <button
            type="button"
            disabled={(!content.trim() && !pendingFile) || disabled || uploading}
            onClick={handleSend}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${
              (!content.trim() && !pendingFile) || disabled || uploading
                ? 'cursor-not-allowed bg-[var(--color-base-700)] text-[var(--color-base-500)]'
                : 'cursor-pointer bg-[var(--color-brand-500)] text-white shadow-[0_0_12px_var(--color-brand-glow)] hover:bg-[var(--color-brand-400)]'
            }`}
          >
            {uploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
