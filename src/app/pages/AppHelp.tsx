// „Hogyan használd”: az edzésnapló használata témánként, lenyitható részekben. Bármikor elérhető
// (fejléc ? ikon, Beállítások). A kis minták az app saját elemeinek egyszerűsített másai.
import { Link } from 'react-router-dom';
import { Check, ChevronDown, ChevronLeft, Pause, Play, Share2, Square, Timer, X } from 'lucide-react';

function Topic({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-[14px] border border-app-line">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-5 shrink-0 text-app-navy/50 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-3 border-t border-app-line px-4 py-3 text-sm leading-relaxed text-app-navy/90">{children}</div>
    </details>
  );
}

const Ul = ({ children }: { children: React.ReactNode }) => <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;

/** Minta: egy sorozat-sor (szürke javaslat, kész sor). */
function SetRowSample() {
  const box = 'flex h-10 items-center justify-center rounded-[10px] border text-base';
  return (
    <div aria-hidden className="space-y-1 rounded-[12px] bg-app-navy/[0.03] p-2">
      <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_3.5rem_3rem_2.5rem] items-center gap-1.5 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-app-muted">
        <span>Sor</span>
        <span>Előző</span>
        <span className="text-center">Kg</span>
        <span className="text-center">Ism.</span>
        <span className="text-center">✓</span>
      </div>
      <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_3.5rem_3rem_2.5rem] items-center gap-1.5 rounded-[10px] border border-app-teal/40 bg-app-mint px-1.5 py-1">
        <span className="text-center text-sm font-semibold text-app-muted">1</span>
        <span className="text-[11px] text-app-muted">15 kg × 12</span>
        <span className={`${box} border-app-line bg-white`}>16</span>
        <span className={`${box} border-app-line bg-white`}>12</span>
        <span className={`${box} border-app-teal bg-app-teal text-white`}>
          <Check className="size-4" strokeWidth={3} />
        </span>
      </div>
      <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_3.5rem_3rem_2.5rem] items-center gap-1.5 px-1.5 py-1">
        <span className="text-center text-sm font-semibold text-app-muted">2</span>
        <span className="text-[11px] text-app-muted underline decoration-dotted">15 kg × 12</span>
        <span className={`${box} border-app-line bg-white text-app-navy/30`}>16</span>
        <span className={`${box} border-app-line bg-white text-app-navy/30`}>12</span>
        <span className={`${box} border-app-line bg-white text-app-navy/30`}>
          <Check className="size-4" strokeWidth={3} />
        </span>
      </div>
    </div>
  );
}

/** Minta: az alsó számláló-sáv időmérés közben. */
function TimerSample() {
  return (
    <div aria-hidden className="flex items-center gap-2 rounded-[12px] border border-app-line p-2">
      <Timer className="size-4 shrink-0 text-app-teal" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] text-app-muted">Bal oldal · Side plank</span>
        <span className="block text-lg font-bold tabular-nums text-app-teal">0:18</span>
      </span>
      <span className="flex size-9 items-center justify-center rounded-[10px] border border-app-line">
        <Pause className="size-4 fill-current" />
      </span>
      <span className="inline-flex h-9 items-center gap-1 rounded-[10px] bg-app-teal px-2 text-xs font-semibold text-white">
        <Square className="size-3 fill-current" /> Oldal kész
      </span>
      <span className="flex size-9 items-center justify-center rounded-[10px] border border-app-line">
        <X className="size-4" />
      </span>
    </div>
  );
}

