import { defineConfig } from 'vite';

const SERVER_PORT = Number(process.env.SERVER_PORT ?? 47322);

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: Number(process.env.WEB_PORT ?? 47321),
    strictPort: true,
    proxy: {
      '/ws': { target: `ws://127.0.0.1:${SERVER_PORT}`, ws: true },
    },
  },
});
