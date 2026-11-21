import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import type { Plugin } from 'vite';

/**
 * Az ügyfél-app service workerét a build végén állítja elő (dist/app-sw.js), benne az aktuális
 * JS/CSS/betűfájlok listájával, hogy az app net nélkül is megnyíljon. A weboldal képei nincsenek benne.
 */
function appServiceWorker(): Plugin {
  return {
    name: 'tb-app-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const assets = Object.keys(bundle)
        .filter((f) => /\.(js|css|woff2)$/.test(f))
        .map((f) => '/' + f)
        .sort();
      const template = readFileSync(path.resolve(__dirname, 'scripts/app-sw.template.js'), 'utf8');
      const version = Date.now().toString(36);
      this.emitFile({
        type: 'asset',
        fileName: 'app-sw.js',
        source: `self.__TB_VERSION__ = ${JSON.stringify(version)};\nself.__TB_ASSETS__ = ${JSON.stringify(assets)};\n${template}`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), appServiceWorker()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
});
