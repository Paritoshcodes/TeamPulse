import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import React from 'react';

const Button = React.forwardRef(({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    type = 'button',
    icon: Icon,
    ...props
}, ref) => {
    const variants = {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-subtle',
        secondary: 'border border-border bg-secondary/50 text-secondary-foreground hover:bg-secondary/80',
        ghost: 'bg-transparent text-foreground hover:bg-accent/20 hover:text-accent-foreground',
        outline: 'border border-input bg-background text-foreground hover:bg-accent/15 hover:text-accent-foreground',
        danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-subtle',
    };

    const sizes = {
        sm: 'h-8 px-3 text-xs rounded-lg',
        md: 'h-10 px-4 text-sm rounded-lg',
        lg: 'h-11 px-6 text-sm rounded-lg',
        icon: 'h-9 w-9 p-0 rounded-lg',
    };

    return (
        <motion.button
            ref={ref}
            type={type}
            className={`
                inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold
                ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
                ${variants[variant]} 
                ${sizes[size]} 
                ${className}
            `}
            whileHover={!disabled && !loading ? { scale: 1.01 } : {}}
            whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <>
                    {Icon && <Icon className={`${children ? 'mr-2' : ''} h-4 w-4`} strokeWidth={2.5} />}
                    {children}
                </>
            )}
        </motion.button>
    );
});

Button.displayName = "Button";

export default Button;

