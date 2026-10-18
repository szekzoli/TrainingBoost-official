# TrainingBoost admin (helyi eszköz)

Csak a saját gépen futó edzésterv-készítő. Nem része a fő buildnek (`npm run build`), nincs kitéve az internetre. Terv: `docs/admin-terv.md`.

## Első indítás

1. Supabase SQL Editor: futtasd le a `supabase/003-admin.sql` fájlt.
2. Másold az `admin/.env.example` fájlt `admin/.env.local` néven, és töltsd ki:
   - `SUPABASE_URL`: a projekt címe,
   - `SUPABASE_SECRET_KEY`: a "secret key" (Project Settings → API Keys). **Ne** a publishable/anon kulcs.
3. `npm run admin`, majd nyisd meg: <http://127.0.0.1:5174>

A titkos kulcsot kizárólag a helyi szerver (`admin/server/`) olvassa, a böngészőbe soha nem kerül. Nem lehet `VITE_` előtagú változó, és az `admin/.env*` fájlokat a `.gitignore` kizárja.

## Felépítés

- `start.ts`: elindítja a helyi API-t (`127.0.0.1:5175`) és a felületet (`127.0.0.1:5174`).
- `server/`: helyi API (Node beépített modulokkal + a már telepített `@supabase/supabase-js`).
- `ui/`: React felület (a `/api` hívásokat a Vite továbbítja a helyi szervernek).
