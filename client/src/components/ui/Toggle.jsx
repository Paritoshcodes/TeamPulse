import { motion } from 'framer-motion';

const Toggle = ({ checked, onChange, disabled = false }) => {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`
                relative h-6 w-10 flex-shrink-0 cursor-pointer rounded-full border border-transparent
                transition-colors duration-200 ease-in-out outline-none
                focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background
                ${checked ? 'bg-primary' : 'bg-input'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <motion.span
                aria-hidden="true"
                className={`
                    pointer-events-none absolute left-0.5 top-0.5 inline-block h-5 w-5 rounded-full bg-background shadow-sm
                `}
                animate={{ x: checked ? 16 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
        </button>
    );
};

export default Toggle;
