import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import * as authService from '../../services/authService.js';
import toast from 'react-hot-toast';

const SLIDE_EASE = [0.76, 0, 0.24, 1];
const SLIDE_DURATION = 0.7;

const featureVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const featureItemVariants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth < 768
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

function strengthScore(password) {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  if (password.length >= 12) score += 1;
  return score;
}

function BrandContent({ mode, onToggle }) {
  const isLogin = mode === 'login';
  const features = isLogin
    ? [
        { icon: Zap, text: 'Real-time collaboration' },
        { icon: Users, text: 'Workspace and channel management' },
        { icon: Bell, text: 'Smart notifications and reminders' },
      ]
    : [
        { icon: Users, text: 'Workspace and channel management' },
        { icon: Zap, text: 'Real-time collaboration' },
        { icon: Bell, text: 'Smart notifications and reminders' },
      ];

  return (
    <div
      style={{
        padding: 'clamp(40px, 6vw, 80px)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '32px',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            color: '#ffffff',
          }}
        >
          TeamPulse
        </div>
        <div
          style={{
            width: 32,
            height: 2,
            background: 'rgba(59,130,246,0.8)',
            marginTop: 12,
          }}
        />
      </div>

      <div
        style={{
          fontSize: '1.1rem',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.6,
          whiteSpace: 'pre-line',
        }}
      >
        {isLogin ? 'Your team.\nIn sync. Always.' : 'Built for teams\nthat move fast.'}
      </div>

      <motion.div variants={featureVariants} initial="hidden" animate="show" style={{ display: 'grid', gap: 16 }}>
        {features.map((item) => (
          <motion.div
            key={item.text}
            variants={featureItemVariants}
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}
          >
            <item.icon size={14} color="rgba(59,130,246,0.9)" />
            {item.text}
          </motion.div>
        ))}
      </motion.div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)' }}>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
        </div>
        <button
          type="button"
          onClick={onToggle}
          style={{
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: '#ffffff',
            borderRadius: 8,
            padding: '10px 32px',
            fontWeight: 500,
            fontSize: '0.875rem',
            transition: 'all 0.2s ease',
            width: 'fit-content',
          }}
        >
          {isLogin ? 'Sign up' : 'Log in'}
        </button>
      </div>
    </div>
  );
}

function Field({ id, label, type, value, onChange, placeholder, error, rightSlot, autoComplete }) {
  const describedBy = error ? `${id}-error` : undefined;
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          marginBottom: 6,
          fontSize: '0.75rem',
          fontWeight: 500,
          letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.45)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          className="auth-input"
          style={{
            width: '100%',
            height: 44,
            borderRadius: 10,
            padding: rightSlot ? '0 40px 0 14px' : '0 14px',
            border: error ? '1px solid rgba(239,68,68,0.7)' : '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: 'white',
            fontSize: '0.9rem',
            transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
          }}
        />
        {rightSlot && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>{rightSlot}</div>
        )}
      </div>
      {error && (
        <div id={`${id}-error`} style={{ marginTop: 6, fontSize: '0.75rem', color: 'rgba(239,68,68,0.9)' }}>
          {error}
        </div>
      )}
    </div>
  );
}

