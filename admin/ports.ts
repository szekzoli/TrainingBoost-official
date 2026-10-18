// Az admin két helyi portja. Mindkettő kizárólag a 127.0.0.1 címen figyel.
export const HOST = '127.0.0.1';
export const UI_PORT = 5174; // Vite fejlesztői szerver (React felület)
export const API_PORT = 5175; // helyi API szerver (az egyetlen, ami a Supabase-szel beszél)
