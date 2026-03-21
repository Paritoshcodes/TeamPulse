/**
 * Auth context – user, loading, login, register, logout, guest, Google redirect. Persists via httpOnly cookie + me().
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const data = await authService.me();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const appearance = user?.settings?.appearance;
    const root = document.documentElement;
    const preferred = appearance?.theme || 'dark';
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolved = preferred === 'system'
        ? (media.matches ? 'dark' : 'light')
        : preferred;
      root.dataset.theme = resolved;
    };

    applyTheme();
    const handleChange = () => {
      if (preferred === 'system') applyTheme();
    };
    media.addEventListener?.('change', handleChange);

    const parseFontScale = (value) => {
      const raw = String(value ?? '').trim().replace('%', '');
      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) return 100;
      const allowed = [90, 100, 115, 125];
      return allowed.includes(numeric) ? numeric : 100;
    };

    const fontScale = parseFontScale(appearance?.fontScale);
    root.style.removeProperty('font-size');
    root.setAttribute('data-font-scale', String(fontScale));

    return () => {
      media.removeEventListener?.('change', handleChange);
    };
  }, [user?.settings?.appearance]);

  const login = useCallback(async (email, password) => {
    const data = await authService.login({ email, password });
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (name, email, password, username) => {
    const data = await authService.register({ name, email, password, username });
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const loginAsGuest = useCallback(async () => {
    const data = await authService.guest();
    setUser(data.user);
    return data;
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = authService.getGoogleLoginUrl();
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    loginAsGuest,
    loginWithGoogle,
    refreshUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
