import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const Spinner = ({ size = 'md', className = '' }) => {
    const sizes = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
    };

    return (
        <div className={`inline-block ${className}`}>
            <Loader2 className={`${sizes[size]} text-accent animate-spin`} />
        </div>
    );
};

export const LoadingScreen = ({ message = 'Loading...' }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-app">
            <Spinner size="xl" className="text-foreground" />
            <motion.p
                className="mt-4 font-medium text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {message}
            </motion.p>
        </div>
    );
};

export default Spinner;