function PasswordField({ id, label, value, onChange, placeholder, show, onToggle, rightSlot }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          marginBottom: 6,
          fontSize: '0.75rem',
          fontWeight: 500,
          letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.45)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="current-password"
          className="auth-input"
          style={{
            width: '100%',
            height: 44,
            borderRadius: 10,
            padding: '0 64px 0 14px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: 'white',
            fontSize: '0.9rem',
            transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
          }}
        />
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {rightSlot}
          <button
            type="button"
            aria-label={show ? 'Hide password' : 'Show password'}
            onClick={onToggle}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer',
            }}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const { user, loading, login, register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const isMobile = useIsMobile();

  const [mode, setMode] = useState(() => (location.pathname === '/register' ? 'register' : 'login'));
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('idle');

  const debouncedUsername = useDebounce(registerForm.username, 300);
  const strength = useMemo(() => strengthScore(registerForm.password), [registerForm.password]);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    setMode(location.pathname === '/register' ? 'register' : 'login');
  }, [location.pathname]);

  useEffect(() => {
    const path = mode === 'login' ? '/login' : '/register';
    window.history.replaceState(null, '', path);
  }, [mode]);

  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 2) {
      setUsernameStatus('idle');
      return;
    }

    const valid = /^[a-z0-9_]+$/.test(debouncedUsername);
    if (!valid) {
      setUsernameStatus('taken');
      return;
    }

    setUsernameStatus('checking');
    authService
      .checkUsername(debouncedUsername)
      .then((res) => {
        setUsernameStatus(res.available ? 'available' : 'taken');
      })
      .catch(() => {
        setUsernameStatus('idle');
      });
  }, [debouncedUsername]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      setLoginError('Email and password are required');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      await login(loginForm.email, loginForm.password);
      navigate('/');
    } catch (err) {
      setLoginError(err?.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    const { name, email, password, confirmPassword, username } = registerForm;
    if (!name || !email || !password || !username) {
      setRegisterError('All fields are required');
      return;
    }
    if (password !== confirmPassword) {
      setRegisterError('Passwords do not match');
      return;
    }
    if (usernameStatus === 'taken') {
      setRegisterError('Username is already taken');
      return;
    }
    setRegisterLoading(true);
    setRegisterError('');
    try {
      await register(name, email, password, username);
    } catch (err) {
      setRegisterError(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const formPanelStyle = {
    position: isMobile ? 'relative' : 'absolute',
    top: 0,
    left: isMobile ? 0 : mode === 'login' ? '0%' : '50%',
    width: isMobile ? '100%' : '50%',
    height: '100%',
    background: 'var(--card, #14161f)',
    borderLeft: !isMobile && mode === 'register' ? '1px solid rgba(255,255,255,0.08)' : 'none',
    borderRight: !isMobile && mode === 'login' ? '1px solid rgba(255,255,255,0.08)' : 'none',
    boxShadow: 'inset 0 0 60px rgba(0,0,0,0.2)',
  };

  const brandPanelStyle = {
    backgroundColor: '#0f1117',
    backgroundImage:
      'radial-gradient(ellipse 600px 400px at top right, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
  };

  const overlayTransition = prefersReduced || isMobile
    ? { duration: 0 }
    : { duration: SLIDE_DURATION, ease: SLIDE_EASE };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0f1117' }}>
      <style>{`
        .auth-input:focus {
          background: rgba(255,255,255,0.07);
          border-color: rgba(59,130,246,0.6);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
          outline: none;
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.25); }
        .auth-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0px 1000px #1a1d2e inset;
          -webkit-text-fill-color: white;
        }
      `}</style>

      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <div style={{ width: '50%', ...brandPanelStyle, position: 'relative' }}>
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="grid-left" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-left)" />
            </svg>
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="brand-left"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: prefersReduced ? 0 : 0.3, ease: 'easeOut' }}
                >
                  <BrandContent mode="register" onToggle={() => setMode('login')} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div style={{ width: '50%', ...brandPanelStyle, position: 'relative' }}>
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="grid-right" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-right)" />
            </svg>
            <AnimatePresence mode="wait">
              {mode === 'login' && (
                <motion.div
                  key="brand-right"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: prefersReduced ? 0 : 0.3, ease: 'easeOut' }}
                >
                  <BrandContent mode="login" onToggle={() => setMode('register')} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {isMobile && (
          <div style={{ position: 'relative', background: '#0f1117', padding: 24 }}>
            <div style={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 700 }}>TeamPulse</div>
            <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem' }}>
              {mode === 'login' ? 'Your team. In sync. Always.' : 'Built for teams that move fast.'}
            </p>
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              style={{
                marginTop: 16,
                color: 'rgba(255,255,255,0.8)',
                background: 'transparent',
                border: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {mode === 'login' ? 'Need an account? Sign up' : 'Already a member? Log in'}
            </button>
          </div>
        )}

        <motion.div
          style={formPanelStyle}
          animate={isMobile ? undefined : { left: mode === 'login' ? '0%' : '50%' }}
          transition={overlayTransition}
        >
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: mode === 'login' ? 'center' : 'flex-start',
              padding: 'clamp(32px, 5vw, 64px) clamp(24px, 4vw, 56px)',
              overflowY: mode === 'register' ? 'auto' : 'hidden',
              scrollbarWidth: 'none',
            }}
          >
            <style>{`
              .form-scroll::-webkit-scrollbar { display: none; }
            `}</style>
            <div className="form-scroll" style={{ maxHeight: '100%' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: prefersReduced ? 0 : 0.25, ease: 'easeOut', delay: prefersReduced ? 0 : 0.15 }}
                >
                  {mode === 'login' ? (
                    <div>
                      <div style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'white' }}>
                        Welcome back
                      </div>
                      <div style={{ marginTop: 8, fontSize: '0.9rem', color: 'rgba(255,255,255,0.45)' }}>
                        Sign in to your workspace
                      </div>

                      <button
                        type="button"
                        title="Coming soon"
                        style={{
                          width: '100%',
                          height: 44,
                          marginTop: 20,
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          color: 'rgba(255,255,255,0.85)',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          opacity: 0.55,
                          cursor: 'not-allowed',
                          pointerEvents: 'none',
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                          <path fill="#EA4335" d="M9 7.36v3.48h4.83c-.2 1.12-.84 2.07-1.79 2.71v2.24h2.9c1.7-1.56 2.68-3.86 2.68-6.57 0-.61-.05-1.05-.16-1.5H9z" />
                          <path fill="#34A853" d="M4.3 10.68c-.24-.73-.24-1.52 0-2.25V6.19H1.32a9 9 0 0 0 0 8.12l2.98-2.63z" />
                          <path fill="#FBBC05" d="M9 3.58c1.33 0 2.52.46 3.46 1.36l2.6-2.6C13.5.89 11.43 0 9 0 5.48 0 2.44 2.02 1.32 4.94l2.98 2.63C5.05 5.01 6.89 3.58 9 3.58z" />
                          <path fill="#4285F4" d="M9 18c2.43 0 4.46-.8 5.95-2.17l-2.9-2.24c-.8.54-1.82.87-3.05.87-2.11 0-3.95-1.43-4.7-3.39L1.32 14.7C2.44 16.98 5.48 18 9 18z" />
                        </svg>
                        Continue with Google
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0 20px' }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <span style={{ padding: '0 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>or</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                      </div>

                      <form onSubmit={handleLogin}>
                        <Field
                          id="login-email"
                          label="Email address"
                          type="email"
                          value={loginForm.email}
                          onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                          placeholder="name@company.com"
                          autoComplete="email"
                        />

                        {loginError && (
                          <div
                            style={{
                              marginTop: -8,
                              marginBottom: 16,
                              background: 'rgba(239,68,68,0.08)',
                              border: '1px solid rgba(239,68,68,0.25)',
                              borderRadius: 8,
                              padding: '10px 12px',
                              fontSize: '0.8125rem',
                              color: 'rgba(239,68,68,0.9)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <AlertCircle size={14} color="rgba(239,68,68,0.9)" />
                            {loginError}
                          </div>
                        )}

                        <PasswordField
                          id="login-password"
                          label="Password"
                          value={loginForm.password}
                          onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                          placeholder="Enter your password"
                          show={showPass}
                          onToggle={() => setShowPass((prev) => !prev)}
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
                          <button
                            type="button"
                            onClick={() => navigate('/forgot-password')}
                            style={{
                              fontSize: '0.8rem',
                              color: 'rgba(59,130,246,0.8)',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            Forgot password?
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={loginLoading}
                          style={{
                            width: '100%',
                            height: 44,
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            color: 'white',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                          }}
                        >
                          {loginLoading ? <Loader2 size={16} className="animate-spin" /> : (<>
                            Sign in <ArrowRight size={16} />
                          </>)}
                        </button>
                      </form>

                      <div
                        style={{
                          marginTop: 16,
                          fontSize: '0.8125rem',
                          color: 'rgba(255,255,255,0.3)',
                          textAlign: 'center',
                          opacity: 0.45,
                          cursor: 'not-allowed',
                          pointerEvents: 'none',
                        }}
                      >
                        Continue as guest -&gt;
                      </div>

                      <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)' }}>
                        New to TeamPulse?{' '}
                        <button
                          type="button"
                          onClick={() => setMode('register')}
                          style={{ color: 'rgba(59,130,246,0.9)', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                          Sign up
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'white' }}>
                        Create your account
                      </div>
                      <div style={{ marginTop: 8, fontSize: '0.9rem', color: 'rgba(255,255,255,0.45)' }}>
                        Start collaborating
                      </div>

                      <button
                        type="button"
                        title="Coming soon"
                        style={{
                          width: '100%',
                          height: 44,
                          marginTop: 20,
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          color: 'rgba(255,255,255,0.85)',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          opacity: 0.55,
                          cursor: 'not-allowed',
                          pointerEvents: 'none',
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                          <path fill="#EA4335" d="M9 7.36v3.48h4.83c-.2 1.12-.84 2.07-1.79 2.71v2.24h2.9c1.7-1.56 2.68-3.86 2.68-6.57 0-.61-.05-1.05-.16-1.5H9z" />
                          <path fill="#34A853" d="M4.3 10.68c-.24-.73-.24-1.52 0-2.25V6.19H1.32a9 9 0 0 0 0 8.12l2.98-2.63z" />
                          <path fill="#FBBC05" d="M9 3.58c1.33 0 2.52.46 3.46 1.36l2.6-2.6C13.5.89 11.43 0 9 0 5.48 0 2.44 2.02 1.32 4.94l2.98 2.63C5.05 5.01 6.89 3.58 9 3.58z" />
                          <path fill="#4285F4" d="M9 18c2.43 0 4.46-.8 5.95-2.17l-2.9-2.24c-.8.54-1.82.87-3.05.87-2.11 0-3.95-1.43-4.7-3.39L1.32 14.7C2.44 16.98 5.48 18 9 18z" />
                        </svg>
                        Continue with Google
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0 20px' }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <span style={{ padding: '0 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>or</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                      </div>

                      <form onSubmit={handleRegister}>
                        <Field
                          id="register-name"
                          label="Full name"
                          type="text"
                          value={registerForm.name}
                          onChange={(event) => setRegisterForm((prev) => ({ ...prev, name: event.target.value }))}
                          placeholder="Jane Doe"
                          autoComplete="name"
                        />
                        <Field
                          id="register-email"
                          label="Email address"
                          type="email"
                          value={registerForm.email}
                          onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                          placeholder="name@company.com"
                          autoComplete="email"
                        />
                        <PasswordField
                          id="register-password"
                          label="Password"
                          value={registerForm.password}
                          onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                          placeholder="Create a password"
                          show={showPass}
                          onToggle={() => setShowPass((prev) => !prev)}
                        />
                        <div style={{ display: 'flex', gap: 4, marginTop: 8, height: 3, marginBottom: 8 }}>
                          {[1, 2, 3, 4].map((idx) => {
                            const active = idx <= strength;
                            const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
                            return (
                              <div
                                key={idx}
                                style={{
                                  flex: 1,
                                  borderRadius: 99,
                                  background: active ? colors[strength - 1] : 'rgba(255,255,255,0.1)',
                                  transition: 'background 0.3s ease',
                                }}
                              />
                            );
                          })}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
                          {['', 'Weak', 'Fair', 'Good', 'Strong'][strength]}
                        </div>
                        <PasswordField
                          id="register-confirm"
                          label="Confirm password"
                          value={registerForm.confirmPassword}
                          onChange={(event) => setRegisterForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                          placeholder="Repeat password"
                          show={showConfirmPass}
                          onToggle={() => setShowConfirmPass((prev) => !prev)}
                          rightSlot={
                            registerForm.confirmPassword ? (
                              registerForm.password === registerForm.confirmPassword ? (
                                <CheckCircle2 size={14} color="#22c55e" />
                              ) : (
                                <XCircle size={14} color="rgba(239,68,68,0.8)" />
                              )
                            ) : null
                          }
                        />
                        <Field
                          id="register-username"
                          label="Username"
                          type="text"
                          value={registerForm.username}
                          onChange={(event) =>
                            setRegisterForm((prev) => ({ ...prev, username: event.target.value.toLowerCase() }))
                          }
                          placeholder="your_handle"
                          autoComplete="username"
                          rightSlot={
                            usernameStatus === 'checking' ? (
                              <Loader2 size={13} color="rgba(255,255,255,0.4)" className="animate-spin" />
                            ) : usernameStatus === 'available' ? (
                              <CheckCircle2 size={13} color="#22c55e" />
                            ) : usernameStatus === 'taken' ? (
                              <XCircle size={13} color="rgba(239,68,68,0.8)" />
                            ) : null
                          }
                          error={registerError}
                        />
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: -6, marginBottom: 12 }}>
                          Lowercase letters, numbers, and underscores only
                        </div>

                        {registerError && (
                          <div
                            style={{
                              marginBottom: 16,
                              background: 'rgba(239,68,68,0.08)',
                              border: '1px solid rgba(239,68,68,0.25)',
                              borderRadius: 8,
                              padding: '10px 12px',
                              fontSize: '0.8125rem',
                              color: 'rgba(239,68,68,0.9)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <AlertCircle size={14} color="rgba(239,68,68,0.9)" />
                            {registerError}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={registerLoading}
                          style={{
                            width: '100%',
                            height: 44,
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            color: 'white',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                          }}
                        >
                          {registerLoading ? <Loader2 size={16} className="animate-spin" /> : (<>
                            Create account <ArrowRight size={16} />
                          </>)}
                        </button>
                      </form>

                      <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)' }}>
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => setMode('login')}
                          style={{ color: 'rgba(59,130,246,0.9)', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                          Log in
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
