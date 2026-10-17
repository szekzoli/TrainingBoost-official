# TrainingBoost edzésnapló app – terv és feladatleírás

Ez a dokumentum a `docs/app-terv.md` helyére kerül a repóban. A Claude Code ebből dolgozzon.

## 1. Cél

A trainingboost.hu oldalon (`/app` útvonal) a vásárlók megnyithatják a megvásárolt edzéstervüket, pipálhatják az elvégzett edzéseket, és rögzíthetik a súlyokat. Később fotók, grafikonok, fizetés és edzői nézet jön.

## 2. Döntések

- Frontend: a meglévő React + TypeScript + Vite + Tailwind + shadcn/ui projekt, Netlify hosting. Új útvonal: `/app`.
- Backend: Supabase, EU régióban (Frankfurt).
- Belépés: **nincs jelszó, nincs Supabase Auth.** Minden vásárló egy hosszú, véletlenszerű kódot kap, amit Zoli kézzel küld el e-mailben linkként: `trainingboost.hu/app/t/<kód>`.
- A kódot az adatbázis **csak hash-elve** tárolja (SHA-256).
- Az adatbázis táblái zártak (RLS bekapcsolva, nincs policy az `anon` szerepnek). A kliens **csak a lent felsorolt RPC függvényeken keresztül** fér hozzá az adatokhoz, amik a kódot ellenőrzik.
- A tervek a Google Sheets sablonból kerülnek egy egyszeri importtal az adatbázisba.
- Videók: beágyazott YouTube (unlisted) linkek, gyakorlatonként egy URL. A videóforrás legyen egy helyen cserélhető (később Vimeo/Bunny).
- Dizájn: letisztult, minimalista, navy/teal/fehér paletta, keretekkel és struktúrával elkülönítve, nem színes kitöltéssel. Mobil az elsődleges nézet.
- Nyelv: magyar felület.

## 3. Az 1. verzió hatóköre

1. A kód alapján azonosított vásárló megnyitja a linket, és látja a tervét (hetek → napok → gyakorlatok).
2. Gyakorlatonként szetek rögzítése: súly (kg) és ismétlésszám.
3. Egy edzésnap "elvégzett" jelölése, jegyzettel.
4. Korábbi edzések visszanézése (az előző alkalommal használt súly látszik a gyakorlat mellett).
5. Gyakorlat videója beágyazva.
6. "Adataim törlése" gomb (adatvédelem).

Nem része az 1. verziónak: fotók, grafikonok, fizetés, edzői nézet, e-mailes belépés.

## 4. Adatmodell

```sql
create extension if not exists pgcrypto;

-- Tervek
create table plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  week int not null,
  day int not null,
  title text,
  unique (plan_id, week, day)
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  video_url text,          -- YouTube unlisted link vagy embed azonosító
  technique_note text
);

create table day_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references plan_days(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  position int not null,
  group_label text,        -- pl. "A" / "B" szuperszett-csoport
  sets int not null,
  reps text not null,      -- SZÖVEG, mert "8-12" jellegű értékek is vannak
  rest_seconds int,
  note text
);

-- Vásárlók
create table clients (
  id uuid primary key default gen_random_uuid(),
  label text not null,                 -- Zoli saját jelölése, pl. keresztnév
  access_code_hash text unique not null,
  plan_id uuid not null references plans(id),
  consent_at timestamptz,              -- adatkezelési hozzájárulás időpontja
  revoked_at timestamptz,              -- ha ki van tiltva / érvénytelenítve
  created_at timestamptz not null default now()
);

-- Napló
create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  plan_day_id uuid not null references plan_days(id),
  completed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (client_id, plan_day_id)
);

create table set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references workout_logs(id) on delete cascade,
  day_exercise_id uuid not null references day_exercises(id),
  set_number int not null,
  weight_kg numeric(6,2),
  reps int,
  logged_at timestamptz not null default now(),
  unique (workout_log_id, day_exercise_id, set_number)
);

-- Minden tábla zárt a nyilvános kulcs elől
alter table plans enable row level security;
alter table plan_days enable row level security;
alter table exercises enable row level security;
alter table day_exercises enable row level security;
alter table clients enable row level security;
alter table workout_logs enable row level security;
alter table set_logs enable row level security;
-- (Szándékosan nincs policy az anon/authenticated szerepeknek.)
```

