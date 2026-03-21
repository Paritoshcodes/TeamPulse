import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, MessageSquare, Plus } from 'lucide-react';

const getInitials = (name = '') => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }
  return (name || 'WS').slice(0, 2).toUpperCase();
};

const getDmDisplay = (dm, currentUser) => {
  const participants = Array.isArray(dm?.dmParticipants) ? dm.dmParticipants : [];
  const other = participants.find((participant) => participant?._id?.toString() !== currentUser?._id?.toString()) || participants[0] || {};
  const name = other?.name || dm?.name || 'Direct Message';
  return {
    name,
    avatar: other?.avatar || other?.profilePicture,
    status: other?.status || 'away',
  };
};

const WorkspaceRail = ({
  workspaces = [],
  activeWorkspaceId,
  unreadCounts = {},
  navMode = 'workspace',
  onNavModeChange,
  directMessages = [],
  selectedDmId,
  onSelectDm,
  onOpenDmFinder,
  pendingConnectionRequests = 0,
  currentUser,
  onSelect,
  onCreateWorkspace,
}) => {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        const workspace = workspaces[index];
        if (workspace?._id) {
          event.preventDefault();
          onSelect?.(workspace._id);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [workspaces, onSelect]);

  return (
    <aside className="flex h-full w-[214px] shrink-0 flex-col gap-2 border-r border-[var(--color-base-600)]/40 bg-[var(--color-base-900)]/92 px-2.5 py-3 backdrop-blur-xl overflow-x-hidden">
      <div className="px-1">
        <div className="rounded-xl border border-[var(--color-base-600)]/45 bg-[var(--color-base-800)]/80 p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => onNavModeChange?.('workspace')}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                navMode === 'workspace'
                  ? 'bg-[var(--color-base-700)] text-[var(--color-base-50)]'
                  : 'text-[var(--color-base-400)] hover:bg-[var(--color-base-700)]/70 hover:text-[var(--color-base-200)]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Workspaces
            </button>
            <button
              type="button"
              onClick={() => onNavModeChange?.('dm')}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                navMode === 'dm'
                  ? 'bg-[var(--color-base-700)] text-[var(--color-base-50)]'
                  : 'text-[var(--color-base-400)] hover:bg-[var(--color-base-700)]/70 hover:text-[var(--color-base-200)]'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              DMs
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-10 items-center justify-between px-2">
        <span className="truncate text-xs font-semibold uppercase tracking-wider text-[var(--color-base-400)]">
          {navMode === 'workspace' ? 'Workspaces' : 'Direct Messages'}
        </span>
      </div>

      <div className="custom-scrollbar flex min-w-0 flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden pr-1">
        {navMode === 'workspace' && workspaces.map((workspace) => {
          const isActive = activeWorkspaceId === workspace._id;
          const unread = unreadCounts?.[workspace._id] || 0;
          const logo = workspace.logoUrl || workspace.avatar;

          return (
            <div key={workspace._id} className="relative min-w-0">
              <motion.button
                type="button"
                onClick={() => onSelect?.(workspace._id)}
                whileTap={{ scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`group relative flex h-11 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-xl border px-2.5 transition-colors ${
                  isActive
                    ? 'border-[var(--color-brand-400)]/55 bg-[var(--color-base-700)] text-[var(--color-base-100)]'
                    : 'border-[var(--color-base-600)]/55 bg-[var(--color-base-800)]/90 text-[var(--color-base-300)] hover:border-[var(--color-base-500)]/70 hover:bg-[var(--color-base-700)]/80 hover:text-[var(--color-base-100)]'
                }`}
                aria-label={`Switch to ${workspace.name || 'workspace'}`}
              >
                {logo ? (
                  <img src={logo} alt={workspace.name} className="h-7 w-7 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--color-base-500)]/60 bg-[var(--color-base-700)] text-[11px] font-bold text-[var(--color-base-100)]">
                    {getInitials(workspace.name)}
                  </span>
                )}

                <span className="truncate text-sm font-medium">{workspace.name || 'Workspace'}</span>

                {unread > 0 && (
                  <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--color-brand-500)] px-1.5 text-[0.65rem] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </motion.button>
            </div>
          );
        })}

        {navMode === 'dm' && directMessages.map((dm) => {
          const dmView = getDmDisplay(dm, currentUser);
          const isActive = selectedDmId === dm._id;
          const unread = dm.unreadCount || unreadCounts?.[dm._id] || 0;

          return (
            <div key={dm._id} className="relative min-w-0">
              <motion.button
                type="button"
                onClick={() => onSelectDm?.(dm)}
                whileTap={{ scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`group relative flex h-11 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-xl border px-2.5 transition-colors ${
                  isActive
                    ? 'border-[var(--color-brand-400)]/55 bg-[var(--color-base-700)] text-[var(--color-base-100)]'
                    : 'border-[var(--color-base-600)]/55 bg-[var(--color-base-800)]/90 text-[var(--color-base-300)] hover:border-[var(--color-base-500)]/70 hover:bg-[var(--color-base-700)]/80 hover:text-[var(--color-base-100)]'
                }`}
                aria-label={`Open DM with ${dmView.name}`}
              >
                {dmView.avatar ? (
                  <img src={dmView.avatar} alt={dmView.name} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-base-500)]/60 bg-[var(--color-base-700)] text-[11px] font-bold text-[var(--color-base-100)]">
                    {getInitials(dmView.name)}
                  </span>
                )}

                <span className="truncate text-sm font-medium">{dmView.name}</span>

                {unread > 0 && (
                  <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--color-brand-500)] px-1.5 text-[0.65rem] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </motion.button>
            </div>
          );
        })}

        {navMode === 'dm' && directMessages.length === 0 && (
          <div className="px-3 py-3 text-xs text-[var(--color-base-500)]">No direct messages yet</div>
        )}
      </div>

      {navMode === 'workspace' && (
        <>
          <div className="my-1 h-px w-full bg-[var(--color-base-600)]/50" />

          <div className="relative">
            <button
              type="button"
              onClick={onCreateWorkspace}
              className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-dashed border-[var(--color-base-500)]/80 px-2.5 text-[var(--color-base-400)] transition-colors hover:border-[var(--color-brand-500)] hover:bg-[var(--color-brand-500)]/10 hover:text-[var(--color-brand-300)]"
              aria-label="Create workspace"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-base-500)]/70">
                <Plus className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">Create Workspace</span>
            </button>
          </div>
        </>
      )}
    </aside>
  );
};

export default WorkspaceRail;