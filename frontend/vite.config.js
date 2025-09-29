import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_BASE || env.REACT_APP_API_BASE || 'http://127.0.0.1:8000';

  return {
    plugins: [
      react({
        jsxRuntime: 'automatic',
        include: '**/*.{jsx,tsx,js,ts}',
      }),
    ],
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.[jt]sx?$/,
      exclude: [],
    },
    server: {
      host: true,
      port: 3000,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        '/media': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 3000,
    },
    build: {
      outDir: 'build',
      emptyOutDir: true,
    },
    define: {
      'process.env': {},
    },
  };
});
