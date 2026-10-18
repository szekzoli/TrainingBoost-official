# Edzésnapló app – 2. kör: új edzésnap-felület, összecsukható szakaszok, szuperszett, PDF

Ez a dokumentum a `docs/app-ui-v2.md` helyére kerül. Előtte olvasd el a `docs/app-terv.md` fájlt és a meglévő `/app` kódot (`src/app/components/app/`, `src/app/pages/App*.tsx`, `src/lib/app-api.ts`). A meglévő szerkezetet és tokeneket (`app-navy`, `app-teal`, a most használt betűtípus) vidd tovább, ne vezess be újat. A nyilvános oldalakhoz ne nyúlj. Ne commitolj, és kérdezz, ha valami nem egyértelmű.

## 0. Előfeltétel

A `supabase/002-resistance.sql` lefutott, ezért az `app_get_plan` válaszában minden gyakorlatnál van `section` (szöveg vagy null), `group_label` (szöveg vagy null), `resistance` (szöveg vagy null), `note` és `exercise.technique_note`. Frissítsd a TypeScript típusokat (`app-api.ts`): `PlanExercise` kapja meg a `section`, `group_label` és `resistance` mezőt.

## 1. Alapelvek

- **Az ellenállás egyetlen szabad szöveges érték** (pl. `10 kg`, `közepes gumiszalag`, `testsúly`). Soha nem jelenik meg két érték egy gyakorlatnál. A látványterv néhány helyen `5 / 10 kg` jellegű értéket mutatott, ez csak példa volt, nem követendő.
- **Hetente N edzésnap van (2, 3 vagy 4)**, a napok címe pl. `A program`, `B program`, `C program`. Semmi nem feltételezheti, hogy pontosan kettő van. Az adatbázisból számold: az adott hét `plan_days` sorai.
- A felület mobil első, minimalista, navy/teal/fehér, vonalakkal és kerettel tagolva, nem színes kitöltéssel.

Referencia színek a látványtervből: navy `#10294A`, teal szöveg/keret `#0B7566`, teal kitöltés (pipa, haladássáv) `#0E8C7A`, világos teal `#EAF6F3`, háttér `#F4F6F9`, keret `#D5DDE6`, másodlagos szöveg `#5B6B7D`. Kártya sugár 14px, beviteli mező és gomb sugár 10–12px, minden kattintható elem legalább 44px.

## 2. Edzésnap képernyő (`/app/d/:week/:day`)

**Fejléc:** bal oldalt "‹ N. hét" vissza-link, jobb oldalt egy **PDF** gomb (nyomtató ikon + "PDF", min. 44px), ami a `/app/print/:week` oldalra visz. Alatta a nap címe (h1), "N. hét · M. nap", majd a haladás: "x / y sorozat" és egy vékony sáv.

**Szakaszok:** a gyakorlatokat a `section` mező szerint csoportosítsd, az adatbázis `position` sorrendjében (egymás utáni azonos szakaszok egy csoport). A `section` nélküli gyakorlatok fejléc nélküli csoportba kerülnek.
- A szakasz fejléce egy **gomb** (`aria-expanded`), legalább 44px magas, balra chevron (nyitva: lefelé, zárva: jobbra), nagybetűs, teal felirat.
- Jobbra a fejlécben: "x / y sorozat". Ha a szakasz minden sorozata kész, ez helyett egy "kész" jelzés (teal keretes kis címke pipával).
- Alapból minden szakasz nyitva. Az összecsukás csak helyi állapot, nem kell menteni.

**Gyakorlat kártya** (fehér, 1px keret):
1. Felső sor: 52px-es bélyegkép (ha van `video_url`, play ikon, a `src/lib/video.ts` szerint; ha nincs, nincs bélyegkép), a gyakorlat neve, jobbra egy 44px-es `i` gomb a részletekre. A bélyegkép és az `i` gomb csak akkor jelenik meg, ha van videó, `note` vagy `technique_note`.
2. **Előírás sáv:** háromcellás, vonalakkal elválasztott: SOROZAT (`sets`), ISMÉTLÉS (`reps`, szövegként), ELLENÁLLÁS (`resistance`, teal szöveg; ha null: "–"). Kis nagybetűs felirat a cellák tetején.
3. **Sorozatsorok**, rács: `Sor | Előző | Kg | Ism. | ✓`.
   - Sor: 1, 2, 3...
   - Előző: a legutóbb **másik napon** rögzített érték (`10 kg × 10`), különben "–".
   - Kg és Ism. beviteli mező. A placeholder az előírás: a kg-é az `resistance` elején álló szám (a tizedesvesszőt pontra cseréld, `22,5 kg` → `22.5`), az ismétlésé a `reps` első egész száma. Ha nincs ilyen szám, a placeholder üres.
   - Pipa gomb: ha a mezők üresek, a placeholder értékkel tölti ki a sort, majd menti (`app_log_set`). Ha a mezők ki vannak töltve, azt menti. Kész sor: halvány teal háttér és keret, kitöltött teal pipa. A kész sor mezői szerkeszthetők, módosításkor mentse a változást.
   - A visszavonás (pipa levétele) csak akkor kell, ha a meglévő RPC-kkel megoldható. Ha nem, ne építs új RPC-t, hanem jelezd nekem.
4. A `note` (edzői megjegyzés) a részletek képernyőn jelenik meg, a kártyán nem.

