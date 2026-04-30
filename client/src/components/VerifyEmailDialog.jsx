import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input } from './ui';
import * as authService from '../services/authService.js';
import toast from 'react-hot-toast';

export default function VerifyEmailDialog({
  isOpen,
  onClose,
  onVerified,
  autoSendOnOpen = false,
  allowClose = true,
  showCancel = true,
  message = 'Enter the verification code we sent to your email.',
}) {
  const [otpValue, setOtpValue] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setOtpValue('');
      setSendingOtp(false);
      setVerifying(false);
      autoSentRef.current = false;
      return;
    }

    if (!autoSendOnOpen || autoSentRef.current) return;

    autoSentRef.current = true;
    setSendingOtp(true);
    authService
      .sendOtp()
      .then(() => {
        toast.success('Verification code sent');
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to send code');
        autoSentRef.current = false;
      })
      .finally(() => {
        setSendingOtp(false);
      });
  }, [isOpen, autoSendOnOpen]);

  const handleVerify = async () => {
    if (!otpValue.trim()) {
      toast.error('Enter the verification code');
      return;
    }
    setVerifying(true);
    try {
      await authService.verifyEmail(otpValue.trim());
      toast.success('Email verified');
      await onVerified?.();
      if (allowClose) onClose?.();
      setOtpValue('');
    } catch (err) {
      toast.error(err.message || 'Failed to verify email');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setSendingOtp(true);
    try {
      await authService.sendOtp();
      toast.success('Verification code sent');
    } catch (err) {
      toast.error(err.message || 'Failed to send code');
    } finally {
      setSendingOtp(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={allowClose ? onClose : undefined}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-6"
          >
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-2xl shadow-black/40">
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">Verify email</h3>
              <p className="mb-6 text-sm font-medium leading-relaxed text-muted-foreground">{message}</p>
              <div className="mb-6">
                <Input
                  label="Verification code"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value)}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleResend}
                  className="mt-2 text-xs font-semibold text-primary hover:text-primary/80"
                  disabled={sendingOtp}
                >
                  {sendingOtp ? 'Sending code...' : 'Resend code'}
                </button>
              </div>
              <div className="flex gap-3">
                {showCancel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="flex-1"
                    disabled={verifying}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleVerify}
                  className="flex-1"
                  loading={verifying}
                  disabled={verifying}
                >
                  Verify
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
