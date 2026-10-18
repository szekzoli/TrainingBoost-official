# Admin: edzésterv-készítő (helyi eszköz)

Ez a dokumentum a `docs/admin-terv.md` helyére kerül. Előtte olvasd el a `docs/app-terv.md`, a `docs/app-ui-v2.md` fájlt, a `supabase/schema.sql`, `supabase/seed-sample.sql` és `supabase/002-resistance.sql` fájlokat, és a meglévő `/app` kódot. Ha a séma eltér attól, amit itt leírok, a séma az irányadó: jelezd az eltérést, mielőtt építenél rá. A nyilvános oldalakhoz és az ügyfél-felülethez (`src/`) ne nyúlj. Ne commitolj, ne olvasd ki a `.env` fájlokat, új függőséget (npm csomagot) csak kérdés után adj hozzá, és ne futtass `npm install`-t, kérd meg a felhasználót.

## 1. Cél és alapelv

Zoli (az edző) egy **csak a saját gépén futó** szerkesztőfelületet szeretne, amivel edzéstervet készít, és ügyfeleket hoz létre. A felület nincs kitéve az internetre, ezért nincs bejelentkezés és nem használunk Supabase Auth-ot.

Funkciók:
- **Gyakorlattár:** gyakorlatok felvétele és szerkesztése; terv-készítéskor gépeléssel keresés (autocomplete) vagy listából választás.
- **Terv készítése semmiből**, hetekre és napokra bontva.
- **Terv másolása**, majd a másolat szerkesztése.
- **Sablonok:** a sablon egy megjelölt terv. Új terv létrehozható sablonból (egész heti terv, vagy az egész többhetes terv másolatként). Egy meglévő terv sablonná is menthető.
- **Ügyfelek:** ügyfél létrehozása egy tervhez, egyedi hozzáférési link előállítása, hozzáférés visszavonása.

## 2. Architektúra és biztonság (kötelező szabályok)

1. Az admin a repóban egy **külön mappában** él (`admin/`), saját Vite-konfigurációval. **Nem része** a fő `npm run build`-nek, és az `npm run build` kimenete (`dist/`) nem tartalmazhat admin fájlt. Ellenőrizd a végén.
2. Két rész: egy **kis helyi szerver** (Node, lehetőleg beépített modulokkal; ha külső csomag kell, előbb kérdezz) és egy **React felület** (a meglévő React, TypeScript és Tailwind használatával). A felület kizárólag a helyi szerverrel beszél, a Supabase-szel soha közvetlenül.
3. A szerver `127.0.0.1`-en figyel (nem `0.0.0.0`), és csak a saját felület eredetét (origin) fogadja el.
4. A Supabase **titkos kulcsa** (`SUPABASE_SECRET_KEY`, a Supabase felületén "secret key" / régi nevén `service_role`) kizárólag a `admin/.env.local` fájlban van, amit csak a szerver olvas. **Soha nem lehet `VITE_` előtagú változó**, nem kerülhet a böngészőbe, a naplóba, hibaüzenetbe vagy a válaszokba. A `.gitignore` zárja ki: `admin/.env*`. Hozz létre egy `admin/.env.example` fájlt kulcs nélkül (`SUPABASE_URL=`, `SUPABASE_SECRET_KEY=`, `PUBLIC_BASE_URL=https://trainingboost.hu`). A `.env.local` tartalmát te nem láthatod, Zoli tölti ki.
5. Az ügyfél hozzáférési kódját (véletlen, legalább 32 hexadecimális karakter, kriptográfiailag erős forrásból, pl. `crypto.randomBytes(16).toString('hex')`) a szerver generálja. Az adatbázisba csak a lenyomata kerül: `sha256(utf8(kód))` hexadecimálisan, **pontosan úgy, ahogy az SQL `encode(sha256(convert_to(code,'utf8')),'hex')`** számolja. A kód **egyszer** jelenik meg a felületen (másolás gombbal, figyelmeztetéssel), nem kerül naplóba, és később nem kérdezhető le.
6. A server oldali műveletek bemenetét ellenőrizni kell (típusok, hossz, egyediség, a slug csak kisbetű, szám és kötőjel).
7. A többlépéses műveletek (másolás, sorrend mentése) legyenek **atomiak**: írd meg őket SQL függvényként a `003` migrációban (lásd 3.), mert a Supabase kliens nem ad tranzakciót.

