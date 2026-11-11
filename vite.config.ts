import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'third-party-notices',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'THIRD_PARTY_NOTICES.txt',
          source: `KaTeX styles and fonts\n\n${readFileSync('node_modules/katex/LICENSE', 'utf8')}`,
        });
      },
    },
  ],
  build: {
    lib: {
      entry: 'library.ts',
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'styles',
    },
    rolldownOptions: {
      external: ['react', 'react/jsx-runtime', 'framer-motion', 'katex'],
    },
  },
});
