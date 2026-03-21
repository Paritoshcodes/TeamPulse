import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: proxyTarget,
        ws: true,
      },
    },
  },
});
