/// <reference types="node" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv, ConfigEnv } from 'vite';

export default defineConfig(({ mode }: ConfigEnv) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
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
