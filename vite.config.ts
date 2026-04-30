import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '::',
    port: 5173,
    hmr: { overlay: false }
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
});