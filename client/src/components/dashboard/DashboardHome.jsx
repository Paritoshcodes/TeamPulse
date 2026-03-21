import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Bell,
  Hash,
  Inbox,
  MessageSquare,
  Pin,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOnlineStatus } from '../../context/OnlineStatusContext.jsx';
import * as dashboardService from '../../services/dashboardService.js';
import { slideUp, staggerContainer } from '../../utils/motionPresets.js';

const gradients = [
  'from-violet-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-purple-500 to-violet-600',
];

const sectionVariants = {
  initial: slideUp.initial,
  animate: slideUp.animate,
  exit: slideUp.exit,
  transition: slideUp.transition,
};

function getInitials(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }
  return (name || 'U').slice(0, 2).toUpperCase();
}

function getGradientClass(name = '') {
  const index = String(name)
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
}

function getSafeText(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    if (typeof value.name === 'string') return value.name;
    if (typeof value.displayName === 'string') return value.displayName;
    if (typeof value.username === 'string') return value.username;
    if (typeof value.title === 'string') return value.title;
    if (typeof value.content === 'string') return value.content;
    if (typeof value.channelName === 'string') return value.channelName;
    if (typeof value.label === 'string') return value.label;
  }
  return fallback;
}

function getSafeId(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (value._id != null) return String(value._id);
    if (value.id != null) return String(value.id);
    if (value.channelId != null) return String(value.channelId);
    if (value.userId != null) return String(value.userId);
  }
  return '';
}

function formatRelative(dateInput) {
  const value = dateInput ? new Date(dateInput).getTime() : null;
  if (!value || Number.isNaN(value)) return 'now';

  const diffMinutes = Math.max(0, Math.floor((Date.now() - value) / 60000));
  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour <= 17) return 'Good afternoon';
  return 'Good evening';
}

function StatsSkeletonCard() {
  return (
    <div className="p-4 rounded-xl bg-[var(--color-base-800)] border border-[var(--color-base-600)]/40 animate-pulse">
      <div className="h-9 w-9 rounded-lg bg-[var(--color-base-700)]" />
      <div className="w-8 h-7 rounded bg-[var(--color-base-700)] mt-3" />
      <div className="w-16 h-3 rounded bg-[var(--color-base-700)] mt-1" />
    </div>
  );
}

