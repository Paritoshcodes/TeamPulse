import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, Input, Card } from '../../components/ui';
import { Mail, Lock, ArrowRight, Github } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, login, loginWithGoogle, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
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
            <Mail className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h1 className="mb-1 text-3xl font-semibold tracking-tight text-foreground">TeamPulse</h1>
          <p className="text-xs text-muted-foreground">Sign in to continue</p>
        </div>

        <Card className="rounded-2xl border border-border bg-card p-8 shadow-subtle">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              icon={Mail}
              required
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                <Link to="/forgot-password" size="sm" className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Forgot?
                </Link>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={Lock}
                required
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
              Sign in <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span className="bg-card px-4">Social Login</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="ghost"
              onClick={loginWithGoogle}
              className="h-12"
            >
              <Github className="mr-2 h-4 w-4" />
              Google
            </Button>
            <Button
              variant="ghost"
              onClick={loginAsGuest}
              className="h-12"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Guest
            </Button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              New here?{' '}
              <Link
                to="/register"
                className="font-semibold text-foreground hover:underline underline-offset-4"
              >
                Create an account
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

