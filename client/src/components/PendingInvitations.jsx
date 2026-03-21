import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as invitationService from '../services/invitationService.js';
import { Button, Card } from './ui';
import { Mail, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function PendingInvitations({ onAccept }) {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.email) {
      fetchInvitations();
    }
  }, [user?.email]);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const data = await invitationService.getPendingInvitations();
      // data.invitations should be an array
      setInvitations(data.invitations || []);
    } catch (err) {
      // Silent error or toast?
      console.error('Failed to load invitations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId) => {
    try {
      await invitationService.acceptInvitation(invitationId);
      setInvitations((prev) => prev.filter((inv) => inv._id !== invitationId));
      toast.success('Invitation accepted!');
      onAccept?.();
    } catch (err) {
      toast.error(`Failed to accept: ${err.message}`);
    }
  };

  const handleDecline = async (invitationId) => {
    try {
      await invitationService.declineInvitation(invitationId);
      setInvitations((prev) => prev.filter((inv) => inv._id !== invitationId));
      toast.success('Invitation declined');
    } catch (err) {
      toast.error(`Failed to decline: ${err.message}`);
    }
  };

  if (loading) return null;
  if (!invitations || invitations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4"
    >
      <div className="rounded-2xl border border-border bg-card p-4 shadow-subtle">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary/30 text-foreground">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight text-foreground">Pending Invitations</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">You have {invitations.length} new requests</p>
          </div>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {invitations.map((inv) => (
              <motion.div
                key={inv._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="group rounded-xl border border-border bg-secondary/10 p-3"
              >
                <div className="mb-3">
                  <p className="mb-1 text-[11px] font-medium text-muted-foreground">New invitation</p>
                  <p className="truncate text-sm font-semibold text-foreground">{inv.workspace?.name || 'Workspace'}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    from <span className="font-semibold text-foreground/90">{inv.inviterId?.name || 'Someone'}</span>
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAccept(inv._id)}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-3"
                    onClick={() => handleDecline(inv._id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
