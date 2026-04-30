import { Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import VerifyEmailDialog from './VerifyEmailDialog.jsx';

/**
 * Renders children only when user is authenticated; otherwise redirects to /login.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading, refreshUser } = useAuth();
  const location = useLocation();
  const [dialogOpen, setDialogOpen] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="glass-panel flex items-center gap-3 rounded-xl border border-border/60 px-4 py-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-main/40 border-t-main" />
          <p className="text-meta">Loading</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user?.isEmailVerified) {
    return (
      <div className="min-h-screen bg-app">
        <VerifyEmailDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onVerified={refreshUser}
          autoSendOnOpen
          allowClose={false}
          showCancel={false}
          message="Enter the verification code we sent to your email to continue."
        />
      </div>
    );
  }

  return children;
}