## 3. Adatbázis: `supabase/003-admin.sql`

Új fájl, Zoli futtatja a Supabase SQL Editorban, ezért legyen **újrafuttatható** (`if not exists`, `create or replace`). Először ellenőrizd a meglévő sémát, és jelezd, ha valami hiányzik. Tartalma:

- `plans.is_template boolean not null default false`.
- `exercises`: egyedi név kis- és nagybetű különbség nélkül (`create unique index if not exists ... on exercises (lower(name))`). **Előtte ellenőrizd**, hogy nincs-e ismétlődő név a tesztadatban; ha van, jelezd, ne töröld magad. Plusz: `category text` (pl. "alsótest", "core", opcionális) és `archived boolean not null default false` (az archivált gyakorlat nem jelenik meg a kereséskor, de a meglévő tervekben megmarad).
- A `plans.slug` egyedisége legyen biztosított (ha még nem az).
- Az admin függvények **csak a szerver (`service_role`) számára hívhatók**: `revoke execute ... from public, anon, authenticated; grant execute ... to service_role;`. Ugyanígy legyen `security definer` és `set search_path = public, pg_temp`. Függvények:
  - `admin_copy_plan(p_source uuid, p_title text, p_slug text, p_as_template boolean)` → az új terv azonosítója. Mély másolat: a `plan_days` és a `day_exercises` sorai (a `section`, `group_label`, `sets`, `reps`, `resistance`, `rest_seconds`, `note`, `position` mezőkkel). A `exercises` sorait **nem másolja**, csak hivatkozik rájuk. Ügyfeleket nem másol.
  - `admin_copy_week(p_plan uuid, p_from_week int, p_to_week int)` → a cél hét napjait és gyakorlatait lecseréli a forrás hét másolatára (a cél hét korábbi tartalma törlődik; a felület megerősítést kér előtte). Ha a cél hét még nem létezik, létrehozza.
  - `admin_set_exercise_order(p_day uuid, p_ids uuid[])` → a nap gyakorlatainak (`day_exercises.id`) sorrendje a megadott tömb szerint.
- Az ügyfelek és a naplók (`clients`, `workout_logs`, `set_logs`) kulcsai miatt: **terv törlése** csak akkor, ha egyetlen ügyfél sincs hozzárendelve. Ha van, a törlés tiltott, a felület mondja meg, miért.

A `service_role` kikerüli az RLS-t, ezért policy nem kell, de ellenőrizd, hogy a korábbi `revoke` parancsok nem vették el tőle a táblajogokat. Ha igen, adj neki jogot (`grant ... to service_role`).

## 4. Képernyők (felület: asztali gépre tervezve, magyar nyelvű, a meglévő navy/teal stílusban)

Felső navigáció: **Tervek · Sablonok · Gyakorlattár · Ügyfelek**.

### 4.1 Gyakorlattár
- Lista keresőmezővel (szűrés gépelés közben), név szerint rendezve; oszlopok: név, kategória, videó van-e, hány tervben szerepel.
- Új gyakorlat és szerkesztés: név (kötelező, egyedi), kategória, videó link (YouTube, a `src/lib/video.ts` szabályai szerint érvényes link; jelezd, ha nem ismerhető fel), technikai leírás (többsoros).
- Törlés csak, ha egy tervben sem szerepel; különben **archiválás** (és visszaállítás).

### 4.2 Tervek és Sablonok
- A lista a terveket (a `Sablonok` fül a sablonokat) mutatja: cím, slug, hetek × napok száma, ügyfelek száma.
- Műveletek: **Új üres terv** (cím, slug, hetek száma 1–12, napok száma hetente 1–7, a napok címe alapértelmezetten "A program", "B program"...), **Másolás** (új cím és slug megadásával), **Sablonná mentés** / **Új terv sablonból** (ez egy másolás), **Szerkesztés**, **Törlés** (a 3. szerinti szabállyal).
- A cím és a slug javaslata: a cím alapján automatikusan képzett slug, szerkeszthető.