export default function DashboardHome({ overview, onSelectChannel, onSelectDm }) {
  const { user } = useAuth();
  const { members, onlineUsers } = useOnlineStatus();

  const [homeOverview, setHomeOverview] = useState(overview || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    dashboardService
      .getDashboardOverview()
      .then((data) => {
        if (!cancelled) {
          setHomeOverview(data || null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHomeOverview(overview || null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (overview) {
      setHomeOverview((prev) => prev || overview);
      if (!loading) {
        setLoading(false);
      }
    }
  }, [overview, loading]);

  const displayName = user?.displayName || user?.name || user?.username || 'there';
  const firstName = String(displayName).split(' ')[0] || 'there';

  const stats = [
    {
      label: 'Unread',
      value: homeOverview?.unreadMessages ?? 0,
      icon: Inbox,
    },
    {
      label: 'Threads',
      value: homeOverview?.activeThreads ?? 0,
      icon: MessageSquare,
    },
    {
      label: 'Notifications',
      value: homeOverview?.unreadNotifications ?? 0,
      icon: Bell,
    },
    {
      label: 'Online',
      value: homeOverview?.onlineCount ?? onlineUsers?.size ?? 0,
      icon: Users,
    },
  ];

  const activityItems = homeOverview?.recentActivity || homeOverview?.activityTimeline || [];
  const filteredActivityItems = useMemo(() => {
    const currentUserId = getSafeId(user);
    const ownNames = new Set(
      [user?.displayName, user?.name, user?.username]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
    );

    return activityItems.filter((item) => {
      const actorId = getSafeId(item?.user)
        || getSafeId(item?.sender)
        || getSafeId(item?.author)
        || getSafeId(item?.member);

      if (currentUserId && actorId && actorId === currentUserId) {
        return false;
      }

      const actorName = (
        getSafeText(item?.name, '')
        || getSafeText(item?.sender, '')
        || getSafeText(item?.sender?.name, '')
        || getSafeText(item?.sender?.displayName, '')
      ).toLowerCase();

      if (!actorId && actorName && ownNames.has(actorName)) {
        return false;
      }

      return true;
    });
  }, [activityItems, user]);

  const availabilityMembers = useMemo(() => {
    if (Array.isArray(members) && members.length > 0) {
      return members;
    }

    const fallback = homeOverview?.availability || [];
    return fallback.map((item) => {
      const status = item?.status || (item?.online ? 'online' : 'away');
      return {
        ...item,
        status,
        online: status === 'online',
      };
    });
  }, [members, homeOverview?.availability]);

  const visibleMembers = availabilityMembers.slice(0, 8);
  const hiddenCount = Math.max(0, availabilityMembers.length - visibleMembers.length);
  const onlineCount = homeOverview?.onlineCount ?? availabilityMembers.filter((member) => member?.online || member?.status === 'online').length;

  const pinnedConversations = homeOverview?.pinnedConversations || [];

  return (
    <div className="h-full w-full overflow-y-auto sidebar-scroll bg-[var(--color-base-900)]/35 px-5 py-6 md:px-8 md:py-8">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="mx-auto max-w-[980px]"
      >
        <motion.section variants={sectionVariants} className="mb-6 rounded-2xl border border-[var(--color-base-600)]/45 bg-[var(--color-base-800)]/88 p-6 shadow-sm backdrop-blur-sm">
          <h1 className="text-2xl font-semibold text-[var(--color-base-50)] tracking-tight mb-1">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-[var(--color-base-350)]">Here is a quick snapshot of your workspace health and activity.</p>
        </motion.section>

        <motion.section variants={sectionVariants} className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <StatsSkeletonCard key={index} />)
            : stats.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className="group cursor-pointer rounded-xl border border-[var(--color-base-600)]/45 bg-[var(--color-base-800)]/90 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-brand-300)]/35 hover:bg-[var(--color-base-700)]/75"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--color-brand-500)]/10 group-hover:bg-[var(--color-brand-500)]/20 transition-colors">
                    <Icon className="w-4 h-4 text-[var(--color-brand-400)]" />
                  </div>
                  <p className="text-2xl font-bold text-[var(--color-base-50)] leading-none mt-3">{item.value}</p>
                  <p className="text-xs text-[var(--color-base-400)] mt-1">{item.label}</p>
                </button>
              );
            })}
        </motion.section>

        <motion.section variants={sectionVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-[var(--color-base-800)]/92 rounded-xl p-4 border border-[var(--color-base-600)]/40 shadow-sm">
            <h2 className="text-[0.65rem] uppercase tracking-widest font-semibold text-[var(--color-base-400)] mb-3">Recent Activity</h2>

            {filteredActivityItems.length > 0 ? (
              <div>
                {filteredActivityItems.slice(0, 8).map((item, index) => {
                  const personName = getSafeText(item?.name, '')
                    || getSafeText(item?.sender, '')
                    || getSafeText(item?.sender?.name, '')
                    || getSafeText(item?.sender?.displayName, '')
                    || 'Someone';
                  const channelName = getSafeText(item?.channel, '')
                    || getSafeText(item?.channelName, '')
                    || 'general';
                  return (
                    <div key={item?._id || `${personName}-${index}`} className="flex items-start gap-3 py-2">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getGradientClass(personName)} text-[0.65rem] font-semibold text-white`}>
                        {getInitials(personName)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--color-base-300)]">
                          <span className="font-medium text-[var(--color-base-200)]">{personName}</span>{' '}
                          sent a message in{' '}
                          <span className="text-[var(--color-brand-400)]">#{channelName}</span>
                        </p>
                        <p className="text-[0.6rem] text-[var(--color-base-500)] mt-0.5">
                          {formatRelative(item?.createdAt || item?.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center gap-2">
                <Activity className="w-8 h-8 text-[var(--color-base-600)]" />
                <p className="text-sm text-[var(--color-base-500)]">No recent activity</p>
              </div>
            )}
          </div>

          <div className="bg-[var(--color-base-800)]/92 rounded-xl p-4 border border-[var(--color-base-600)]/40 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[0.65rem] uppercase tracking-widest font-semibold text-[var(--color-base-400)]">Team</h2>
              <span className="text-[0.6rem] bg-[var(--color-success)]/15 text-[var(--color-success)] rounded-full px-2 py-0.5">
                {onlineCount} online
              </span>
            </div>

            <div>
              {visibleMembers.map((member, index) => {
                const name = getSafeText(member?.name, '')
                  || getSafeText(member?.username, '')
                  || `Member ${index + 1}`;
                const status = member?.status === 'busy'
                  ? 'busy'
                  : member?.status === 'online' || member?.online
                    ? 'online'
                    : 'away';

                return (
                  <div key={member?.id || member?._id || `${name}-${index}`} className="flex items-center gap-2.5 py-1.5 rounded-lg hover:bg-[var(--color-base-700)]/50 px-2 -mx-2 transition-colors">
                    <div className="relative h-7 w-7 shrink-0">
                      {member?.avatar ? (
                        <img src={member.avatar} alt={name} className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${getGradientClass(name)} text-[0.65rem] font-semibold text-white`}>
                          {getInitials(name)}
                        </span>
                      )}
                      <span
                        className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[var(--color-base-800)]"
                        style={{
                          backgroundColor:
                            status === 'online'
                              ? 'var(--color-success)'
                              : status === 'busy'
                                ? 'var(--color-warning)'
                                : 'var(--color-base-400)',
                        }}
                      />
                    </div>

                    <span className="text-sm text-[var(--color-base-200)] flex-1 truncate">{name}</span>
                    <span
                      className={`text-xs ${
                        status === 'online'
                          ? 'text-[var(--color-success)]'
                          : status === 'busy'
                            ? 'text-[var(--color-warning)]'
                            : 'text-[var(--color-base-400)]'
                      }`}
                    >
                      {status === 'online' ? 'Active' : status === 'busy' ? 'Busy' : 'Away'}
                    </span>
                  </div>
                );
              })}

              {hiddenCount > 0 && (
                <p className="pt-1 text-xs text-[var(--color-base-500)]">+{hiddenCount} more</p>
              )}
            </div>
          </div>
        </motion.section>

        {pinnedConversations.length > 0 && (
          <motion.section variants={sectionVariants} className="mb-4">
            <div className="mb-2 flex items-center gap-1.5 text-[0.65rem] uppercase tracking-widest font-semibold text-[var(--color-base-400)]">
              <span>Pinned</span>
              <Pin className="w-3.5 h-3.5" />
            </div>

            <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2">
              {pinnedConversations.map((item, index) => {
                const isDm = item?.kind === 'dm';
                const displayName = getSafeText(item?.channel, '')
                  || getSafeText(item?.name, '')
                  || (isDm ? 'Direct Message' : 'Channel');
                const preview = getSafeText(item?.preview, '')
                  || getSafeText(item?.lastMessage, '')
                  || getSafeText(item?.channel, '')
                  || 'Open conversation';
                const timestamp = formatRelative(item?.updatedAt || item?.createdAt || item?.lastActivityAt);
                const targetId = getSafeId(item?.channelId) || getSafeId(item?._id);

                return (
                  <button
                    key={`${targetId || displayName}-${index}`}
                    type="button"
                    onClick={() => {
                      if (isDm) {
                        onSelectDm?.(targetId, displayName);
                      } else {
                        onSelectChannel?.(targetId, displayName);
                      }
                    }}
                    className="flex-shrink-0 w-[200px] p-3 rounded-xl cursor-pointer bg-[var(--color-base-800)] border border-[var(--color-base-600)]/40 hover:border-[var(--color-base-500)]/60 transition-all text-left"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-base-200)]">
                      {isDm ? (
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${getGradientClass(displayName)} text-[0.55rem] font-semibold text-white`}>
                          {getInitials(displayName)}
                        </span>
                      ) : (
                        <Hash className="w-4 h-4 text-[var(--color-brand-400)]" />
                      )}
                      <span className="truncate">{displayName}</span>
                    </div>
                    <p className="text-xs text-[var(--color-base-400)] line-clamp-2 mt-1">{preview}</p>
                    <p className="text-[0.6rem] text-[var(--color-base-500)] mt-2">{timestamp}</p>
                  </button>
                );
              })}
            </div>
          </motion.section>
        )}
      </motion.div>
    </div>
  );
}
