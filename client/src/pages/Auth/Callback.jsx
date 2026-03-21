import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Google OAuth callback – backend redirected here with cookie set. Refresh user then redirect home.
 */
export default function Callback() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && !user) {
      const t = setTimeout(() => navigate('/login', { replace: true }), 2000);
      return () => clearTimeout(t);
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-app">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
        <p className="animate-pulse text-[11px] font-black uppercase tracking-widest text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
