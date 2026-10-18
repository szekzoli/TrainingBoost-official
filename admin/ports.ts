// Az admin két helyi portja. Mindkettő kizárólag a 127.0.0.1 címen figyel.
// Ütközés esetén felülírható: ADMIN_UI_PORT, ADMIN_API_PORT.
const port = (value: string | undefined, fallback: number) => (value && /^\d{2,5}$/.test(value) ? Number(value) : fallback);

export const HOST = '127.0.0.1';
export const UI_PORT = port(process.env.ADMIN_UI_PORT, 5174); // Vite fejlesztői szerver (React felület)
export const API_PORT = port(process.env.ADMIN_API_PORT, 5175); // helyi API szerver (az egyetlen, ami a Supabase-szel beszél)
