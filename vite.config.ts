import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '::',
    port: 5173,
    hmr: { 
      overlay: false,
      protocol: 'ws',
      timeout: 5000
    }
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
});