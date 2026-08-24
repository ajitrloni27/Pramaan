import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to the brain engine running on :3000
    proxy: {
      '/run':     { target: 'http://localhost:3000', changeOrigin: true },
      '/consent': { target: 'http://localhost:3000', changeOrigin: true },
      '/health':  { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
