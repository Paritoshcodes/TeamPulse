import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useSocketContext } from '../context/SocketContext';
import * as notificationService from '../services/notificationService';

const gradients = [
    'from-violet-500 to-indigo-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',
    'from-purple-500 to-violet-600',
];

function getGradientClass(name = '') {
    const index = String(name)
        .split('')
        .reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length;
    return gradients[index];
}

function getInitials(name = '') {
    const words = String(name).trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
        return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
    }
    return (name || 'U').slice(0, 2).toUpperCase();
}

function getRelativeTime(dateStr) {
    if (!dateStr) return 'now';
    const ts = new Date(dateStr).getTime();
    if (Number.isNaN(ts)) return 'now';

    const diffMinutes = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'yesterday';
    return `${Math.floor(diffHours / 24)}d ago`;
}

function toDateKey(dateInput) {
    const date = new Date(dateInput);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getSectionName(dateInput) {
    const date = new Date(dateInput);
    const now = new Date();
    const todayKey = toDateKey(now);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKey(yesterday);

    const targetKey = toDateKey(date);
    if (targetKey === todayKey) return 'Today';
    if (targetKey === yesterdayKey) return 'Yesterday';
    return 'Earlier';
}

function NotificationSkeleton() {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-base-700)] animate-pulse" />
            <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded bg-[var(--color-base-700)] animate-pulse" />
                <div className="h-2 w-1/2 rounded bg-[var(--color-base-700)]/60 animate-pulse" />
            </div>
        </div>
    );
}

function getNotificationText(notification) {
    return notification?.message || notification?.body || notification?.content || notification?.title || 'New notification';
}

