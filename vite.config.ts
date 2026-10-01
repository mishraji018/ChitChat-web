import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ],
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