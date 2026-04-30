/**
 * Express app: CORS, JSON, rate limit, routes, error handler
 */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { sendOtp } from './controllers/auth.controller.js';
import { isConnected } from './config/db.js';
import './config/passport.js';
import authRoutes from './routes/auth.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';
import teamRoutes from './routes/team.routes.js';
import channelRoutes from './routes/channel.routes.js';
import messageRoutes from './routes/message.routes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import notificationRoutes from './routes/notification.routes.js';
import userRoutes from './routes/user.routes.js';
import usernameRoutes from './routes/username.routes.js';
import dmRoutes from './routes/dm.routes.js';
import connectionRoutes from './routes/connection.routes.js';
import workspaceManagementRoutes from './routes/workspace.management.routes.js';
import teamManagementRoutes from './routes/team.management.routes.js';
import channelManagementRoutes from './routes/channel.management.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import searchRoutes from './routes/search.routes.js';
import reminderRoutes from './routes/reminder.routes.js';
import uploadRoutes from './routes/upload.routes.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isPrivateNetworkOrigin(origin) {
  try {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;

    const host = parsed.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.startsWith('10.')) return true;
    if (host.startsWith('192.168.')) return true;

    if (host.startsWith('172.')) {
      const parts = host.split('.');
      const secondOctet = Number(parts[1]);
      if (!Number.isNaN(secondOctet) && secondOctet >= 16 && secondOctet <= 31) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function parseAllowedOrigins() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const defaults = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ].filter(Boolean);

  return Array.from(new Set([...defaults, ...fromEnv]));
}

const allowedOrigins = parseAllowedOrigins();

// Trust proxy for rate limit behind reverse proxy
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests' },
});
app.use(limiter);

// CORS – allow client origin and credentials
app.use(
  cors({
    origin: (origin, callback) => {
      const isDevLanAllowed = process.env.NODE_ENV !== 'production' && origin && isPrivateNetworkOrigin(origin);
      if (!origin || allowedOrigins.includes(origin) || isDevLanAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(passport.initialize());

// Health check (no DB)
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Health check with MongoDB status (for readiness)
app.get('/api/health', (req, res) => {
  const db = isConnected();
  const status = db ? 200 : 503;
  res.status(status).json({
    ok: db,
    timestamp: new Date().toISOString(),
    db: db ? 'connected' : 'disconnected',
  });
});

app.use('/api/upload', uploadRoutes);
app.post('/api/send-otp', requireAuth, sendOtp);
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces', workspaceManagementRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/teams', teamManagementRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/channels', channelManagementRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user', userRoutes);
app.use('/api/username', usernameRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reminders', reminderRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
