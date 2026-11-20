# TrainingBoost admin (helyi eszköz)

Csak a saját gépen futó edzésterv-készítő. Nem része a fő buildnek (`npm run build`), nincs kitéve az internetre. Terv: `docs/admin-terv.md`.

## Első indítás

1. Supabase SQL Editor: futtasd le sorban a `supabase/003-admin.sql`, a `supabase/004-admin.sql` , a `supabase/005-kovetes.sql`, a `supabase/006-ugyfel-reszletek.sql` és a `supabase/007-gyakorlattar.sql` fájlt (újrafuttathatók). Gyakorlattár feltöltése (nem kötelező): `supabase/sablonok/gyakorlattar.sql`.
2. Másold az `admin/.env.example` fájlt `admin/.env.local` néven, és töltsd ki:
   - `SUPABASE_URL`: a projekt címe,
   - `SUPABASE_SECRET_KEY`: a "secret key" (Project Settings → API Keys). **Ne** a publishable/anon kulcs.
3. `npm run admin`, majd nyisd meg: <http://127.0.0.1:5174>

A titkos kulcsot kizárólag a helyi szerver (`admin/server/`) olvassa, a böngészőbe soha nem kerül. Nem lehet `VITE_` előtagú változó, és az `admin/.env*` fájlokat a `.gitignore` kizárja.

## Felépítés

- `start.ts`: elindítja a helyi API-t (`127.0.0.1:5175`) és a felületet (`127.0.0.1:5174`).
- `server/`: helyi API (Node beépített modulokkal + a már telepített `@supabase/supabase-js`).
- `ui/`: React felület (a `/api` hívásokat a Vite továbbítja a helyi szervernek).

## Képernyők

- **Áttekintés** (`/attekintes`): esedékes új tervek, nem edző ügyfelek, legutóbbi aktivitás, sablonok; emlékeztetők naptárfájlként (`/api/reminders.ics`).
- **Ügyfél-oldal** (`/ugyfel/:id`): az ügyfél naplója (sorozatok, jegyzetek, értékelések) és gyakorlatonkénti haladása.

- **Gyakorlattár** (A. szakasz), **Tervek** és **Sablonok** lista, **Terv-szerkesztő** (`/terv/:id`: hét- és nap fülek, gyakorlat-sorok, szuperszett, sorrend, hét másolása, Áttekintő fül). Az Ügyfelek a C. szakaszban készül.

## Ütköző portok

Ha az 5174 vagy az 5175 foglalt, indítás előtt állítsd be: `ADMIN_UI_PORT`, `ADMIN_API_PORT` környezeti változó.
