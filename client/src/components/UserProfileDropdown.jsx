import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, Settings, ChevronDown, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui';
import * as dashboardService from '../services/dashboardService';
import toast from 'react-hot-toast';

const gradients = [
    'from-violet-500 to-indigo-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',
    'from-purple-500 to-violet-600',
];

const getStatusValue = (candidate) => {
    const normalized = String(candidate || '').toLowerCase();
    if (normalized === 'busy' || normalized === 'away' || normalized === 'available') {
        return normalized;
    }
    return 'available';
};

const getDisplayName = (user) => user?.displayName || user?.name || user?.username || 'User';

const getUsername = (user) => {
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'user';
};

const getGradientClass = (name = '') => {
    const index = (name?.charCodeAt?.(0) || 0) % gradients.length;
    return gradients[index];
};

const getInitials = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return String(name || 'U').slice(0, 2).toUpperCase();
};

const statusDotClass = {
    available: 'bg-[#22c55e]',
    busy: 'bg-[#f59e0b]',
    away: 'bg-[#6b7280]',
};

const statusMeta = {
    available: { label: 'Available', active: 'bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/30' },
    busy: { label: 'Busy', active: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/30' },
    away: { label: 'Away', active: 'bg-[var(--color-base-600)] text-[var(--color-base-300)] border border-[var(--color-base-500)]/50' },
};

export default function UserProfileDropdown({
    onOpenSettings,
    status = 'available',
    isOpen: controlledIsOpen,
    onOpenChange,
    hideTrigger = false,
    triggerRef,
}) {
    const { user, logout, refreshUser } = useAuth();
    const [internalOpen, setInternalOpen] = useState(false);
    const [optimisticStatus, setOptimisticStatus] = useState(
        getStatusValue(user?.status || user?.availabilityStatus || user?.onlineStatus || status)
    );

    const isControlled = typeof controlledIsOpen === 'boolean';
    const isOpen = isControlled ? controlledIsOpen : internalOpen;
    const dropdownRef = useRef(null);
    const setOpen = (value) => {
        if (!isControlled) {
            setInternalOpen(value);
        }
        onOpenChange?.(value);
    };

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

    useEffect(() => {
        setOptimisticStatus(getStatusValue(user?.status || user?.availabilityStatus || user?.onlineStatus || status));
    }, [status, user?.status, user?.availabilityStatus, user?.onlineStatus]);

    const handleLogout = async () => {
        try {
            await logout();
        } catch {
            toast.error('Logout failed');
        }
    };

    const handleStatusChange = async (nextStatus) => {
        const normalized = getStatusValue(nextStatus);
        if (normalized === optimisticStatus) {
            return;
        }

        const previous = optimisticStatus;
        setOptimisticStatus(normalized);

        try {
            await dashboardService.updateAvailabilityStatus(normalized);
            await refreshUser();
        } catch (err) {
            setOptimisticStatus(previous);
            toast.error(err?.message || 'Failed to update status');
        }
    };

    const displayName = getDisplayName(user);
    const username = getUsername(user);

    return (
        <div className="relative">
            {!hideTrigger && (
                <motion.button
                    type="button"
                    onClick={() => setOpen(!isOpen)}
                    className="group flex cursor-pointer items-center gap-2 rounded-full border border-transparent py-1 pl-0.5 pr-1.5 outline-none transition-all hover:border-border/70"
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="relative rounded-full">
                        <Avatar
                            name={displayName || user?.email}
                            src={user?.avatar}
                            size="sm"
                            showStatus
                            status={status}
                            className="shadow-none"
                        />
                    </div>
                    <span className="hidden max-w-[100px] truncate text-[13px] font-semibold text-foreground/85 transition-colors group-hover:text-foreground md:block">
                        {displayName}
                    </span>
                    <ChevronDown
                        className={`hidden h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 md:block ${isOpen ? 'rotate-180' : ''}`}
                    />
                </motion.button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            ref={dropdownRef}
                            initial={{ opacity: 0, scale: 0.95, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                            transition={{ duration: 0.15 }}
                            style={{ transformOrigin: 'top right' }}
                            className="absolute right-0 top-full z-50 mt-2 w-[260px] overflow-hidden rounded-xl border border-[var(--color-base-600)]/60 bg-[var(--color-base-800)]/96 shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                        >
                            <div className="border-b border-[var(--color-base-600)]/40 px-4 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative h-10 w-10">
                                        {user?.avatar ? (
                                            <img src={user.avatar} alt={displayName} className="h-10 w-10 rounded-full object-cover" />
                                        ) : (
                                            <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${getGradientClass(displayName)} text-sm font-bold text-white`}>
                                                {getInitials(displayName)}
                                            </span>
                                        )}
                                        <span
                                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-base-800)] ${statusDotClass[optimisticStatus]}`}
                                        />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-[var(--color-base-50)]">{displayName}</p>
                                        <p className="truncate text-xs text-[var(--color-base-350)]">@{username}</p>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center gap-1.5">
                                    {Object.entries(statusMeta).map(([key, value]) => {
                                        const isActive = optimisticStatus === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => handleStatusChange(key)}
                                                className={`cursor-pointer rounded-full px-2.5 py-1 text-xs transition-all ${
                                                    isActive
                                                        ? value.active
                                                        : 'text-[var(--color-base-350)] hover:bg-[var(--color-base-700)]/65 hover:text-[var(--color-base-200)]'
                                                }`}
                                            >
                                                {value.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="py-1">
                                <button
                                    onClick={() => {
                                        onOpenSettings?.();
                                        setOpen(false);
                                    }}
                                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-700)]/60 hover:text-[var(--color-base-50)]"
                                >
                                    <User className="h-4 w-4 shrink-0 text-[var(--color-base-400)]" />
                                    Profile
                                </button>
                                <button
                                    onClick={() => {
                                        onOpenSettings?.();
                                        setOpen(false);
                                    }}
                                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-700)]/60 hover:text-[var(--color-base-50)]"
                                >
                                    <Settings className="h-4 w-4 shrink-0 text-[var(--color-base-400)]" />
                                    Settings
                                </button>
                                <button
                                    onClick={() => {
                                        onOpenSettings?.();
                                        setOpen(false);
                                    }}
                                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-700)]/60 hover:text-[var(--color-base-50)]"
                                >
                                    <Monitor className="h-4 w-4 shrink-0 text-[var(--color-base-400)]" />
                                    Appearance
                                </button>

                                <div className="mx-4 my-1 h-px bg-[var(--color-base-600)]/40" />

                                <button
                                    onClick={handleLogout}
                                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/10 hover:text-red-400"
                                >
                                    <LogOut className="h-4 w-4 shrink-0 text-[var(--color-danger)]" />
                                    Log out
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
