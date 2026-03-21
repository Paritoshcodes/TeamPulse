import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../../components/ui';
import { Mail, Lock, KeyRound, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import * as authService from '../../services/authService';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await authService.resetPassword({ email, otp, password });
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
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
            <KeyRound className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h1 className="mb-1 text-3xl font-semibold tracking-tight text-foreground">Set new password</h1>
          <p className="text-xs text-muted-foreground">Enter email, code and new password</p>
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

            <Input
              label="Reset Code"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              icon={KeyRound}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="New Password"
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

            <Button type="submit" loading={submitting} className="w-full mt-6" size="lg">
              Reset Password <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-7 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Need a code?{' '}
              <Link to="/forgot-password" className="font-semibold text-foreground hover:underline underline-offset-4">
                Send reset email
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