## 5. RPC függvények (security definer)

Mindegyik függvény első lépése: a kapott kód SHA-256 hash-ét megkeresi a `clients` táblában (`revoked_at is null`), és ha nincs találat, hibát ad vissza. A függvények `security definer`-ek, `set search_path = public`, és csak az `anon` szerepnek van `execute` joguk rájuk.

| Függvény | Feladat |
|---|---|
| `app_get_plan(p_code text)` | A vásárló tervét adja vissza (napok, gyakorlatok, videók). |
| `app_get_logs(p_code text)` | A vásárló összes naplózott edzését és szetjét. |
| `app_log_set(p_code text, p_day_exercise_id uuid, p_set_number int, p_weight numeric, p_reps int)` | Szet rögzítése vagy módosítása (upsert). Létrehozza a `workout_logs` sort, ha még nincs. |
| `app_complete_day(p_code text, p_plan_day_id uuid, p_note text)` | Az edzésnapot elvégzettnek jelöli. |
| `app_delete_my_data(p_code text)` | Törli a vásárló naplóadatait és magát a `clients` sort. |

Fontos: minden függvény csak azt a `plan_day`-t / `day_exercise`-t fogadja el, ami a vásárló saját tervéhez tartozik.

## 6. Képernyők (mobil első)

- `/app/t/:code` – nyitóképernyő: terv címe, hetek listája, haladás (hány nap kész).
- Hét nézet – a hét napjai, mindegyiknél pipa, ha kész.
- Edzésnap nézet – gyakorlatok listája, mindegyiknél: név, szettek × ismétlés, beágyazott videó (összecsukható), szetenként súly/ismétlés mezők, előző alkalom értékei halványan, "Edzés kész" gomb és jegyzet.
- Beállítások – adatkezelési tájékoztató, "Adataim törlése".
- Érvénytelen vagy visszavont kód esetén barátságos hibaoldal.

## 7. Az app az első betöltéskor

A kód az URL-ből jön, és `localStorage`-ba mentjük, hogy a vásárló később a `/app` címen is vissza tudjon térni. A kódot nem logoljuk, nem tesszük analitikába (GA4 esemény ne tartalmazza).

## 8. Biztonság és adatvédelem

- A Supabase anon kulcs a kliensben van, ez normális, mert a táblák zártak, és csak az RPC-k érhetők el.
- A `.env` fájl nem kerül Git-be (`.gitignore`-ban szerepel: `.env`, `.env.local`, `node_modules`).
- A `service_role` kulcsot **soha** nem tesszük a kliens kódba.
- A kódok legalább 24 véletlenszerű karakter (pl. `crypto.randomUUID()` két összefűzve, vagy base62), kézzel generálva egy szkripttel.
- Adatkezelési tájékoztató + hozzájárulás kell az indulás előtt. A törlés funkció az 1. verzióban már legyen meg.

## 9. Segédeszközök, amiket meg kell építeni

1. **Import szkript** (`scripts/import-plan.ts`): a Google Sheets exportból (CSV) betölti a tervet a `plans`, `plan_days`, `exercises`, `day_exercises` táblákba. A `reps` oszlopot szövegként kezeli. Hibás, dátummá alakult értékeket jelezze.
2. **Kód-generáló szkript** (`scripts/create-client.ts`): létrehoz egy `clients` sort egy új véletlen kóddal, a hash-t menti, és kiírja a linket, amit Zoli elküld e-mailben.

## 10. Munkamenet

- Ág: `feature/app`, kis commitok.
- Sorrend: (1) Supabase séma + RPC-k, (2) import szkript és minta terv, (3) `/app` útvonal és képernyők, (4) mobilteszt, (5) adatvédelmi szövegek, (6) éles bekötés Netlify-on környezeti változókkal.
- Minden lépés után Zoli kipróbálja a telefonján.
