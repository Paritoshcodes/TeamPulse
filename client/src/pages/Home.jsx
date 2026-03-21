import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">TeamPulse</h1>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground"
          >
            Log out
          </button>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-subtle">
          <p className="mb-2 text-sm text-muted-foreground">Signed in as</p>
          <p className="font-medium text-foreground">{user?.name ?? user?.email ?? 'User'}</p>
          {user?.email && (
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">Role: {user?.role ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}
