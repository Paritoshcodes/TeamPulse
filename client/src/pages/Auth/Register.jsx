import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, Input, Card } from '../../components/ui';
import { Mail, Lock, User, ArrowRight, AtSign, Check, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { checkUsername } from '../../services/authService';

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsernameInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [usernameError, setUsernameError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();

  const debouncedUsername = useDebounce(username, 300);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

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
      setUsernameError('');
      return;
    }

    const validation = validateFormat(debouncedUsername);
    if (!validation.valid) {
      setAvailable(false);
      setUsernameError(validation.error);
      return;
    }

    setChecking(true);
    setUsernameError('');

    checkUsername(debouncedUsername)
      .then((data) => {
        if (data.success) {
          setAvailable(data.available);
          if (!data.available) {
            setUsernameError('Username is already taken');
          }
        }
      })
      .catch((err) => {
        setAvailable(false);
        setUsernameError(err.message || 'Failed to check username');
      })
      .finally(() => {
        setChecking(false);
      });
  }, [debouncedUsername, validateFormat]);

  const getStatusIcon = () => {
    if (!username) return null;
    if (checking) return <Loader2 size={16} className="animate-spin text-muted-foreground" />;
    if (available) return <Check size={16} className="text-emerald-500" strokeWidth={3} />;
    return <X size={16} className="text-red-500" strokeWidth={3} />;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    if (!username) {
      setError('Username is required');
      toast.error('Username is required');
      return;
    }

    if (!available) {
      setError('Please choose an available username');
      toast.error('Please choose an available username');
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password, username);
      toast.success('Account created!');
      setTimeout(() => navigate('/verify-email'), 500);
    } catch (err) {
      const errorMsg = err.message || 'Registration failed';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <motion.div
        className="page-narrow"
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="page-section-gap text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-subtle">
            <User className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h1 className="mb-1 text-3xl font-semibold tracking-tight text-foreground">Create account</h1>
          <p className="text-xs text-muted-foreground">Set up your TeamPulse profile</p>
        </div>

        <Card className="rounded-2xl border border-border bg-card p-8 shadow-subtle">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              icon={User}
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              icon={Mail}
              required
            />

            <div className="relative">
              <Input
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
                placeholder="johndoe"
                icon={AtSign}
                required
                className="pr-12"
              />
              <div className="absolute right-4 top-[42px]">
                {getStatusIcon()}
              </div>
              {usernameError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 pl-1 text-xs font-medium text-destructive"
                >
                  {usernameError}
                </motion.p>
              )}
              {available && !usernameError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex items-center gap-1.5 pl-1 text-xs font-medium text-emerald-500"
                >
                  <Check size={14} strokeWidth={3} />
                  Available!
                </motion.p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create"
                icon={Lock}
                required
                minLength={6}
              />

              <Input
                label="Confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat"
                icon={Lock}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
                <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                <p className="text-xs font-bold leading-none text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={submitting}
              className="w-full mt-6"
              size="lg"
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Already a member?{' '}
              <Link
                to="/login"
                className="font-semibold text-foreground hover:underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

