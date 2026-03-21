/**
 * TeamPulse API Server
 * Entry point: loads env, connects DB, mounts middleware and routes, starts HTTP + Socket.io
 */
import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { initSocket } from './sockets/index.js';
import { startSchedulers, stopSchedulers } from './services/scheduler.service.js';
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const PORT_RETRY_ATTEMPTS = Number(process.env.PORT_RETRY_ATTEMPTS) || 10;

function listenWithRetry(server, host, startPort, maxAttempts) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryListen = (port) => {
      attempts += 1;

      const onError = (err) => {
        server.off('error', onError);

        if (err?.code === 'EADDRINUSE' && attempts < maxAttempts) {
          const nextPort = port + 1;
          console.warn(`[Server] Port ${port} is in use, retrying on ${nextPort}...`);
          setTimeout(() => tryListen(nextPort), 50);
          return;
        }

        reject(err);
      };

      server.once('error', onError);
      server.listen(port, host, () => {
        server.off('error', onError);
        resolve(port);
      });
    };

    tryListen(startPort);
  });
}

async function start() {
  try {
    await connectDB();
    const server = http.createServer(app);
    initSocket(server);
    startSchedulers();
    const activePort = await listenWithRetry(server, HOST, PORT, PORT_RETRY_ATTEMPTS);
    console.log(`[Server] Running on http://localhost:${activePort}`);
    console.log(`[Server] Network URL http://<your-lan-ip>:${activePort}`);


    function shutdown(signal) {
      console.log(`[Server] ${signal} received, shutting down`);
      server.close(async () => {
        stopSchedulers();
        await disconnectDB();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    }
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

start();
