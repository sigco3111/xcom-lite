/// <reference types="node" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv, ConfigEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }: ConfigEnv) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      // GitHub Pages basePath
      base: '/xcom-lite/',
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('.', import.meta.url)),
        }
      },
      build: {
        external: [
          'react',
          'react-dom',
          'three',
          'chart.js',
          '@kurkle/color'
        ],
        rollupOptions: {
          output: {
            inlineDynamicImports: false,
            manualChunks: undefined
          }
        }
      }
    };
});