import { useState, useSyncExternalStore } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { useSession } from '../components/app/session';
import { usePrefs, type HrMode, type ThemePref } from '../components/app/prefs';
import { CalendarReminderCard } from '../components/app/CalendarReminderCard';
import { canPromptInstall, inAppBrowser, isStandalone, promptInstall, subscribeInstall } from '../components/app/install-prompt';
import { InAppBrowserNote } from '../components/app/InAppBrowserNote';

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Világos' },
  { value: 'dark', label: 'Sötét' },
  { value: 'system', label: 'Mint a telefon' },
];

const HR_MODES: { value: HrMode; label: string }[] = [
  { value: 'auto', label: 'Ahol az edző kéri' },
  { value: 'always', label: 'Mindenhol' },
  { value: 'never', label: 'Sehol' },
];

export default function AppSettings() {
  const { deleteMyData, code } = useSession();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const canInstall = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false);
  const installed = isStandalone();
  const link = code ? `${window.location.origin}/app/t/${code}` : null;
  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('A másolás nem sikerült. Jelöld ki a linket, és másold kézzel.');
    }
  };
  const { theme, setTheme, restTimer, setRestTimer, defaultRest, setDefaultRest, hrMode, setHrMode, milestones, setMilestones } =
    usePrefs();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await deleteMyData();
    } catch {
      toast.error('A törlés nem sikerült. Próbáld újra.');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/app" className="inline-flex items-center text-sm text-app-navy/70">
        <ChevronLeft className="size-4" /> Vissza
      </Link>
      <h1 className="text-2xl font-bold">Beállítások</h1>

      <section className="space-y-3 border border-app-navy/15 p-4">
        <h2 className="font-semibold">Megjelenés</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Téma">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={theme === t.value}
              onClick={() => setTheme(t.value)}
              className={`min-h-11 rounded-[10px] border px-2 text-sm font-semibold ${
                theme === t.value ? 'border-app-teal bg-app-mint text-app-ink' : 'border-app-line'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2 border border-app-navy/15 p-4">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block font-semibold">Pihenőidő-számláló</span>
            <span className="block text-sm text-app-navy/70">
              Egy sorozat kipipálása után visszaszámol a pihenőből. Az utolsó 5 másodpercben csippan, és amíg számol, a
              képernyő nem alszik el. iPhone-on a néma kapcsoló a csippanást is elnémítja.
            </span>
          </span>
          <input
            type="checkbox"
            checked={restTimer}
            onChange={(e) => setRestTimer(e.target.checked)}
            className="size-6 shrink-0 accent-[var(--color-app-teal)]"
          />
        </label>
        {restTimer && (
          <div className="pt-2">
            <p className="text-sm font-semibold">Alap pihenő</p>
            <p className="text-sm text-app-navy/70">Ha az edzéstervben egy gyakorlatnál nincs megadva pihenő, ennyivel számol.</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Alap pihenő">
              {[
                { v: 0, l: 'Nincs' },
                { v: 60, l: '60 mp' },
                { v: 90, l: '90 mp' },
                { v: 120, l: '2 perc' },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={defaultRest === o.v}
                  onClick={() => setDefaultRest(o.v)}
                  className={`h-11 rounded-[10px] border text-sm font-semibold ${
                    defaultRest === o.v ? 'border-app-teal bg-app-mint text-app-ink' : 'border-app-line text-app-navy/70'
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="border border-app-navy/15 p-4">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block font-semibold">Mérföldkövek</span>
            <span className="block text-sm text-app-navy/70">
              A Haladás oldalon a mérföldkövek listája, és gratuláció, amikor elérsz egyet.
            </span>
          </span>
          <input
            type="checkbox"
            checked={milestones}
            onChange={(e) => setMilestones(e.target.checked)}
            className="size-6 shrink-0 accent-[var(--color-app-teal)]"
          />
        </label>
      </section>

      <section className="space-y-3 border border-app-navy/15 p-4">
        <div>
          <h2 className="font-semibold">Pulzus rögzítése</h2>
          <p className="text-sm text-app-navy/70">
            A sorozatok mellett egy pulzus mező: ide írhatod, amit az órád a sorozat végén mutat.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Pulzus mező">
          {HR_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={hrMode === m.value}
              onClick={() => setHrMode(m.value)}
              className={`min-h-11 rounded-[10px] border px-2 text-sm font-semibold ${
                hrMode === m.value ? 'border-app-teal bg-app-mint text-app-ink' : 'border-app-line'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <CalendarReminderCard />

      <section className="space-y-3 border border-app-navy/15 p-4">
        <h2 className="font-semibold">Telepítés a telefonra</h2>
        <p className="text-sm leading-relaxed text-app-navy/80">
          Így a kezdőképernyőről, saját ikonnal, egy koppintással nyílik meg az edzésnaplód. Ha egyszer már megnyitottad,
          térerő nélkül is működik: a terem pincéjében is rögzítheted a sorozatokat, és amint újra van net, a telefon
          elküldi őket.
        </p>
        {installed ? (
          <p className="text-sm font-semibold text-app-teal">Már a kezdőképernyőről használod.</p>
        ) : (
          canInstall && (
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="h-11 w-full rounded-lg bg-app-teal text-sm font-semibold text-white"
            >
              Telepítés most
            </button>
          )
        )}
        {code && inAppBrowser() && <InAppBrowserNote link={`${window.location.origin}/app/t/${code}?telepites=1`} />}
        <div className="space-y-1 text-sm leading-relaxed text-app-navy/80">
          <p>
            <span className="font-semibold text-app-navy">iPhone (Safari):</span> koppints az alábbi gombra, majd a
            címsor melletti ••• gomb → <em>Megosztás</em> → <em>Főképernyőhöz adás</em> (régebbi iPhone-on közvetlenül a
            Megosztás gomb, négyzet felfelé nyíllal).
          </p>
          <p>
            <span className="font-semibold text-app-navy">Android (Chrome):</span> a jobb felső ⋮ menü →{' '}
            <em>Alkalmazás telepítése</em> vagy <em>Hozzáadás a kezdőképernyőhöz</em>.
          </p>
        </div>
        {code && (
          <button
            type="button"
            onClick={() => navigate(`/app/t/${code}?telepites=1`)}
            className="h-11 w-full rounded-lg border border-app-teal text-sm font-semibold text-app-teal"
          >
            Előkészítés iPhone-ra
          </button>
        )}
      </section>

      {link && (
        <section className="space-y-3 border border-app-navy/15 p-4">
          <h2 className="font-semibold">A saját linked</h2>
          <p className="text-sm leading-relaxed text-app-navy/80">
            Ezzel a linkkel nyithatod meg az edzésnaplódat másik telefonon vagy gépen. Ne oszd meg mással: aki ismeri, az
            látja és módosíthatja a naplódat.
          </p>
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Saját link"
            className="h-11 w-full rounded-[10px] border border-app-line bg-white px-3 font-mono text-xs text-app-navy"
          />
          <button
            type="button"
            onClick={() => void copyLink()}
            className="h-11 w-full rounded-lg bg-app-navy text-sm font-semibold text-white"
          >
            {copied ? 'Másolva ✓' : 'Link másolása'}
          </button>
        </section>
      )}

      <section className="space-y-2 border border-app-navy/15 p-4">
        <h2 className="font-semibold">Adatkezelés</h2>
        <p className="text-sm leading-relaxed text-app-navy/80">
          Az edzésnaplódat (súlyok, ismétlések, jegyzetek) kizárólag a te edzéseid követésére tároljuk,
          az Európai Unión belül. A hozzájárulásodat bármikor visszavonhatod az adataid törlésével.
        </p>
      </section>

      <section className="space-y-3 border border-app-navy/15 p-4">
        <h2 className="font-semibold">Adataim törlése</h2>
        <p className="text-sm leading-relaxed text-app-navy/80">
          Végleg törli az összes naplóadatodat és a hozzáférésedet is. Ez nem visszavonható.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={busy}
              className="h-12 w-full rounded-lg border border-red-700 text-base font-semibold text-red-700 disabled:opacity-50 dark:border-red-400 dark:text-red-400"
            >
              Adataim törlése
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Biztosan törlöd az adataidat?</AlertDialogTitle>
              <AlertDialogDescription>
                Minden naplózott edzésed és a hozzáférésed is megszűnik, a linked nem fog működni.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Mégsem</AlertDialogCancel>
              <AlertDialogAction onClick={remove}>Igen, törlöm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
