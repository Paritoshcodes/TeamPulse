import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Copy,
    ChevronDown,
    ChevronUp,
    Hash,
    MoreHorizontal,
    Pencil,
    Plus,
    Settings,
    Trash2,
    UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    fadeIn,
    slideUp,
    staggerContainer,
} from '../../utils/motionPresets';

const Sidebar = ({
    selectedWorkspaceName,
    selectedWorkspaceId,
    teams = [],
    channels = [],
    selectedChannelId,
    onSelectChannel,
    setSelectedChannelId,
    selectedTeamId,
    setSelectedTeamId,
    onOpenInviteModal,
    onOpenWorkspaceSettings,
    unreadCounts = {},
    onCreateChannel,
    onCreateTeam,
    onChannelAction,
    canManageWorkspace = false,
}) => {
    const [openChannelMenu, setOpenChannelMenu] = useState(null);
    const [menuPos, setMenuPos] = useState(null);
    const [collapsedTeams, setCollapsedTeams] = useState({});
    const channelMenuRef = useRef(null);

    useEffect(() => {
        if (!openChannelMenu) return undefined;

        const handleMouseDown = (event) => {
            if (channelMenuRef.current?.contains(event.target)) {
                return;
            }

            setOpenChannelMenu(null);
            setMenuPos(null);
        };

        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [openChannelMenu]);

    const groupedChannels = useMemo(
        () =>
            teams.map((team) => {
                const teamChannels = Array.isArray(team?.channels)
                    ? team.channels
                    : channels.filter((channel) => {
                        const teamId = channel?._teamId || channel?.team?._id || channel?.team || channel?.teamId;
                        return teamId?.toString() === team._id?.toString();
                    });
                return { ...team, channels: teamChannels };
            }),
        [teams, channels]
    );

    const handleSelectChannel = (channel) => {
        setSelectedTeamId?.(channel?._teamId || channel?.team?._id || channel?.team || channel?.teamId);
        if (onSelectChannel) {
            onSelectChannel(channel._id);
            return;
        }
        setSelectedChannelId?.(channel._id);
    };

    useEffect(() => {
        try {
            const saved = localStorage.getItem('teampulse_collapsed_teams');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    setCollapsedTeams(parsed);
                }
            }
        } catch {
            setCollapsedTeams({});
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('teampulse_collapsed_teams', JSON.stringify(collapsedTeams));
        } catch {
            // Ignore persistence errors.
        }
    }, [collapsedTeams]);

    const handleMenuOpen = (event, channelId) => {
        event.stopPropagation();
        if (openChannelMenu === channelId) {
            setOpenChannelMenu(null);
            setMenuPos(null);
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        setMenuPos({ top: rect.bottom + 4, left: rect.left });
        setOpenChannelMenu(channelId);
    };

    const closeChannelMenu = () => {
        setOpenChannelMenu(null);
        setMenuPos(null);
    };

    const toggleTeamCollapsed = (teamId) => {
        setCollapsedTeams((prev) => ({
            ...prev,
            [teamId]: !prev[teamId],
        }));
    };

    return (
        <aside className="glass-sidebar flex h-full w-[240px] min-w-[200px] flex-col border-r border-[var(--color-base-600)]/45">
            <div className="flex h-[52px] items-center gap-2 border-b border-[var(--color-base-600)]/40 px-3">
                <div className="flex flex-1 items-center px-2.5 py-1.5">
                    <span className="truncate text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-base-300)]">
                        Teams & Channels
                    </span>
                </div>

                <button
                    type="button"
                    onClick={onCreateTeam}
                    title="Create team"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)]/70 hover:text-[var(--color-base-200)]"
                    aria-label="Create team"
                >
                    <Plus className="h-4 w-4" />
                </button>

                {canManageWorkspace && (
                    <button
                        type="button"
                        onClick={onOpenInviteModal}
                        title="Invite members"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)]/70 hover:text-[var(--color-base-200)]"
                        aria-label="Invite members"
                    >
                        <UserPlus className="h-4 w-4" />
                    </button>
                )}

                {canManageWorkspace && (
                    <button
                        type="button"
                        onClick={onOpenWorkspaceSettings}
                        title="Workspace settings"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-base-400)] transition-colors hover:bg-[var(--color-base-600)]/70 hover:text-[var(--color-base-200)]"
                        aria-label="Workspace settings"
                    >
                        <Settings className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="sidebar-scroll flex-1 overflow-y-auto pb-2">
                <motion.div key="workspace-content" {...fadeIn} className="pt-2">
                    {selectedWorkspaceId && teams.length === 0 ? (
                        <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-4 text-center">
                            <Hash className="mb-2 h-8 w-8 text-[var(--color-base-600)]" />
                            <p className="text-sm font-medium text-[var(--color-base-400)]">No teams yet</p>
                            <p className="mt-0.5 text-xs text-[var(--color-base-500)]">Create a team in this workspace to get started</p>
                            <button
                                type="button"
                                onClick={() => onCreateTeam?.()}
                                className="mt-3 rounded-md border border-[var(--color-base-500)]/60 px-2.5 py-1 text-xs text-[var(--color-base-200)] transition-colors hover:bg-[var(--color-base-700)]"
                            >
                                + Create Team
                            </button>
                        </div>
                    ) : (
                        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-1 px-1">
                            {groupedChannels.map((team) => {
                                        const isSelected = selectedTeamId?.toString() === team._id?.toString();
                                        const isCollapsed = Boolean(collapsedTeams[team._id]);

                                        return (
                                            <section key={team._id} className="rounded-lg border border-transparent px-1 py-0.5 transition-colors hover:border-[var(--color-base-600)]/45">
                                                <div
                                                    className={`group flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 ${
                                                        isSelected ? 'bg-[var(--color-base-700)]/70' : 'hover:bg-[var(--color-base-700)]/45'
                                                    }`}
                                                    onClick={() => {
                                                        toggleTeamCollapsed(team._id);
                                                    }}
                                                >
                                                    <span className="rounded p-0.5">
                                                        {isCollapsed ? (
                                                            <ChevronDown className="h-3 w-3 text-[var(--text-secondary)]" />
                                                        ) : (
                                                            <ChevronUp className="h-3 w-3 text-[var(--text-secondary)]" />
                                                        )}
                                                    </span>
                                                    <span className="truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]">
                                                        {team.name}
                                                    </span>
                                                    <span className="ml-1 rounded-full bg-[var(--color-base-600)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-primary)]">
                                                        {team.channels.length}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="ml-auto rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setSelectedTeamId?.(team._id);
                                                            onCreateChannel?.(team._id);
                                                        }}
                                                        aria-label={`Create channel in ${team.name}`}
                                                        title={`Create channel in ${team.name}`}
                                                    >
                                                        <Plus className="h-3.5 w-3.5 text-[var(--color-base-400)]" />
                                                    </button>
                                                </div>

                                                <AnimatePresence initial={false}>
                                                    {!isCollapsed && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.16 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="space-y-0.5 pb-1 pl-5 pr-1 pt-1">
                                                                {team.channels.map((channel) => {
                                                                    const isActive = selectedChannelId === channel._id;
                                                                    const unreadCount = unreadCounts?.[channel._id] || channel.unreadCount || 0;
                                                                    const isUnread = unreadCount > 0;
                                                                    const menuOpen = openChannelMenu === channel._id;
                                                                    const channelLabel = channel?.name
                                                                        || channel?.channelName
                                                                        || channel?.title
                                                                        || channel?.slug
                                                                        || `channel-${String(channel?._id || '').slice(-4)}`;

                                                                    return (
                                                                        <motion.div key={channel._id} variants={slideUp} className="relative">
                                                                            <button
                                                                                type="button"
                                                                                className={`group relative flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors duration-100 ${
                                                                                    isActive
                                                                                        ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] shadow-sm'
                                                                                        : isUnread
                                                                                            ? 'bg-[var(--color-base-700)]/35 font-semibold text-[var(--text-primary)] hover:bg-[var(--color-base-700)]/65'
                                                                                            : 'bg-[var(--color-base-800)]/22 text-[var(--text-secondary)] hover:bg-[var(--color-base-700)]/60 hover:text-[var(--text-primary)]'
                                                                                }`}
                                                                                onClick={() => handleSelectChannel(channel)}
                                                                                aria-label={`Open ${channelLabel}`}
                                                                            >
                                                                                {isActive && (
                                                                                    <motion.div
                                                                                        layoutId="active-channel-indicator"
                                                                                        className="absolute left-0 h-4 w-[3px] rounded-r-full bg-[var(--color-brand-500)]"
                                                                                    />
                                                                                )}

                                                                                <Hash className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                                                                                <span className="min-w-0 flex-1">
                                                                                    <span
                                                                                        className="inline-block max-w-full truncate rounded-md bg-[var(--bg-card)] px-1.5 py-0.5 text-sm font-semibold leading-tight text-[var(--text-primary)]"
                                                                                        style={{ textShadow: '0 1px 1px rgba(0,0,0,0.45)' }}
                                                                                    >
                                                                                        {channelLabel}
                                                                                    </span>
                                                                                </span>

                                                                                {isUnread && (
                                                                                    <span className="min-w-[18px] rounded-full bg-[var(--color-brand-500)] px-1.5 text-center text-[0.6rem] font-bold text-white">
                                                                                        {unreadCount > 99 ? '99+' : unreadCount}
                                                                                    </span>
                                                                                )}

                                                                                <span
                                                                                    role="button"
                                                                                    tabIndex={0}
                                                                                    aria-label="Channel options"
                                                                                    title="Channel options"
                                                                                    className={`rounded p-0.5 transition-opacity ${
                                                                                        menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                                                    }`}
                                                                                    onClick={(event) => handleMenuOpen(event, channel._id)}
                                                                                    onKeyDown={(event) => {
                                                                                        if (event.key === 'Enter' || event.key === ' ') {
                                                                                            event.preventDefault();
                                                                                            handleMenuOpen(event, channel._id);
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                                                                </span>
                                                                            </button>

                                                                            {menuOpen && menuPos && createPortal(
                                                                                <div
                                                                                    ref={channelMenuRef}
                                                                                    style={{ top: menuPos.top, left: menuPos.left }}
                                                                                    className="fixed z-[9999] min-w-[160px] overflow-hidden rounded-lg border border-[var(--color-base-500)]/60 bg-[var(--color-base-700)] shadow-lg"
                                                                                    onClick={(event) => event.stopPropagation()}
                                                                                >
                                                                                    <button
                                                                                        type="button"
                                                                                        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-600)]/60 hover:text-[var(--color-base-50)]"
                                                                                    onClick={() => {
                                                                                        onChannelAction?.('rename', channel);
                                                                                        closeChannelMenu();
                                                                                    }}
                                                                                    title="Rename channel"
                                                                                >
                                                                                    <Pencil className="h-4 w-4" />
                                                                                    Rename
                                                                                </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-600)]/60 hover:text-[var(--color-base-50)]"
                                                                                        onClick={async () => {
                                                                                            const url = `${window.location.origin}/channel/${channel._id}`;
                                                                                            try {
                                                                                                await navigator.clipboard.writeText(url);
                                                                                                toast.success('Link copied');
                                                                                            } catch {
                                                                                                toast.error('Failed to copy link');
                                                                                            }
                                                                                            onChannelAction?.('copy-link', channel._id);
                                                                                            closeChannelMenu();
                                                                                        }}
                                                                                    >
                                                                                        <Copy className="h-4 w-4" />
                                                                                        Copy Link
                                                                                    </button>
                                                                                    {canManageWorkspace && (
                                                                                        <button
                                                                                            type="button"
                                                                                            className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
                                                                                            onClick={() => {
                                                                                                onChannelAction?.('delete', channel._id);
                                                                                                closeChannelMenu();
                                                                                            }}
                                                                                            title="Delete channel"
                                                                                        >
                                                                                            <Trash2 className="h-4 w-4" />
                                                                                            Delete
                                                                                        </button>
                                                                                    )}
                                                                                </div>,
                                                                                document.body
                                                                            )}
                                                                        </motion.div>
                                                                    );
                                                                })}

                                                                {team.channels.length === 0 && (
                                                                    <div className="mx-2 rounded-lg border border-dashed border-[var(--color-base-500)]/65 bg-[var(--color-base-700)]/35 px-3 py-2.5 text-xs text-[var(--color-base-125)]">
                                                                        No channels visible in this team. Create one with the + button.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </section>
                                        );
                                    })}
                                </motion.div>
                    )}
                </motion.div>
            </div>

            <div className="flex h-[44px] items-center border-t border-[var(--color-base-600)]/40 px-3">
                <p className="truncate text-xs text-[var(--text-muted)]">
                    {selectedWorkspaceName || 'Workspace'}
                </p>
            </div>
        </aside>
    );
};

export default Sidebar;
