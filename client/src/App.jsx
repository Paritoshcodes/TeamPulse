import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Dashboard from './pages/Dashboard.jsx';
import WorkspaceSelector from './pages/WorkspaceSelector.jsx';
import Login from './pages/Auth/Login.jsx';
import Register from './pages/Auth/Register.jsx';
import Callback from './pages/Auth/Callback.jsx';
import VerifyEmail from './pages/Auth/VerifyEmail.jsx';
import ForgotPassword from './pages/Auth/ForgotPassword.jsx';
import ResetPassword from './pages/Auth/ResetPassword.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ToastProvider from './components/ui/ToastProvider.jsx';
import { AnimatePresence, motion } from 'framer-motion';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="h-full"
      >
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<Callback />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/verify-email"
            element={
              <ProtectedRoute>
                <VerifyEmail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspaces"
            element={
              <ProtectedRoute>
                <WorkspaceSelector />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    const setViewportHeight = () => {
      const rawViewportHeight = window.visualViewport?.height || window.innerHeight;
      const availableScreenHeight = window.screen?.availHeight || rawViewportHeight;
      const safeViewportHeight = Math.min(rawViewportHeight, availableScreenHeight);
      const bottomInset = Math.max(0, rawViewportHeight - safeViewportHeight);

      document.documentElement.style.setProperty('--app-vh', `${safeViewportHeight}px`);
      document.documentElement.style.setProperty('--app-bottom-inset', `${bottomInset}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.visualViewport?.addEventListener('resize', setViewportHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.visualViewport?.removeEventListener('resize', setViewportHeight);
    };
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ToastProvider />
        <AnimatedRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
