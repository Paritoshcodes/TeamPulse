import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from './ui';
import * as userService from '../services/userService';
import * as dmService from '../services/dmService';
import connectionService from '../services/connectionService';

function normalizeStatus(raw, isSender) {
  if (!raw || raw === 'none') return 'none';
  if (raw === 'accepted') return 'connected';
  if (raw === 'pending') return isSender ? 'pending_sent' : 'pending_received';
  return 'none';
}

function statusLabel(status) {
  if (status === 'connected') return 'Connected';
  if (status === 'pending_sent') return 'Request sent';
  if (status === 'pending_received') return 'Wants to connect';
  return 'Not connected';
}

function getInitials(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }
  return (String(name) || 'U').slice(0, 2).toUpperCase();
}

export default function DmConnectModal({ isOpen, onClose, currentUser, onDmStarted }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [statusByUser, setStatusByUser] = useState({});
  const [rowBusyByUser, setRowBusyByUser] = useState({});

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setResults([]);
      setStatusByUser({});
      setRowBusyByUser({});
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!isOpen) return;
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setResults([]);
        setStatusByUser({});
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      try {
        const data = await userService.searchUsers(debouncedQuery);
        if (cancelled) return;

        const all = Array.isArray(data?.users) ? data.users : [];
        const filtered = all.filter((user) => user?._id?.toString() !== currentUser?._id?.toString());
        setResults(filtered);

        const statuses = {};
        await Promise.all(
          filtered.map(async (user) => {
            try {
              const statusRes = await connectionService.getStatus(user._id);
              statuses[user._id] = normalizeStatus(statusRes?.status, statusRes?.isSender);
            } catch {
              statuses[user._id] = 'none';
            }
          })
        );

        if (!cancelled) {
          setStatusByUser(statuses);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.message || 'Failed to search users');
          setResults([]);
          setStatusByUser({});
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isOpen, currentUser?._id]);

  const setRowBusy = (userId, value) => {
    setRowBusyByUser((prev) => ({ ...prev, [userId]: value }));
  };

  const updateStatus = (userId, status) => {
    setStatusByUser((prev) => ({ ...prev, [userId]: status }));
  };

  const handleAction = async (userId, action) => {
    if (!userId) return;
    setRowBusy(userId, true);
    try {
      if (action === 'send') {
        updateStatus(userId, 'pending_sent');
        await connectionService.sendRequest(userId);
      }

      if (action === 'cancel') {
        updateStatus(userId, 'none');
        await connectionService.cancelRequest(userId);
      }

      if (action === 'accept') {
        updateStatus(userId, 'connected');
        await connectionService.acceptRequest(userId);
      }

      if (action === 'reject') {
        updateStatus(userId, 'none');
        await connectionService.rejectRequest(userId);
      }

      if (action === 'message') {
        const data = await dmService.startDM(userId);
        if (data?.success && data?.channel) {
          onDmStarted?.(data.channel);
          onClose?.();
        }
      }
    } catch (err) {
      toast.error(err?.message || 'Action failed');
      try {
        const statusRes = await connectionService.getStatus(userId);
        updateStatus(userId, normalizeStatus(statusRes?.status, statusRes?.isSender));
      } catch {
      }
    } finally {
      setRowBusy(userId, false);
    }
  };

  const emptyState = useMemo(() => {
    if (!debouncedQuery) return 'Search users by name or username';
    if (debouncedQuery.length < 2) return 'Type at least 2 characters';
    if (!searchLoading && results.length === 0) return 'No users found';
    return '';
  }, [debouncedQuery, searchLoading, results.length]);

  const typeaheadSuggestion = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return '';
    const match = results.find((item) => String(item?.username || '').toLowerCase().startsWith(q));
    return match?.username || '';
  }, [query, results]);

  const handleInputKeyDown = (event) => {
    if (event.key === 'Tab' && typeaheadSuggestion) {
      event.preventDefault();
      setQuery(typeaheadSuggestion);
    }
  };

  const renderActions = (userId, status, busy) => {
    if (busy) {
      return (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-base-600)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-base-300)]" />
        </span>
      );
    }

    if (status === 'connected') {
      return (
        <button
          type="button"
          onClick={() => handleAction(userId, 'message')}
          className="rounded-md bg-[var(--color-brand-500)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-brand-400)]"
        >
          Message
        </button>
      );
    }

    if (status === 'pending_sent') {
      return (
        <button
          type="button"
          onClick={() => handleAction(userId, 'cancel')}
          className="rounded-md border border-[var(--color-base-600)] px-3 py-1.5 text-xs text-[var(--color-base-200)] hover:bg-[var(--color-base-700)]"
        >
          Cancel
        </button>
      );
    }

    if (status === 'pending_received') {
      return (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleAction(userId, 'accept')}
            className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            title="Accept"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleAction(userId, 'reject')}
            className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
            title="Reject"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleAction(userId, 'send')}
        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-base-600)] px-3 py-1.5 text-xs text-[var(--color-base-100)] hover:bg-[var(--color-base-700)]"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Connect
      </button>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Find People" size="md">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-base-400)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search by name or username"
            className="h-[40px] w-full rounded-xl border border-[var(--color-base-600)]/70 bg-[var(--color-base-800)]/90 pl-10 pr-20 text-sm text-[var(--color-base-100)] outline-none ring-0 placeholder:text-[var(--color-base-500)] focus:border-[var(--color-brand-300)]/45"
          />

          {typeaheadSuggestion && query.trim().toLowerCase() !== typeaheadSuggestion.toLowerCase() && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--color-base-500)]">
              Tab to autocomplete @{typeaheadSuggestion}
            </span>
          )}
        </div>

        {emptyState && (
          <div className="rounded-lg border border-[var(--color-base-600)]/65 bg-[var(--color-base-800)]/70 px-3 py-2 text-sm text-[var(--color-base-400)]">
            {emptyState}
          </div>
        )}

        {searchLoading && (
          <div className="flex items-center gap-2 px-1 text-sm text-[var(--color-base-300)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching...
          </div>
        )}

        <div className="max-h-[380px] space-y-1 overflow-y-auto pr-1">
          {results.map((item) => {
            const status = statusByUser[item._id] || 'none';
            const busy = Boolean(rowBusyByUser[item._id]);

            return (
              <div
                key={item._id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-base-600)]/55 bg-[var(--color-base-800)]/70 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {item.avatar ? (
                    <img src={item.avatar} alt={item.name} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-base-600)] bg-[var(--color-base-700)] text-xs font-bold text-[var(--color-base-100)]">
                      {getInitials(item.name)}
                    </span>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-base-100)]">{item.name}</p>
                    <p className="truncate text-xs text-[var(--color-base-400)]">@{item.username}</p>
                    <p className="truncate text-[11px] text-[var(--color-base-500)]">{statusLabel(status)}</p>
                  </div>
                </div>

                <div className="shrink-0">{renderActions(item._id, status, busy)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
