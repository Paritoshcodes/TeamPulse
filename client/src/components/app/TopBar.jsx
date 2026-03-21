import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  ChevronRight,
  Hash,
  MoreHorizontal,
  Phone,
  Search,
  UserPlus,
  Video,
} from 'lucide-react';
import NotificationDropdown from '../NotificationDropdown.jsx';
import UserProfileDropdown from '../UserProfileDropdown.jsx';
import { useSocketContext } from '../../context/SocketContext.jsx';

const gradients = [
  'from-violet-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-purple-500 to-violet-600',
];

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }
  return (name || 'U').slice(0, 2).toUpperCase();
};

const getGradientClass = (name = '') => {
  const index = name
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
};

export default function TopBar({
  selectedChannel,
  selectedDm,
  selectedTeamName,
  selectedChannelId,
  selectedDmId,
  unreadNotificationCount = 0,
  notifications = [],
  notificationsLoading = false,
  navMode = 'workspace',
  currentUser,
  onOpenSearch,
  onToggleNotifications,
  onOpenSettings,
  onUnreadIncrement,
  onNotificationReceived,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onAcceptConnectionRequest,
  onRejectConnectionRequest,
  onAcceptInvitation,
  onDeclineInvitation,
  onOpenNotification,
  onOpenDmFinder,
  onStartVideoCall,
  onAcceptIncomingCall,
}) {
  const socketCtx = useSocketContext();
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [bellAnimationKey, setBellAnimationKey] = useState(0);
  const bellButtonRef = useRef(null);
  const avatarButtonRef = useRef(null);
  const ringtoneAudioRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);
  const [incomingCall, setIncomingCall] = useState(null);

  const isMac = useMemo(() => /Mac|iPhone|iPad|iPod/.test(navigator.platform), []);
  const hasSelection = Boolean(selectedChannel || selectedDm);
  const hasConversation = Boolean(selectedChannelId || selectedDmId);

  useEffect(() => {
    if (!socketCtx?.onNotification) return;

    const unsub = socketCtx.onNotification((payload) => {
      setBellAnimationKey((prev) => prev + 1);
      onUnreadIncrement?.(payload);
      onNotificationReceived?.(payload);
    });

    return () => {
      if (typeof unsub === 'function') {
        unsub();
      }
    };
  }, [socketCtx, onUnreadIncrement, onNotificationReceived]);

  useEffect(() => {
    if (!socketCtx?.onCallIncoming) return undefined;

    const playRingtone = () => {
      if (!ringtoneAudioRef.current) return;

      const audio = ringtoneAudioRef.current;
      audio.loop = true;
      audio.currentTime = 0;
      audio.play().catch(() => {
      });
    };

    const stopRingtone = () => {
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
        ringtoneIntervalRef.current = null;
      }
      if (ringtoneAudioRef.current) {
        ringtoneAudioRef.current.loop = false;
        ringtoneAudioRef.current.pause();
        ringtoneAudioRef.current.currentTime = 0;
      }
    };

    const unsubIncoming = socketCtx.onCallIncoming((payload) => {
      if (!payload?.roomId) return;
      setIncomingCall(payload);
      playRingtone();
    });

    return () => {
      stopRingtone();
      if (typeof unsubIncoming === 'function') unsubIncoming();
    };
  }, [socketCtx?.onCallIncoming]);

  const resolveRoomId = () => {
    if (selectedChannelId) return `channel:${selectedChannelId}`;
    if (selectedDmId) return `dm:${selectedDmId}`;
    return '';
  };

  const handleInviteAndStart = async () => {
    const roomId = resolveRoomId();
    const callTitle = selectedChannel?.name || selectedDm?.username || selectedDm?.name || 'Conversation';
    if (!roomId) return;

    try {
      await socketCtx?.inviteCall?.(roomId, callTitle);
      onStartVideoCall?.({
        channelId: selectedChannelId,
        dmId: selectedDmId,
        title: callTitle,
      });
    } catch {
      return;
    }
  };

  const stopIncomingRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (ringtoneAudioRef.current) {
      ringtoneAudioRef.current.loop = false;
      ringtoneAudioRef.current.pause();
      ringtoneAudioRef.current.currentTime = 0;
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall?.roomId) return;
    try {
      await socketCtx?.respondToCall?.(incomingCall.roomId, incomingCall.callId, true);
    } catch {
      return;
    }
    stopIncomingRingtone();
    onAcceptIncomingCall?.(incomingCall);
    setIncomingCall(null);
  };

  const declineIncomingCall = async () => {
    if (incomingCall?.roomId && incomingCall?.callId) {
      try {
        await socketCtx?.respondToCall?.(incomingCall.roomId, incomingCall.callId, false);
      } catch {
      }
    }
    stopIncomingRingtone();
    setIncomingCall(null);
  };

  const statusColor =
    selectedDm?.status === 'available' || selectedDm?.status === 'online'
      ? 'var(--status-online)'
      : 'var(--status-away)';

  const userStatusColor =
    currentUser?.status === 'busy'
      ? 'var(--status-busy)'
      : currentUser?.status === 'away'
        ? 'var(--status-away)'
        : 'var(--status-online)';

  return (
    <div className="relative z-10 h-[52px] w-full shrink-0 border-b border-[var(--color-base-600)]/45 bg-[var(--color-base-900)]/92 px-3 md:px-4 backdrop-blur-xl">
      <div className="flex h-full items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {hasSelection ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedChannelId || selectedDmId || 'selection'}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.2 }}
                className="min-w-0"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-xs text-[var(--color-base-400)]">{selectedDm ? 'Direct Message' : (selectedTeamName || 'Workspace')}</span>
                  <ChevronRight className="h-3 w-3 text-[var(--color-base-500)]" />
                  {selectedChannel ? (
                    <>
                      <Hash className="h-3.5 w-3.5 shrink-0 text-[var(--color-base-400)]" />
                      <span className="truncate text-sm font-semibold text-[var(--color-base-50)]">{selectedChannel?.name || 'Channel'}</span>
                    </>
                  ) : (
                    <span className="truncate text-sm font-semibold text-[var(--color-base-50)]">{selectedDm?.username || selectedDm?.name || 'Direct Message'}</span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {selectedChannel ? (
                    selectedChannel?.topic ? (
                      <p className="max-w-[260px] truncate text-xs text-[var(--color-base-400)]">{selectedChannel.topic}</p>
                    ) : (
                      <p className="text-xs text-[var(--color-base-500)]">{selectedChannel?.memberCount || 0} members</p>
                    )
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                      <p className="text-xs text-[var(--color-base-400)]">
                        {selectedDm?.status === 'available' || selectedDm?.status === 'online' ? 'Active now' : 'Away'}
                      </p>
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <p className="truncate text-sm font-semibold text-[var(--color-base-400)]">{selectedTeamName || 'TeamPulse'}</p>
          )}

          {navMode === 'dm' && (
            <button
              type="button"
              onClick={onOpenDmFinder}
              className="ml-2 hidden h-[34px] items-center gap-2 rounded-xl border border-[var(--color-base-600)]/70 bg-[var(--color-base-800)]/90 px-3 text-xs font-medium text-[var(--color-base-300)] transition-all duration-150 hover:border-[var(--color-brand-300)]/45 hover:bg-[var(--color-base-700)] hover:text-[var(--color-base-100)] lg:inline-flex"
              title="Find people"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Find People
            </button>
          )}
        </div>

        <div className="flex min-w-0 shrink items-center justify-center">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex h-[36px] w-[190px] min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-[var(--color-base-600)]/70 bg-[var(--color-base-800)]/90 px-3 transition-all duration-150 hover:border-[var(--color-brand-300)]/45 hover:bg-[var(--color-base-700)] sm:w-[230px] md:w-[280px] xl:w-[360px]"
          >
            <Search className="h-3.5 w-3.5 text-[var(--color-base-400)]" />
            <span className="min-w-0 flex-1 truncate whitespace-nowrap text-sm text-[var(--color-base-400)]">Search conversations, channels, members...</span>
            <span className="hidden items-center gap-0.5 rounded border border-[var(--color-base-600)] bg-[var(--color-base-700)] px-1 py-0.5 font-mono text-[0.6rem] text-[var(--color-base-500)] lg:flex">
              {isMac ? '⌘K' : 'Ctrl K'}
            </span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {hasConversation && (
            <>
              <div className="mx-1 h-4 w-px bg-[var(--color-base-600)]" />
              <button
                type="button"
                onClick={handleInviteAndStart}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-700)] hover:text-[var(--color-base-200)]"
                title="Start video call"
              >
                <Video className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleInviteAndStart}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-700)] hover:text-[var(--color-base-200)]"
                title="Start voice call"
              >
                <Phone className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-700)] hover:text-[var(--color-base-200)]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </>
          )}

          <div className="relative">
            <motion.div
              key={bellAnimationKey}
              animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <button
                ref={bellButtonRef}
                type="button"
                onClick={() => {
                  const next = !showNotificationsDropdown;
                  setShowNotificationsDropdown(next);
                  setShowProfileDropdown(false);
                  onToggleNotifications?.(next);
                }}
                className="relative flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-700)] hover:text-[var(--color-base-200)]"
              >
                <Bell className="h-4 w-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-brand-500)] px-1 text-[0.55rem] font-bold text-white">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>
            </motion.div>

            <AnimatePresence>
              {showNotificationsDropdown && (
                <NotificationDropdown
                  isOpen={showNotificationsDropdown}
                  onOpenChange={setShowNotificationsDropdown}
                  hideTrigger
                  triggerRef={bellButtonRef}
                  notifications={notifications}
                  loading={notificationsLoading}
                  onMarkRead={onMarkNotificationRead}
                  onMarkAllRead={onMarkAllNotificationsRead}
                  onAcceptConnection={onAcceptConnectionRequest}
                  onRejectConnection={onRejectConnectionRequest}
                  onAcceptInvitation={onAcceptInvitation}
                  onDeclineInvitation={onDeclineInvitation}
                  onOpenNotification={onOpenNotification}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="mx-1 h-4 w-px bg-[var(--color-base-600)]" />

          <div className="relative">
            <button
              ref={avatarButtonRef}
              type="button"
              onClick={() => {
                setShowProfileDropdown((prev) => !prev);
                setShowNotificationsDropdown(false);
              }}
              className="relative h-8 w-8"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser?.name || 'User'}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${getGradientClass(currentUser?.name || 'User')} text-[10px] font-bold text-white`}>
                  {getInitials(currentUser?.name || 'User')}
                </span>
              )}
              <span
                className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[var(--color-base-900)]"
                style={{ backgroundColor: userStatusColor }}
              />
            </button>

            <AnimatePresence>
              {showProfileDropdown && (
                <UserProfileDropdown
                  isOpen={showProfileDropdown}
                  onOpenChange={setShowProfileDropdown}
                  hideTrigger
                  triggerRef={avatarButtonRef}
                  status={currentUser?.status || 'available'}
                  onOpenSettings={onOpenSettings}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <audio
        ref={ringtoneAudioRef}
        preload="auto"
        src="data:audio/wav;base64,UklGRjQFAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAFAACAgICAgICAgICAgICAgH9/f39/f39/f39/f39/f39/gICAgICAgICAgICAgICAgICAgICAgICAgH9/f39/f39/f39/f39/f39/f39/gICAgICAgICAgICAgICAgICAgICAgICAgH9/f39/f39/f39/f39/f39/f39/gICAgICAgICAgICAgICAgICAgICAgICAgH9/f39/f39/f39/f39/f39/f39/gICAgICAgICAgICAgICAgICAgICAgICAgH9/f39/f39/f39/f39/f39/f39/gICAgICAgICAgICAgICAgICAgICAgICAgH9/f39/f39/f39/f39/f39/f39/gICAgICAgICAgICAgICAgICAgICAgICAgH9/f39/f39/f39/f39/f39/f39/gICAgICAgICAgICAgICAgICAgICAgICAgH9/f39/f39/f39/f39/f39/f39/gICAgICAgICAgICAgICAgICAgICAgICAgH9/f39/f39/f39/f39/f39/f39/gICAgICAgICAgICAgICAgICAgICAgICAgH9/f39/f39/f39/f39/f39/f39/gICAgICAgICAgICAgICAgICAgICAgICAgH9/f39/f39/f39/f39/f39/f39/gICAgICAgICAgICAgICAgICAgICAgICAgA=="
      />

      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto fixed bottom-5 right-5 z-[120] w-[min(360px,calc(100vw-1.5rem))] rounded-xl border border-[var(--color-brand-400)]/45 bg-[var(--color-base-800)]/95 p-3 shadow-2xl backdrop-blur"
          >
            <p className="text-xs uppercase tracking-wider text-[var(--color-brand-300)]">Incoming Call</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-base-100)]">{incomingCall?.title || 'Conversation'}</p>
            <p className="mt-0.5 text-xs text-[var(--color-base-400)]">{incomingCall?.from?.name || 'Someone'} is calling</p>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={declineIncomingCall}
                className="rounded-md border border-[var(--color-base-600)] px-3 py-1.5 text-xs text-[var(--color-base-300)] hover:bg-[var(--color-base-700)]"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={acceptIncomingCall}
                className="rounded-md bg-[var(--color-brand-500)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-brand-400)]"
              >
                Join
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
