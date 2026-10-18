// Az admin felület saját Vite-konfigurációja. NEM része a fő `npm run build`-nek.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_PORT, HOST, UI_PORT } from './ports.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

export default defineConfig({
  root: path.join(here, 'ui'),
  plugins: [react(), tailwindcss()],
  // Szándékosan nem töltünk be .env fájlt: a felület semmilyen környezeti változót nem kaphat,
  // a titkos kulcsot pedig kizárólag a helyi szerver olvassa.
  envDir: false,
  server: {
    host: HOST,
    port: UI_PORT,
    strictPort: true,
    proxy: {
      '/api': { target: `http://${HOST}:${API_PORT}`, changeOrigin: false },
    },
    fs: {
      // Csak a felület, a megosztott videó-segéd és a csomagok olvashatók a dev szerverből.
      allow: [path.join(here, 'ui'), path.join(repoRoot, 'src', 'lib'), path.join(repoRoot, 'node_modules')],
      deny: ['**/.env*', '**/*.pem', '**/*.crt'],
    },
  },
});
