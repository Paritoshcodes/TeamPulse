import { motion } from 'framer-motion';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = ({
    label,
    type = 'text',
    error,
    icon: Icon,
    className = '',
    onChange,
    value,
    id,
    placeholder,
    ...props
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const togglePassword = () => setShowPassword(!showPassword);

    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none">
                    {Icon && <Icon className="h-4 w-4" strokeWidth={2.2} />}
                </div>

                <input
                    id={id}
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`
                        flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm
                        text-foreground placeholder:text-muted-foreground
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background
                        transition-all duration-200
                        ${Icon ? 'pl-10' : ''}
                        ${type === 'password' ? 'pr-11' : ''}
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${className}
                    `}
                    {...props}
                />

                {type === 'password' && (
                    <button
                        type="button"
                        onClick={togglePassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" strokeWidth={2} />
                        ) : (
                            <Eye className="h-4 w-4" strokeWidth={2} />
                        )}
                    </button>
                )}
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 flex items-center text-xs font-medium text-destructive pl-1"
                >
                    <div className="w-1 h-1 rounded-full bg-destructive mr-2" />
                    {error}
                </motion.div>
            )}
        </div>
    );
};

export default Input;

