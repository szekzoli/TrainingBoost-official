// `npm run admin`: elindítja a helyi API szervert és a felületet (mindkettő csak 127.0.0.1-en).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { HOST, UI_PORT } from './ports.ts';
import { startApi } from './server/index.ts';

const here = dirname(fileURLToPath(import.meta.url));

const { config } = await startApi();
if (!config.ok) {
  console.warn('\n[admin] Az admin még nincs beállítva:');
  for (const p of config.problems) console.warn(`  - ${p}`);
  console.warn('  A felület elindul, de az adatok nem töltődnek be, amíg ezt nem pótolod.\n');
}

const vite = await createServer({
  configFile: join(here, 'vite.config.ts'),
  server: { host: HOST, port: UI_PORT, strictPort: true },
});
await vite.listen();

console.log(`\n[admin] Elérhető: http://${HOST}:${UI_PORT}  (csak ezen a gépen)\n`);
