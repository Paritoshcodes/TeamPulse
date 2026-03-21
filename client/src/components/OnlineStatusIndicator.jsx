import { useOnlineStatus } from '../context/OnlineStatusContext.jsx';

export default function OnlineStatusIndicator({ userId, showStatusText = false, className = '' }) {
    const { isUserOnline } = useOnlineStatus();
    const online = isUserOnline(userId);

    return (
        <div className={`flex items-center gap-1.5 ${className}`}>
            <div className={`h-2.5 w-2.5 rounded-full ring-1 ring-[var(--color-base-900)]/35 ${online ? 'bg-[var(--status-online)] shadow-[0_0_8px_rgba(34,197,94,0.35)]' : 'bg-[var(--color-base-500)]'}`} />
            {showStatusText && (
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-base-400)]">{online ? 'Online' : 'Offline'}</span>
            )}
        </div>
    );
}
