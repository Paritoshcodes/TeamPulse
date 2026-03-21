import { motion } from 'framer-motion';

const Avatar = ({
    name,
    src,
    size = 'md',
    showStatus = false,
    status = 'offline',
    className = '',
}) => {
    const sizes = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
    };

    const statusSizes = {
        sm: 'h-2 w-2',
        md: 'h-2.5 w-2.5',
        lg: 'h-3 w-3',
        xl: 'h-4 w-4',
    };

    const statusClasses = {
        online: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.35)]',
        available: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.35)]',
        busy: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.35)]',
        away: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.35)]',
        offline: 'bg-muted-foreground',
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className={`relative inline-block ${className}`}>
            <motion.div
                className={`
          ${sizes[size]}
                                        rounded-full overflow-hidden
          flex items-center justify-center
                                        bg-secondary/40 text-foreground font-semibold
          border border-border
        `}
            >
                {src ? (
                    <img src={src} alt={name} className="w-full h-full object-cover" />
                ) : (
                    <span>{getInitials(name)}</span>
                )}
            </motion.div>

            {showStatus && (
                <span
                    className={`
                absolute -bottom-0.5 -right-0.5
            ${statusSizes[size]}
                    rounded-full ring-2 ring-background
                    ${statusClasses[status] || statusClasses.offline}
          `}
                />
            )}
        </div>
    );
};

export default Avatar;