### 4.3 Terv-szerkesztő
- Fejléc: cím, slug, leírás szerkeszthető, sablon jelölő.
- **Hét fülek** és alattuk **nap fülek**. Új nap hozzáadása és törlése (törléskor megerősítés).
- **Hét másolása másik hétre** (megerősítéssel, ha a cél hétnek van tartalma): `admin_copy_week`.
- **Nap szerkesztő:** a gyakorlatok táblázatos sorai, mezőkkel: gyakorlat, szakasz, sorozat (egész szám), ismétlés (szöveg), ellenállás (egyetlen szöveges érték), szünet (mp, opcionális), megjegyzés.
  - **Gyakorlat hozzáadása:** egy mező, amelybe gépelve a gyakorlattár találatai jelennek meg (nyilakkal és Enterrel is választható, kattintással is). Ha nincs találat, egy "Új gyakorlat felvétele: '…'" sor jelenik meg, ami a gyakorlattárba is felveszi (kötelező a név, a többi mező utólag is kitölthető).
  - **Szakasz:** a nap már használt szakaszneveiből választható, vagy új szakasznév gépelhető. Az azonos szakaszú, egymás utáni sorok egy csoportot alkotnak.
  - **Szuperszett:** több sor kijelölhető, és egy gombbal közös `group_label` (A, B, C…) kapható, vagy elvehető. Szuperszettet alkotó sorok legyenek egymás mellett (egymás utáni pozíciók); a felület ezt biztosítsa.
  - **Sorrend:** fel/le nyilak (és húzás, ha egyszerűen megoldható); mentés az `admin_set_exercise_order`-rel.
  - **Hatókör:** a sorozat, ismétlés, ellenállás és megjegyzés módosításakor választható: "csak ez a hét", "ettől a hétig a végéig", "minden hét". A párosítás szabálya: ugyanaz a nap sorszáma és ugyanaz a `exercise_id`, ugyanazon a szakaszon belül; ha ugyanaz a gyakorlat többször szerepel egy napon, a nap szerinti pozíció dönt. Ha egy másik héten nem található egyezés, azt jelezd, ne hagyd csendben ki.
- **Áttekintő fül:** a teljes terv csak olvasható, tömör táblázata (hét, nap, szakasz, gyakorlat, sorozat × ismétlés, ellenállás), nyomtatható.
- A mentés explicit ("Mentés" gomb) vagy automatikus, de mindig látszik az állapot ("Mentve" / "Mentés…" / hiba). Hiba esetén ne vesszen el a bevitt adat.

### 4.4 Ügyfelek
- Lista: belső azonosító (`label`), terv, létrehozás dátuma, állapot (aktív / visszavont).
- **Új ügyfél:** azonosító (`label`, javaslat: "V-0001" jellegű sorszám; a felület figyelmeztet, hogy ide ne írjon teljes nevet) és a terv kiválasztása. A szerver létrehozza a kódot, és a felület **egyszer** megmutatja a linket (`PUBLIC_BASE_URL + /app/t/ + kód`), másolás gombbal.
- Visszavonás és visszaállítás (`revoked_at`), terv módosítása.
- Az ügyfél adatainak törlését ne építsd be most.

## 5. Nem része ennek a körnek
Excel-import, képgaléria a gyakorlatokhoz, fizetés- vagy webshop-összekötés, többfelhasználós szerkesztés, az ügyfél-felület módosítása.

## 6. Szakaszolás (mindegyik szakasz végén állj meg, és foglald össze)

1. **A. szakasz:** a `supabase/003-admin.sql`, az `admin/` váz (helyi szerver, felület, indítás az `npm run admin` paranccsal), a titkos kulcs kezelése, és a **Gyakorlattár**.
2. **B. szakasz:** Tervek és Sablonok, Terv-szerkesztő, másolás, az áttekintő fül.
3. **C. szakasz:** Ügyfelek.

## 7. Ellenőrzés
- `npm run build` hibátlanul fusson, és a `dist/` ne tartalmazzon admin fájlt vagy kulcsot. Keress rá a titkos kulcs nevére a `dist/` és a `src/` mappában.
- Az admin csak `127.0.0.1`-en érhető el.
- A kézi tesztet sorold fel, amit Zoli végigpróbálhat az adott szakaszra (pl. gyakorlat felvétele, terv másolása, hét másolása, ügyfél létrehozása és a kapott link kipróbálása az ügyfél-felületen).
- A végén foglald össze, mely fájlokat hoztad létre vagy módosítottad, mit kell Zolinak futtatnia a Supabase-ben (SQL), és mit nem tudtál megoldani.
