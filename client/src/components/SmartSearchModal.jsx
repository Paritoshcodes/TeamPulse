import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock3, Hash, MessageSquare, Search, Users, X } from 'lucide-react';
import * as searchService from '../services/searchService.js';

const RECENT_SEARCH_KEY = 'teampulse_recent_searches';
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'messages', label: 'Messages' },
  { key: 'people', label: 'People' },
  { key: 'channels', label: 'Channels' },
];

const readRecentSearches = () => {
  try {
    const raw = localStorage.getItem(RECENT_SEARCH_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (Array.isArray(parsed)) {
      return parsed.filter((term) => typeof term === 'string').slice(0, 5);
    }
    return [];
  } catch {
    return [];
  }
};

const writeRecentSearch = (term) => {
  const clean = String(term || '').trim();
  if (!clean) return;

  const next = [clean, ...readRecentSearches().filter((entry) => entry.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
  localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
};

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return String(name || 'U').slice(0, 2).toUpperCase();
};

const avatarGradients = [
  'from-violet-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-purple-500 to-violet-600',
];

const gradientFromName = (name = '') => {
  const sum = String(name).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarGradients[sum % avatarGradients.length];
};

const formatRelativeTime = (value) => {
  if (!value) return 'now';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'now';

  const diff = Date.now() - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
};

export default function SmartSearchModal({
  isOpen,
  onClose,
  workspaceId,
  onOpenChannel,
  onOpenDm,
  onStartDm,
}) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  const [results, setResults] = useState({ messages: [], people: [], channels: [], files: [] });
  const inputRef = useRef(null);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults({ messages: [], people: [], channels: [], files: [] });
    setFocusedIndex(-1);
    setActiveFilter('all');
  }, []);

  const executeSearch = useCallback(async (rawQuery) => {
    const q = String(rawQuery || '').trim();
    if (q.length < 2) {
      setLoading(false);
      setResults({ messages: [], people: [], channels: [], files: [] });
      return;
    }

    setLoading(true);
    try {
      const data = await searchService.globalSearch({ q, workspaceId });
      if (data?.success) {
        setResults(data.results || { messages: [], people: [], channels: [], files: [] });
      } else {
        setResults({ messages: [], people: [], channels: [], files: [] });
      }
    } catch {
      setResults({ messages: [], people: [], channels: [], files: [] });
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    setRecentSearches(readRecentSearches());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const timer = window.setTimeout(() => {
      executeSearch(query);
      setFocusedIndex(-1);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [isOpen, query, executeSearch]);

  const groupedResults = useMemo(() => {
    const groups = {
      messages: Array.isArray(results.messages) ? results.messages : [],
      people: Array.isArray(results.people) ? results.people : [],
      channels: Array.isArray(results.channels) ? results.channels : [],
      files: Array.isArray(results.files) ? results.files : [],
    };

    if (activeFilter === 'all') {
      return groups;
    }

    return {
      messages: activeFilter === 'messages' ? groups.messages : [],
      people: activeFilter === 'people' ? groups.people : [],
      channels: activeFilter === 'channels' ? groups.channels : [],
      files: [],
    };
  }, [results, activeFilter]);

  const navigableResults = useMemo(() => {
    const flat = [];
    (groupedResults.messages || []).forEach((item) => flat.push({ type: 'messages', item }));
    (groupedResults.people || []).forEach((item) => flat.push({ type: 'people', item }));
    (groupedResults.channels || []).forEach((item) => flat.push({ type: 'channels', item }));
    (groupedResults.files || []).forEach((item) => flat.push({ type: 'files', item }));
    return flat;
  }, [groupedResults]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleNav = (event) => {
      if (query.trim().length === 0) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedIndex((idx) => Math.min(idx + 1, Math.max(navigableResults.length - 1, 0)));
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex((idx) => Math.max(idx - 1, 0));
      }

      if (event.key === 'Enter' && focusedIndex >= 0 && navigableResults[focusedIndex]) {
        event.preventDefault();
        const selection = navigableResults[focusedIndex];
        writeRecentSearch(query);
        setRecentSearches(readRecentSearches());

        if (selection.type === 'messages' || selection.type === 'files') {
          const channelId = selection.item?.channel?._id || selection.item?.channel;
          const channelName = selection.item?.channel?.name || 'Channel';
          onOpenChannel?.(channelId, channelName);
        } else if (selection.type === 'people') {
          onStartDm?.(selection.item?._id);
        } else {
          if (selection.item?.isDM) {
            onOpenDm?.(selection.item?._id, selection.item?.name || 'Direct Message');
          } else {
            onOpenChannel?.(selection.item?._id, selection.item?.name || 'Channel');
          }
        }

        onClose?.();
      }
    };

    document.addEventListener('keydown', handleNav);
    return () => document.removeEventListener('keydown', handleNav);
  }, [focusedIndex, isOpen, navigableResults, onClose, onOpenChannel, onOpenDm, onStartDm, query]);

  const hasVisibleResults = navigableResults.length > 0;

  const sectionOrder = [
    { key: 'messages', label: 'Messages' },
    { key: 'people', label: 'People' },
    { key: 'channels', label: 'Channels' },
    { key: 'files', label: 'Files' },
  ];

  let runningIndex = -1;

  const selectResult = (type, item) => {
    writeRecentSearch(query);
    setRecentSearches(readRecentSearches());

    if (type === 'messages' || type === 'files') {
      const channelId = item?.channel?._id || item?.channel;
      const channelName = item?.channel?.name || 'Channel';
      onOpenChannel?.(channelId, channelName);
      onClose?.();
      return;
    }

    if (type === 'people') {
      onStartDm?.(item?._id);
      onClose?.();
      return;
    }

    if (item?.isDM) {
      onOpenDm?.(item?._id, item?.name || 'Direct Message');
    } else {
      onOpenChannel?.(item?._id, item?.name || 'Channel');
    }
    onClose?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--color-base-950)]/70 pt-[15vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="mx-4 flex max-h-[65vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-[var(--color-base-600)]/60 bg-[var(--color-base-800)] shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--color-base-600)]/40 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-[var(--color-base-400)]" />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search messages, people, channels..."
                className="flex-1 border-none bg-transparent text-sm text-[var(--color-base-100)] outline-none placeholder:text-[var(--color-base-500)]"
              />

              {query.length > 0 && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[var(--color-base-600)]"
                >
                  <X className="h-3 w-3 text-[var(--color-base-400)]" />
                </button>
              )}
            </div>

            {query.length > 0 && (
              <div className="flex items-center gap-1.5 border-b border-[var(--color-base-600)]/30 px-4 py-2">
                <span className="mr-1 text-xs text-[var(--color-base-500)]">Filter:</span>
                {FILTERS.map((filter) => {
                  const isActive = activeFilter === filter.key;
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => {
                        setActiveFilter(filter.key);
                        setFocusedIndex(-1);
                      }}
                      className={`cursor-pointer rounded-full px-2.5 py-1 text-xs ${
                        isActive
                          ? 'border border-[var(--color-brand-500)]/30 bg-[var(--color-brand-500)]/15 text-[var(--color-brand-400)]'
                          : 'text-[var(--color-base-400)] hover:bg-[var(--color-base-700)]/60 hover:text-[var(--color-base-200)]'
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="sidebar-scroll flex-1 overflow-y-auto">
              {query.length === 0 && (
                <>
                  {recentSearches.length > 0 ? (
                    <>
                      <div className="px-4 pb-1 pt-3 text-[0.6rem] font-semibold uppercase tracking-widest text-[var(--color-base-500)]">
                        Recent
                      </div>
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => {
                            setQuery(term);
                            executeSearch(term);
                            setFocusedIndex(-1);
                          }}
                          className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-[var(--color-base-700)]/40"
                        >
                          <Clock3 className="h-3.5 w-3.5 text-[var(--color-base-500)]" />
                          <span className="text-sm text-[var(--color-base-300)] hover:text-[var(--color-base-100)]">{term}</span>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-10">
                      <Search className="h-8 w-8 text-[var(--color-base-700)]" />
                      <p className="text-sm text-[var(--color-base-500)]">Search your workspace</p>
                    </div>
                  )}
                </>
              )}

              {query.length > 0 && loading && (
                <div className="py-1">
                  {[1, 2, 3].map((row) => (
                    <div key={row} className="flex animate-pulse items-center gap-3 px-4 py-3">
                      <div className="h-8 w-8 rounded-lg bg-[var(--color-base-700)]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 rounded bg-[var(--color-base-700)]" />
                        <div className="h-2 w-1/3 rounded bg-[var(--color-base-700)]/60" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {query.length > 0 && !loading && hasVisibleResults && (
                <div className="py-1">
                  {sectionOrder.map((section) => {
                    const sectionItems = groupedResults[section.key] || [];
                    if (sectionItems.length === 0) return null;

                    return (
                      <div key={section.key}>
                        <div className="px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-widest text-[var(--color-base-500)]">
                          {section.label}
                        </div>

                        {sectionItems.map((item) => {
                          runningIndex += 1;
                          const currentIndex = runningIndex;
                          const isFocused = focusedIndex === currentIndex;

                          if (section.key === 'messages') {
                            const text = item?.content || `${item?.contextBefore || ''}${item?.contextMatch || ''}${item?.contextAfter || ''}`.trim();
                            const channelName = item?.channel?.name || 'channel';
                            const relTime = formatRelativeTime(item?.createdAt || item?.updatedAt);

                            return (
                              <button
                                key={`msg-${item._id || currentIndex}`}
                                type="button"
                                onMouseEnter={() => setFocusedIndex(currentIndex)}
                                onClick={() => selectResult(section.key, item)}
                                className={`mx-2 flex w-[calc(100%-1rem)] cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 text-left transition-colors ${
                                  isFocused
                                    ? 'bg-[var(--color-base-700)]/60'
                                    : 'hover:bg-[var(--color-base-700)]/40'
                                }`}
                              >
                                <MessageSquare className="h-4 w-4 text-[var(--color-base-400)]" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm text-[var(--color-base-200)]">{text || 'Message'}</p>
                                  <p className="mt-0.5 text-xs text-[var(--color-base-500)]">in #{channelName} · {relTime}</p>
                                </div>
                              </button>
                            );
                          }

                          if (section.key === 'people') {
                            const personName = item?.name || item?.displayName || 'Unknown';
                            const username = item?.username || personName;

                            return (
                              <button
                                key={`person-${item._id || currentIndex}`}
                                type="button"
                                onMouseEnter={() => setFocusedIndex(currentIndex)}
                                onClick={() => selectResult(section.key, item)}
                                className={`mx-2 flex w-[calc(100%-1rem)] cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 text-left transition-colors ${
                                  isFocused
                                    ? 'bg-[var(--color-base-700)]/60'
                                    : 'hover:bg-[var(--color-base-700)]/40'
                                }`}
                              >
                                {item?.avatar ? (
                                  <img src={item.avatar} alt={personName} className="h-7 w-7 rounded-full object-cover" />
                                ) : (
                                  <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${gradientFromName(personName)} text-[10px] font-bold text-white`}>
                                    {getInitials(personName)}
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-[var(--color-base-200)]">{personName}</p>
                                  <p className="text-xs text-[var(--color-base-400)]">@{username}</p>
                                </div>
                              </button>
                            );
                          }

                          if (section.key === 'channels') {
                            const memberCount = item?.memberCount || item?.members?.length || 0;
                            return (
                              <button
                                key={`channel-${item._id || currentIndex}`}
                                type="button"
                                onMouseEnter={() => setFocusedIndex(currentIndex)}
                                onClick={() => selectResult(section.key, item)}
                                className={`mx-2 flex w-[calc(100%-1rem)] cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 text-left transition-colors ${
                                  isFocused
                                    ? 'bg-[var(--color-base-700)]/60'
                                    : 'hover:bg-[var(--color-base-700)]/40'
                                }`}
                              >
                                <Hash className="h-4 w-4 text-[var(--color-base-400)]" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm text-[var(--color-base-200)]">{item?.name || 'Channel'}</p>
                                  <p className="text-xs text-[var(--color-base-500)]">{memberCount} members</p>
                                </div>
                              </button>
                            );
                          }

                          const text = item?.content || 'File message';
                          const channelName = item?.channel?.name || 'channel';
                          const relTime = formatRelativeTime(item?.createdAt || item?.updatedAt);
                          return (
                            <button
                              key={`file-${item._id || currentIndex}`}
                              type="button"
                              onMouseEnter={() => setFocusedIndex(currentIndex)}
                              onClick={() => selectResult(section.key, item)}
                              className={`mx-2 flex w-[calc(100%-1rem)] cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 text-left transition-colors ${
                                isFocused
                                  ? 'bg-[var(--color-base-700)]/60'
                                  : 'hover:bg-[var(--color-base-700)]/40'
                              }`}
                            >
                              <MessageSquare className="h-4 w-4 text-[var(--color-base-400)]" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm text-[var(--color-base-200)]">{text}</p>
                                <p className="mt-0.5 text-xs text-[var(--color-base-500)]">in #{channelName} · {relTime}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {query.length > 0 && !loading && !hasVisibleResults && (
                <div className="flex flex-col items-center gap-2 py-10">
                  <Search className="h-8 w-8 text-[var(--color-base-600)]" />
                  <p className="text-sm font-medium text-[var(--color-base-400)]">No results for "{query}"</p>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-4 border-t border-[var(--color-base-600)]/30 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center rounded border border-[var(--color-base-600)] bg-[var(--color-base-700)] px-1.5 py-0.5 font-mono text-[0.6rem] text-[var(--color-base-400)]">
                  ↑↓
                </kbd>
                <span className="text-xs text-[var(--color-base-500)]">navigate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center rounded border border-[var(--color-base-600)] bg-[var(--color-base-700)] px-1.5 py-0.5 font-mono text-[0.6rem] text-[var(--color-base-400)]">
                  ↵
                </kbd>
                <span className="text-xs text-[var(--color-base-500)]">open</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center rounded border border-[var(--color-base-600)] bg-[var(--color-base-700)] px-1.5 py-0.5 font-mono text-[0.6rem] text-[var(--color-base-400)]">
                  esc
                </kbd>
                <span className="text-xs text-[var(--color-base-500)]">close</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
