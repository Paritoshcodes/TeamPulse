import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../../services/authService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, Card } from '../../components/ui';
import { Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    setVerifying(true);
    try {
      await authService.verifyEmail(otp);
      toast.success('Email verified successfully!');
      await refreshUser(); // Update user state to reflect verification
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authService.sendOtp();
      toast.success('Verification code sent!');
    } catch (err) {
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="page-shell">
      <motion.div
        className="page-narrow max-w-md"
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <Card className="rounded-2xl border border-border bg-card p-8 shadow-subtle">
          <div className="mb-8 text-center">
            <motion.div
              className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-subtle"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Mail className="h-8 w-8" strokeWidth={2.5} />
            </motion.div>
            <h2 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
              Verify your email
            </h2>
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code sent to you
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-8">
            <div>
              <label className="mb-2 block text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center font-mono text-2xl font-semibold tracking-[0.4em] text-foreground shadow-inner transition-all placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={verifying}
              className="w-full"
            >
              Verify Email
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {resending ? 'Sending...' : "Didn't receive code? Resend"}
              </button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
