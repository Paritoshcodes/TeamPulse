import { motion } from 'framer-motion';

const Badge = ({
    children,
    variant = 'default',
    size = 'md',
    className = '',
}) => {
    const variants = {
        default: 'border border-transparent bg-secondary text-secondary-foreground',
        primary: 'border border-primary/20 bg-primary/10 text-primary',
        success: 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
        outline: 'border border-border bg-transparent text-foreground',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        md: 'px-2.5 py-1 text-xs font-semibold',
        lg: 'px-3 py-1.5 text-sm font-semibold',
    };

    return (
        <motion.span
            className={`
                inline-flex items-center justify-center rounded-full
                ${variants[variant] || variants.default} 
                ${sizes[size]} 
                ${className}
            `}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
            {children}
        </motion.span>
    );
};

export default Badge;

