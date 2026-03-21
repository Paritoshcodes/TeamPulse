import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Card } from '../../components/ui';
import { Mail, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import * as authService from '../../services/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authService.requestPasswordReset(email);
      setSent(true);
      toast.success('If an account exists, a reset code was sent');
    } catch (err) {
      toast.error(err.message || 'Failed to send reset code');
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
          <h1 className="mb-1 text-3xl font-semibold tracking-tight text-foreground">Forgot password</h1>
          <p className="text-xs text-muted-foreground">We’ll send you a reset code</p>
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

            {sent && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs font-bold text-emerald-400">Check your email for a 6-digit reset code.</p>
              </div>
            )}

            <Button type="submit" loading={submitting} className="w-full mt-6" size="lg">
              Send Reset Code <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-7 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Have a code?{' '}
              <Link to="/reset-password" className="font-semibold text-foreground hover:underline underline-offset-4">
                Reset now
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
