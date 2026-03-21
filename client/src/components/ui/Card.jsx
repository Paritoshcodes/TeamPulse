import { motion } from 'framer-motion';

const Card = ({
    children,
    glass = false,
    hover = false,
    className = '',
    onClick,
    animate = true,
    ...props
}) => {
    return (
        <motion.div
            initial={animate ? { opacity: 0, y: 10 } : false}
            animate={animate ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`
                ${glass ? 'glass-card' : 'rounded-2xl border border-border bg-card text-card-foreground shadow-subtle'}
                ${hover ? 'hover:border-accent/60 hover:bg-accent/10 hover:shadow-sm active:scale-[0.998]' : ''}
                ${onClick ? 'cursor-pointer' : ''}
                ${className}
            `}
            onClick={onClick}
            {...props}
        >
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </motion.div>
    );
};

export default Card;

