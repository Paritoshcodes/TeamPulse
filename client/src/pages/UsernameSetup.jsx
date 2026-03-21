import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2, AtSign } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { checkUsername, setUsername } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Debounce hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default function UsernameSetup({ onComplete }) {
    const { refreshUser } = useAuth();
    const [username, setUsernameInput] = useState('');
    const [checking, setChecking] = useState(false);
    const [available, setAvailable] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const debouncedUsername = useDebounce(username, 300);

    // Validate username format
    const validateFormat = useCallback((value) => {
        if (!value) return { valid: false, error: '' };
        if (value.length < 3) return { valid: false, error: 'Username must be at least 3 characters' };
        if (value.length > 20) return { valid: false, error: 'Username must be at most 20 characters' };
        if (!/^[a-z0-9_]+$/.test(value)) {
            return { valid: false, error: 'Only lowercase letters, numbers, and underscores allowed' };
        }
        return { valid: true, error: '' };
    }, []);

    // Check availability when debounced value changes
    useEffect(() => {
        if (!debouncedUsername) {
            setAvailable(null);
            setError('');
            return;
        }

        const validation = validateFormat(debouncedUsername);
        if (!validation.valid) {
            setAvailable(false);
            setError(validation.error);
            return;
        }

        setChecking(true);
        setError('');

        checkUsername(debouncedUsername)
            .then((data) => {
                if (data.success) {
                    setAvailable(data.available);
                    if (!data.available) {
                        setError('Username is already taken');
                    }
                }
            })
            .catch((err) => {
                setAvailable(false);
                setError(err.message || 'Failed to check username');
            })
            .finally(() => {
                setChecking(false);
            });
    }, [debouncedUsername, validateFormat]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validation = validateFormat(username);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        if (!available) {
            setError('Please choose an available username');
            return;
        }

        setSubmitting(true);
        try {
            const data = await setUsername(username);
            if (data.success) {
                toast.success('Username set successfully!');
                await refreshUser();
                if (onComplete) onComplete();
            }
        } catch (err) {
            toast.error(err.message || 'Failed to set username');
            setError(err.message || 'Failed to set username');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusIcon = () => {
        if (!username) return null;
        if (checking) return <Loader2 size={18} className="animate-spin text-muted-foreground" />;
        if (available) return <Check size={18} className="text-emerald-500" strokeWidth={3} />;
        return <X size={18} className="text-red-500" strokeWidth={3} />;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--surface-overlay)]/85 p-6 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md rounded-[2rem] border border-border bg-card p-9 shadow-lg"
            >
                <div className="text-center mb-8">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                        <AtSign size={28} strokeWidth={2.5} />
                    </div>
                    <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">Choose Your Username</h1>
                    <p className="text-sm font-medium text-muted-foreground">
                        This will be your unique identifier on TeamPulse
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <Input
                            label="Username"
                            value={username}
                            onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
                            placeholder="johndoe"
                            autoFocus
                            disabled={submitting}
                            className="pr-12"
                        />
                        <div className="absolute right-4 top-[42px]">
                            {getStatusIcon()}
                        </div>
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm font-medium text-destructive"
                        >
                            {error}
                        </motion.p>
                    )}

                    {available && !error && (
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 text-sm font-medium text-emerald-500"
                        >
                            <Check size={16} strokeWidth={3} />
                            Username is available!
                        </motion.p>
                    )}

                    <div className="space-y-3 pt-4">
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={!available || submitting || checking}
                            loading={submitting}
                        >
                            Continue
                        </Button>
                        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            You can't change this later
                        </p>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
