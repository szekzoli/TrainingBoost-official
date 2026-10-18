// Helyi admin API szerver. Csak a 127.0.0.1 címen figyel, és csak a saját felület eredetét fogadja el.
// A felület kizárólag ezen keresztül éri el a Supabase-t; a titkos kulcs nem hagyja el ezt a folyamatot.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { API_PORT, HOST, UI_PORT } from '../ports.ts';
import { loadConfig, type ConfigResult } from './config.ts';
import { ApiError, createDb, dbError, unknownError, type SupabaseClient } from './db.ts';
import { createExercise, deleteExercise, listExercises, updateExercise } from './exercises.ts';
import { ValidationError } from './validate.ts';

const ALLOWED_ORIGINS = new Set([`http://${HOST}:${UI_PORT}`, `http://localhost:${UI_PORT}`]);
const ALLOWED_HOSTNAMES = new Set([HOST, 'localhost']);
const MAX_BODY_BYTES = 64 * 1024;

function send(res: ServerResponse, status: number, body: unknown) {
  const text = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(text);
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    if (type !== 'application/json') {
      reject(new ApiError(415, 'unsupported_media_type', 'A kérés tartalma JSON kell legyen.'));
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new ApiError(413, 'too_large', 'A kérés túl nagy.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new ApiError(400, 'bad_json', 'Érvénytelen JSON.'));
      }
    });
    req.on('error', () => reject(new ApiError(400, 'bad_request', 'A kérés nem olvasható.')));
  });
}

// DNS-rebinding és más oldalról érkező (CSRF) kérések kizárása.
function guard(req: IncomingMessage) {
  const host = (req.headers.host ?? '').replace(/:\d+$/, '').toLowerCase();
  if (!ALLOWED_HOSTNAMES.has(host)) throw new ApiError(403, 'forbidden_host', 'Nem engedélyezett kérés.');

  const origin = req.headers.origin;
  const safeMethod = req.method === 'GET' || req.method === 'HEAD';
  if (origin !== undefined && !ALLOWED_ORIGINS.has(origin)) {
    throw new ApiError(403, 'forbidden_origin', 'Nem engedélyezett kérés.');
  }
  if (!safeMethod && origin === undefined) {
    throw new ApiError(403, 'forbidden_origin', 'Nem engedélyezett kérés.');
  }
}

type Ctx = {
  req: IncomingMessage;
  url: URL;
  db: SupabaseClient;
  baseUrl: string;
};

async function route(ctx: Ctx): Promise<{ status: number; body?: unknown }> {
  const { req, url, db } = ctx;
  const method = req.method ?? 'GET';
  const path = url.pathname;

  if (path === '/api/exercises') {
    if (method === 'GET') return { status: 200, body: { exercises: await listExercises(db) } };
    if (method === 'POST') return { status: 201, body: { exercise: await createExercise(db, await readJson(req)) } };
    throw new ApiError(405, 'method_not_allowed', 'Nem engedélyezett metódus.');
  }

  const m = path.match(/^\/api\/exercises\/([^/]+)$/);
  if (m) {
    if (method === 'PATCH') {
      return { status: 200, body: { exercise: await updateExercise(db, m[1], await readJson(req)) } };
    }
    if (method === 'DELETE') {
      await deleteExercise(db, m[1]);
      return { status: 200, body: { ok: true } };
    }
    throw new ApiError(405, 'method_not_allowed', 'Nem engedélyezett metódus.');
  }

  throw new ApiError(404, 'not_found', 'Nincs ilyen végpont.');
}

export function startApi(): Promise<{ server: Server; config: ConfigResult }> {
  const config = loadConfig();
  const db = config.ok ? createDb(config.config) : null;

  const server = createServer(async (req, res) => {
    try {
      guard(req);
      const url = new URL(req.url ?? '/', `http://${HOST}:${API_PORT}`);

      if (url.pathname === '/api/status') {
        // Kulcsot vagy értéket nem tartalmaz: csak azt, hogy be van-e állítva.
        send(res, 200, config.ok ? { configured: true } : { configured: false, problems: config.problems });
        return;
      }
      if (!db || !config.ok) {
        send(res, 503, {
          error: 'not_configured',
          message: 'Az admin nincs beállítva.',
          problems: config.ok ? [] : config.problems,
        });
        return;
      }

      const out = await route({ req, url, db, baseUrl: config.config.publicBaseUrl });
      send(res, out.status, out.body);
    } catch (err) {
      if (err instanceof ValidationError) {
        send(res, 400, { error: 'validation', field: err.field, message: err.message });
      } else if (err instanceof ApiError) {
        send(res, err.status, { error: err.code, message: err.message });
      } else if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
        const e = dbError(err as { code?: string; message?: string });
        send(res, e.status, { error: e.code, message: e.message });
      } else {
        const e = unknownError();
        send(res, e.status, { error: e.code, message: e.message });
      }
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    // Szándékosan 127.0.0.1, nem 0.0.0.0: a hálózatról nem érhető el.
    server.listen(API_PORT, HOST, () => resolve({ server, config }));
  });
}
