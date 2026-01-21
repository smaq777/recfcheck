import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const openai = env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY || '';
    const resend = env.VITE_RESEND_API_KEY || env.RESEND_API_KEY || '';
    const openalex = env.VITE_OPENALEX_API_KEY || env.OPENALEX_API_KEY || '';
    const database = env.VITE_DATABASE_URL || env.DATABASE_URL || '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, '/api'),
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.OPENAI_API_KEY': JSON.stringify(openai),
        'process.env.RESEND_API_KEY': JSON.stringify(resend),
        'process.env.OPENALEX_API_KEY': JSON.stringify(openalex),
        'process.env.DATABASE_URL': JSON.stringify(database)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