**Szuperszett:** az **egymás után következő, azonos nem üres `group_label`** értékű gyakorlatok egy csoportot alkotnak.
- Egy közös, 1.5px `#0B7566` keretű egység, felül teljes szélességű fejlécsáv (`#0B7566` háttér, fehér szöveg): bal oldalt "SZUPERSZETT A" (a label), jobbra "2 gyakorlat · szünet nélkül váltogasd".
- A csoport kártyái összeolvadnak (nincs köztük margó, a külső keret közös).
- A kártyák között egy összekötő sáv (`#EAF6F3` háttér, szaggatott felső vonal, lefelé mutató nyíl és szöveg): "A1 után azonnal A2, utána pihenő".
- Minden gyakorlat neve előtt egy 30px-es jelölő doboz (teal keret): `A1`, `A2`... (a label és a sorszám a csoporton belül).

**Lezárás:** a meglévő jegyzet mező és az "Edzés kész" gomb (`app_complete_day`) marad, a szakaszok alatt.

## 3. Gyakorlat részletei (`/app/e/:week/:day/:dayExerciseId` vagy egy alsó panel, ahogy a meglévő routing könnyebben viszi)

Tartalom: vissza-link, a szakasz felirata, a gyakorlat neve, a videó (ha van `video_url`, a `src/lib/video.ts` szerint beágyazva, 16:9), az előírás sáv (mint a kártyán), "Edzői megjegyzés" (`note`, információs ikonnal), "Technika" (`technique_note`, a sortöréseket megőrizve), "Előző alkalom" (a gyakorlat korábbi sorozatai kis keretes címkékben, pl. `1 · 10 kg × 10`). Az üres blokkokat ne jelenítsd meg.

Nem kell most: képgaléria (nincs hozzá adat, de a videókeret a későbbi bővítést engedje meg), gyakorlatonkénti saját jegyzet (nincs hozzá tábla).

## 4. PDF: heti terv nyomtatási nézettel (`/app/print/:week`)

**Megoldás:** nincs PDF-könyvtár. Egy nyomtatásra szabott oldal, amit a böngésző "Nyomtatás / Mentés PDF-ként" funkciója PDF-fé alakít.

- A nézet az adott hét **összes napját** tartalmazza (2, 3 vagy 4 nap, a tervtől függően), mindegyik **külön A4 oldalon** (`break-after: page`).
- Képernyőn egy felső eszköztár: "Nyomtatás / Mentés PDF-ként" gomb (`window.print()`) és "Vissza". Nyomtatáskor ez rejtve legyen (`@media print`).
- A PDF gomb azt a hetet nyomtatja, amelyik nézetről indult (hét vagy edzésnap nézet).
- Ugyanúgy a mentett kódot használja (`localStorage`), a kód nincs az URL-ben. `noindex` és `no-referrer` marad, a kódot ne logold.
- `@page { size: A4; margin: 0 }`, az oldal belső margója 44px 48px, fehér háttér. A nyomtatásban nem lehet nagy sötét felület, a szövegek legalább `#3F4F61`, a vonalak legalább 1px, fekete-fehérben is olvashatónak kell lennie. A betűméret legalább 12px.

**Egy oldal (egy nap) felépítése:**
1. Fejléc: "TrainingBoost" (Training navy, Boost `#0B7566`), jobbra "trainingboost.hu".
2. A nap címe h1-ként (pl. "A program"), alatta a terv címe és "N. hét".
3. Kitöltő sor: "Hét: ____" és "Dátum: ____" (vonallal).
4. Segédszöveg: "Írd a mezőkbe a valós értéket: kg × ismétlés."
5. **Táblázat** oszlopai: Gyakorlat | Sor. | Ismétlés | Ellenállás | 1. | 2. | 3. ... A beírómezők száma a nap legtöbb sorozatához igazodik (legalább 3, legfeljebb 5). Ahol a gyakorlatnak kevesebb sorozata van, a felesleges mezők csíkozott kitöltést kapnak. A Gyakorlat cella alatt, kis betűvel a `note`, ha van.
6. Szakaszsorok: szürke (`#E9EDF1`) háttér, nagybetűs, a táblázat teljes szélességében. Szuperszett: a gyakorlat neve előtt `A1`/`A2` jelölő, 4px vastag bal oldali vonal, és a szakaszsor jobb oldalán "A1 + A2: szuperszett, szünet nélkül".
7. Alul egy "Jegyzet" mező (kb. 76px magas, kerettel), lábléc: "TrainingBoost · {nap címe}" és "oldal / összes".
8. A táblázat sorai ne törjenek ketté (`break-inside: avoid`). Ha egy nap mégsem fér el egy oldalon, folytatódjon a következőn.

## 5. Ellenőrzés

- `npm run build` hibátlanul fusson.
- Kézi teszt a `teszt-kod-trainingboost-2026-a1` linken: szakaszok összecsukása, a szuperszett a B napon, a pipa kitölti a sort és mentődik, frissítés után megmarad, az előző alkalom értéke látszik, a részletek képernyő működik, a PDF nézet A és B oldalt mutat, a böngésző nyomtatási előnézete két A4 oldalt ad.
- A végén foglald össze, mely fájlokat hoztad létre vagy módosítottad, és mit nem tudtál megoldani.