export default function AppHelp() {
  return (
    <div className="space-y-5">
      <div>
        <Link to="/app" className="-ml-1 inline-flex min-h-11 items-center pr-3 text-sm text-app-navy/70">
          <ChevronLeft className="size-4" /> Vissza
        </Link>
        <h1 className="text-2xl font-bold">Hogyan használd</h1>
        <p className="mt-1 text-sm text-app-muted">Koppints egy témára a részletekért.</p>
      </div>

      <div className="space-y-2">
        <Topic title="Az első lépések" open>
          <Ul>
            <li>A naplót a saját linkeddel nyitod meg. A link a tiéd, ne add tovább.</li>
            <li>
              Tedd ki a telefonod kezdőképernyőjére, így appként indul: <b>Beállítások → Telepítés a telefonra</b>. Ott a saját
              linked is megvan, ha új telefonon kell.
            </li>
            <li>A kezdőlapon a <b>Következő</b> gomb a soron következő edzésnapodra visz, alatta a hetek. A fejlécben: Program, Naptár, Haladás, Beállítások és ez a súgó.</li>
          </Ul>
        </Topic>

        <Topic title="Egy edzésnap felépítése">
          <Ul>
            <li>
              Az edzésnap szakaszokból áll (pl. bemelegítés, fő rész, core). A szakasz címére koppintva összecsukható.
            </li>
            <li>
              A gyakorlat alatt az <b>előírás</b>: sorozat, ismétlés vagy idő, ellenállás, pihenő. Ha van hozzá videó vagy leírás, a
              gyakorlat nevére koppintva nyílik meg.
            </li>
            <li>
              <b>A1, A2…</b> jelölés: szuperszett vagy kör. Ilyenkor váltva csinálod őket (A1 1. sorozat → A2 1. sorozat → A1 2.
              sorozat…), és csak a kör végén pihensz.
            </li>
          </Ul>
        </Topic>

        <Topic title="Sorozat rögzítése">
          <SetRowSample />
          <Ul>
            <li>
              A <b>szürke szám</b> a javaslat: a terv szerinti érték, ha az nincs, a mai előző sorozatod vagy a múltkori. Ha
              annyit csináltál, csak koppints a <b>✓</b>-re, és elmentődik.
            </li>
            <li>Ha mást csináltál, írd be a súlyt és az ismétlést, aztán ✓.</li>
            <li>
              Az <b>Előző</b> oszlopban a múltkori sorozatod; rákoppintva beíródik. A <b>Mint múltkor</b> gomb az összes üres sort
              kitölti.
            </li>
            <li>
              A sorozatokat sorban pipáld ki. Kész sorozatot visszavonni a ✓-re koppintva lehet, mindig az utolsót. Kész sor értékét
              egyszerűen írd át, magától menti.
            </li>
            <li>
              Saját testsúlyos gyakorlatnál a <b>+KG</b> a plusz súly; segítséghez (gumikötél, gép) negatív szám, pl. −20.
            </li>
            <li>
              <b>Megjegyzés:</b> a sorozat számára koppintva. Gyors címkék: <i>nem szabályos</i> (nem számít rekordnak),{' '}
              <i>segítséggel</i>, <i>fájt</i>. Az edződ látja őket.
            </li>
            <li>
              Ahol az edződ kéri (pl. kondis gyakorlatnál), a sorban <b>pulzus</b> mező is van: a sorozat végi pulzusod. A
              Beállításokban mindenhol be- vagy kikapcsolhatod.
            </li>
          </Ul>
        </Topic>

        <Topic title="Pihenő">
          <Ul>
            <li>A ✓ után alul elindul a pihenő-számláló. Az utolsó 5 másodpercben csippan, a végén hosszabban.</li>
            <li>A <b>−15 / +15</b> gombbal rövidítheted vagy nyújthatod, az <b>X</b>-szel bezárod.</li>
            <li>Szuperszett vagy kör közepén nincs pihenő, rögtön jön a következő gyakorlat.</li>
            <li>Ha a tervben nincs megadva pihenő, a Beállításokban megadott alap pihenővel számol (ott ki is kapcsolható).</li>
            <li>Ha közben máshová lépsz az appban, az alsó sávra koppintva visszajutsz az edzéshez.</li>
          </Ul>
        </Topic>

        <Topic title="Időre menő gyakorlatok (pl. plank)">
          <TimerSample />
          <Ul>
            <li>
              A sor végén a <Play className="inline size-3.5 fill-current align-[-2px]" /> gomb indítja: 3 másodperc
              felkészülés, aztán a visszaszámlálás. A végén magától mentődik.
            </li>
            <li>
              <b>Kétoldalas gyakorlat</b> (pl. „30-30 mp”): bal oldal, 3 mp oldalváltás, jobb oldal. Az <b>Oldal kész</b> lezárja az
              oldalt annyival, amennyit kitartottál, és jön a másik; az utolsón <b>Kész</b>. Ha a két oldal eltér, a sorozat
              megjegyzésébe beíródik, pl. „bal 30, jobb 22 mp”.
            </li>
            <li>
              <Pause className="inline size-3.5 fill-current align-[-2px]" /> szünet és folytatás; <b>X</b>: megszakítás mentés
              nélkül.
            </li>
            <li>Időmérés nélkül: koppints az üres Mp mezőbe, beíródik a tervezett idő (átírható), aztán ✓.</li>
          </Ul>
        </Topic>

        <Topic title="Edzés indítása és lezárása">
          <Ul>
            <li>
              Az <b>Edzés indítása</b> gombbal indul az óra. Ha elfelejted, az első kipipált sorozatnál magától elindul.
            </li>
            <li>
              Edzés közben az app tetején az <b>Edzés folyamatban</b> sáv mutatja az eltelt időt, és bárhonnan visszavisz.
            </li>
            <li>
              A nap alján: <b>milyen nehéz volt</b> (1–5), <b>jegyzet</b> (hogy ment, fájt-e valami), aztán <b>Edzés kész</b>. Ha
              rég indítottad, megkérdezi, mikor fejezted be.
            </li>
            <li>
              Az edzésidő 10 perc és 5 óra között számít. Ha utólag rögzítesz (más napra állított dátummal), csak a dátum számít.
            </li>
            <li>
              <b>Újra elvégzem:</b> egy kész nap alján. A nap üres lappal indul, az eddigi edzés megmarad, és az{' '}
              <b>Előző</b> oszlopban a legutóbbi eredményeid látszanak. Így bármelyik napot (vagy az egész programot) megismételheted.
              Ha meggondoltad magad, a nap tetején a <b>Mégse</b> visszavonja.
            </li>
            <li>
              Rosszul rögzített edzés: a nap alján <b>Edzés törlése</b> (ismétlésnél csak az aktuális alkalom törlődik). Internet kell
              hozzá.
            </li>
          </Ul>
        </Topic>

        <Topic title="Naptár és korábbi edzések">
          <Ul>
            <li>A naptárban a pötty jelzi az edzésnapot (teli: kész, üres: elkezdett). A napra koppintva megnyílik az edzés.</li>
            <li>Felül: edzések ebben a hónapban, összesen, és hány hete edzel egymás után.</li>
            <li>Alul a <b>korábbi edzések</b> listája: dátum, nap, kezdés–vége, időtartam, nehézség.</li>
          </Ul>
        </Topic>

        <Topic title="Haladás">
          <Ul>
            <li>Gyakorlatonként a legjobb sorozatod, az alkalmak száma és egy grafikon.</li>
            <li>
              <b>Összesítő táblázat:</b> hetek oszlopokban, zöld, ha több, mint előző héten, piros, ha kevesebb. Excelbe is letölthető.
            </li>
            <li><b>Mérföldkövek:</b> az elért és a következő célok. A Beállításokban kikapcsolhatók.</li>
            <li><b>Testsúly:</b> heti egy mérés, grafikonnal.</li>
          </Ul>
        </Topic>

        <Topic title="Megosztás">
          <Ul>
            <li>
              A <Share2 className="inline size-3.5 align-[-2px]" /> <b>Megosztom</b> gomb képet készít (Instagram Story méret):
              <i> Ez a hetem</i> és a havi naptár a Naptárban, a lezárt edzés alján; az elért mérföldkövek a Haladásban.
            </li>
            <li>Előbb előnézetet látsz, aztán a telefon megosztás-menüje jön (Story, Messenger, mentés a galériába).</li>
            <li>A képen nincs neved, csak az edzéseid száma és ideje.</li>
          </Ul>
        </Topic>

        <Topic title="Internet nélkül">
          <Ul>
            <li>Térerő nélkül is rögzíthetsz. A módosítások a telefonon várnak, a fejléc alatti sáv mutatja, hány.</li>
            <li>Amikor visszajön a net, maguktól felmennek. Ne töröld közben a böngésző adatait.</li>
            <li>Az edzés törléséhez internet kell.</li>
          </Ul>
        </Topic>

        <Topic title="Beállítások">
          <Ul>
            <li><b>Megjelenés:</b> világos, sötét vagy mint a telefon.</li>
            <li><b>Pihenőidő-számláló</b> be/ki és az <b>alap pihenő</b>.</li>
            <li><b>Mérföldkövek</b> be/ki.</li>
            <li><b>Pulzus rögzítése:</b> ahol az edző kéri, mindenhol, vagy sehol.</li>
            <li><b>Edzésnapok a naptáradba</b> emlékeztetővel.</li>
            <li><b>Telepítés a telefonra</b>, <b>a saját linked</b>, és az <b>adataid törlése</b>.</li>
          </Ul>
        </Topic>
      </div>

      <p className="text-sm text-app-muted">
        Kérdésed van? Írj a jegyzetbe vagy a sorozat megjegyzésébe, az edződ látja. Sürgős dologban keresd közvetlenül.
      </p>
    </div>
  );
}
