import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy, rarely-changing vendor code into its own cached chunks
        // so the main app bundle stays small. (MapLibre is already lazy-loaded.)
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
});