export default function NotificationDropdown({
    isOpen: controlledIsOpen,
    onOpenChange,
    hideTrigger = false,
    triggerRef,
    notifications: controlledNotifications,
    loading: controlledLoading,
    onMarkRead,
    onMarkAllRead,
    onAcceptConnection,
    onRejectConnection,
    onAcceptInvitation,
    onDeclineInvitation,
    onOpenNotification,
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [localNotifications, setLocalNotifications] = useState([]);
    const [localLoading, setLocalLoading] = useState(true);
    const [actionLoadingById, setActionLoadingById] = useState({});
    const dropdownRef = useRef(null);
    const socketCtx = useSocketContext();
    const hasControlledNotifications = Array.isArray(controlledNotifications);
    const notifications = hasControlledNotifications ? controlledNotifications : localNotifications;
    const loading = typeof controlledLoading === 'boolean' ? controlledLoading : localLoading;

    const isControlled = typeof controlledIsOpen === 'boolean';
    const isOpen = isControlled ? controlledIsOpen : internalOpen;
    const setOpen = (value) => {
        if (!isControlled) {
            setInternalOpen(value);
        }
        onOpenChange?.(value);
    };

    const unreadCount = useMemo(
        () => notifications.filter((notification) => !notification?.read).length,
        [notifications]
    );

    useEffect(() => {
        if (hasControlledNotifications) return undefined;

        let cancelled = false;

        const loadNotifications = async () => {
            setLocalLoading(true);
            try {
                const data = await notificationService.getNotifications();
                if (!cancelled && data?.success) {
                    setLocalNotifications(Array.isArray(data.notifications) ? data.notifications : []);
                }
            } catch {
                if (!cancelled) {
                    setLocalNotifications([]);
                }
            } finally {
                if (!cancelled) {
                    setLocalLoading(false);
                }
            }
        };

        loadNotifications();
        return () => {
            cancelled = true;
        };
    }, [hasControlledNotifications]);

    useEffect(() => {
        if (hasControlledNotifications) return undefined;

        const socket = socketCtx?.socket;
        if (!socket) return;

        const handleNewNotification = (payload) => {
            const next = payload?.notification || payload;
            if (!next?._id) return;
            setLocalNotifications((prev) => {
                if (prev.some((item) => item?._id === next._id)) return prev;
                return [next, ...prev];
            });
        };

        socket.on('new_notification', handleNewNotification);
        return () => {
            socket.off('new_notification', handleNewNotification);
        };
    }, [socketCtx?.socket, hasControlledNotifications]);

    useEffect(() => {
        if (!isOpen) return;

        const handler = (event) => {
            const target = event.target;
            if (dropdownRef.current?.contains(target)) return;
            if (triggerRef?.current?.contains(target)) return;
            setOpen(false);
        };

        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, triggerRef]);

    const markOneAsRead = async (notificationId) => {
        if (!notificationId) return;

        if (typeof onMarkRead === 'function') {
            await onMarkRead(notificationId);
            return;
        }

        setLocalNotifications((prev) =>
            prev.map((item) => (item._id === notificationId ? { ...item, read: true } : item))
        );

        try {
            await notificationService.markNotificationRead(notificationId);
        } catch {
            setLocalNotifications((prev) =>
                prev.map((item) => (item._id === notificationId ? { ...item, read: false } : item))
            );
        }
    };

    const markAllAsRead = async () => {
        if (typeof onMarkAllRead === 'function') {
            await onMarkAllRead();
            return;
        }

        try {
            await notificationService.markAllNotificationsRead();
            setLocalNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
        } catch {
            // preserve current state if API fails
        }
    };

    const setActionLoading = (notificationId, value) => {
        setActionLoadingById((prev) => ({ ...prev, [notificationId]: value }));
    };

    const handleConnectionAction = async (notification, action) => {
        if (!notification?._id || !notification?.sender?._id) return;
        const notificationId = notification._id;
        setActionLoading(notificationId, true);
        try {
            if (action === 'accept' && typeof onAcceptConnection === 'function') {
                await onAcceptConnection(notification);
            }
            if (action === 'reject' && typeof onRejectConnection === 'function') {
                await onRejectConnection(notification);
            }
            await markOneAsRead(notificationId);
        } finally {
            setActionLoading(notificationId, false);
        }
    };

    const handleOpenNotification = async (notification) => {
        if (!notification?._id) return;
        setActionLoading(notification._id, true);
        try {
            await onOpenNotification?.(notification);
            if (!notification?.read) {
                await markOneAsRead(notification._id);
            }
            setOpen(false);
        } finally {
            setActionLoading(notification._id, false);
        }
    };

    const handleInvitationAction = async (notification, action) => {
        const notificationId = notification?._id;
        if (!notificationId) return;

        const relatedInvitationId =
            typeof notification?.relatedInvitation === 'object'
                ? notification?.relatedInvitation?._id
                : notification?.relatedInvitation;

        if (!relatedInvitationId) {
            // Fallback to opening invitation center when notification payload doesn't include related invitation id.
            await handleOpenNotification(notification);
            return;
        }

        setActionLoading(notificationId, true);
        try {
            if (action === 'accept' && typeof onAcceptInvitation === 'function') {
                await onAcceptInvitation(notification);
            }
            if (action === 'decline' && typeof onDeclineInvitation === 'function') {
                await onDeclineInvitation(notification);
            }
            await markOneAsRead(notificationId);
        } finally {
            setActionLoading(notificationId, false);
        }
    };

    const grouped = useMemo(() => {
        const sections = {
            Today: [],
            Yesterday: [],
            Earlier: [],
        };

        notifications.forEach((notification) => {
            const section = getSectionName(notification?.createdAt);
            sections[section].push(notification);
        });

        return sections;
    }, [notifications]);

    return (
        <div className="relative">
            {!hideTrigger && (
                <button
                    type="button"
                    onClick={() => setOpen(!isOpen)}
                    className="relative flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-700)] hover:text-[var(--color-base-200)]"
                >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-brand-500)] px-1 text-[0.55rem] font-bold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={dropdownRef}
                        key="notification-panel"
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        style={{ transformOrigin: 'top right' }}
                        className="absolute right-0 top-full z-[9999] mt-2 flex max-h-[480px] w-[360px] flex-col overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-[16px] backdrop-saturate-[180%]"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-base-600)]/40 flex-shrink-0">
                            <h3 className="text-sm font-semibold text-[var(--color-base-100)]">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={markAllAsRead}
                                    className="text-xs text-[var(--color-brand-400)] hover:text-[var(--color-brand-300)] transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto sidebar-scroll">
                            {loading ? (
                                <div>
                                    <NotificationSkeleton />
                                    <NotificationSkeleton />
                                    <NotificationSkeleton />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <CheckCircle2 className="w-10 h-10 text-[var(--color-base-600)]" />
                                    <p className="text-sm font-medium text-[var(--color-base-400)]">You're all caught up</p>
                                    <p className="text-xs text-[var(--color-base-500)]">No new notifications</p>
                                </div>
                            ) : (
                                ['Today', 'Yesterday', 'Earlier'].map((section) => {
                                    const items = grouped[section];
                                    if (!items?.length) return null;

                                    return (
                                        <div key={section}>
                                            <div className="px-4 py-2 text-[0.6rem] uppercase tracking-widest font-semibold text-[var(--color-base-500)] border-b border-[var(--color-base-600)]/20 bg-[var(--color-base-800)]/75">
                                                {section}
                                            </div>

                                            <AnimatePresence initial={false}>
                                                {items.map((notification) => {
                                                    const senderName = notification?.sender?.name || 'System';
                                                    const notificationText = getNotificationText(notification);
                                                    const isUnread = !notification?.read;
                                                    const isConnectionRequest = notification?.type === 'connection_request';
                                                    const isInvitation = notification?.type === 'invitation';
                                                    const rowLoading = Boolean(actionLoadingById[notification._id]);
                                                    const relatedInvitationId =
                                                        typeof notification?.relatedInvitation === 'object'
                                                            ? notification?.relatedInvitation?._id
                                                            : notification?.relatedInvitation;

                                                    return (
                                                        <motion.div
                                                            key={notification._id}
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <div
                                                                className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors ${
                                                                    isUnread
                                                                        ? 'bg-[var(--color-brand-500)]/5 hover:bg-[var(--color-brand-500)]/8'
                                                                        : 'hover:bg-[var(--color-base-700)]/40'
                                                                }`}
                                                            >
                                                                {notification?.sender?.avatar ? (
                                                                    <img
                                                                        src={notification.sender.avatar}
                                                                        alt={senderName}
                                                                        className="h-8 w-8 rounded-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${getGradientClass(senderName)} text-xs font-bold text-white`}>
                                                                        {getInitials(senderName)}
                                                                    </span>
                                                                )}

                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm text-[var(--color-base-150)] leading-snug break-words">
                                                                        {notificationText}
                                                                    </p>
                                                                    <p className="text-[0.6rem] text-[var(--color-base-500)] mt-1">
                                                                        {getRelativeTime(notification?.createdAt)}
                                                                    </p>

                                                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                                        {isConnectionRequest && (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={rowLoading}
                                                                                    onClick={() => handleConnectionAction(notification, 'accept')}
                                                                                    className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                                                                >
                                                                                    Accept
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={rowLoading}
                                                                                    onClick={() => handleConnectionAction(notification, 'reject')}
                                                                                    className="rounded-md border border-[var(--color-base-600)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-base-200)] transition-colors hover:bg-[var(--color-base-700)] disabled:cursor-not-allowed disabled:opacity-60"
                                                                                >
                                                                                    Reject
                                                                                </button>
                                                                            </>
                                                                        )}

                                                                        {isInvitation && (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={rowLoading}
                                                                                    onClick={() => handleInvitationAction(notification, 'accept')}
                                                                                    className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                                                                >
                                                                                    Accept
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={rowLoading}
                                                                                    onClick={() => handleInvitationAction(notification, 'decline')}
                                                                                    className="rounded-md border border-[var(--color-base-600)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-base-200)] transition-colors hover:bg-[var(--color-base-700)] disabled:cursor-not-allowed disabled:opacity-60"
                                                                                >
                                                                                    Decline
                                                                                </button>
                                                                            </>
                                                                        )}

                                                                        {!isConnectionRequest && !isInvitation && (
                                                                            <button
                                                                                type="button"
                                                                                disabled={rowLoading}
                                                                                onClick={() => handleOpenNotification(notification)}
                                                                                className="rounded-md bg-[var(--color-base-700)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-base-100)] transition-colors hover:bg-[var(--color-base-600)] disabled:cursor-not-allowed disabled:opacity-60"
                                                                            >
                                                                                Open
                                                                            </button>
                                                                        )}

                                                                        {isUnread && (
                                                                            <button
                                                                                type="button"
                                                                                disabled={rowLoading}
                                                                                onClick={() => markOneAsRead(notification._id)}
                                                                                className="rounded-md border border-[var(--color-base-600)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-700)] disabled:cursor-not-allowed disabled:opacity-60"
                                                                            >
                                                                                Mark read
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {isUnread && (
                                                                    <span className="w-2 h-2 rounded-full bg-[var(--color-brand-500)] self-center flex-shrink-0" />
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
