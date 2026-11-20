import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useMatch } from 'react-router-dom';
import { CalendarDays, Settings, TrendingUp } from 'lucide-react';
import ConsentScreen from './ConsentScreen';
import { PrefsProvider, usePrefs } from './prefs';
import { RestTimerProvider } from './RestTimer';
import { SessionProvider, useSession } from './session';

// 2. Az /app oldalak: noindex + no-referrer (az index.html korán beteszi, itt SPA-navigációra is biztosítjuk).
function useAppHead() {
  useEffect(() => {
    const created: HTMLMetaElement[] = [];
    const ensure = (name: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.name = name;
        document.head.appendChild(el);
        created.push(el);
      }
      el.content = content;
    };
    ensure('robots', 'noindex, nofollow');
    ensure('referrer', 'no-referrer');
    const prevTitle = document.title;
    document.title = 'Edzésnapló — TrainingBoost';
    return () => {
      created.forEach((el) => el.remove());
      document.title = prevTitle;
    };
  }, []);
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-app-navy/15 p-6 text-center">
      <h1 className="text-xl font-bold text-app-navy">{title}</h1>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-app-navy/80">{children}</div>
    </div>
  );
}

// bare: a nyomtatási nézet teljes szélességű, ezért csak a hiba/állapot üzenetek kapnak keskeny keretet
function Gate({ bare = false }: { bare?: boolean }) {
  const { status, errorKind, reload, consentOpen } = useSession();

  let body: React.ReactNode;
  switch (status) {
    case 'ready':
      body = <Outlet />;
      break;
    case 'loading':
      body = <p className="py-16 text-center text-sm text-app-navy/60">Betöltés…</p>;
      break;
    case 'invalid':
      body = (
        <Message title="Ez a link nem érvényes">
          <p>Lehet, hogy elgépelődött, vagy a hozzáférést visszavonták.</p>
          <p>
            Ellenőrizd az e-mailben kapott linket, vagy{' '}
            <Link to="/contact" className="font-semibold text-app-teal underline">
              írj Zolinak
            </Link>
            .
          </p>
        </Message>
      );
      break;
    case 'deleted':
      body = (
        <Message title="Az adataidat töröltük">
          <p>A naplóadataid és a hozzáférésed megszűnt. Köszönjük, hogy edzettél velünk!</p>
        </Message>
      );
      break;
    case 'error':
      body = (
        <Message
          title={
            errorKind === 'not_configured'
              ? 'Az edzésnapló még nincs beállítva'
              : errorKind === 'network'
                ? 'Nem érjük el a szervert'
                : 'Nem sikerült betölteni'
          }
        >
          {errorKind === 'not_configured' ? (
            <p>Az oldal beállítása hiányos (adatbázis-kapcsolat). Ez nem a te hibád: szólj Zolinak.</p>
          ) : errorKind === 'network' ? (
            <>
              <p>Ellenőrizd az internetkapcsolatot, és próbáld újra.</p>
              <p className="text-xs text-app-navy/60">
                Ha van internet, és pár perc múlva sem megy, a szerver éppen indul vagy karbantartás alatt van. Ha tartósan így
                marad, írj Zolinak.
              </p>
            </>
          ) : (
            <p>Váratlan hiba történt. Próbáld újra; ha nem megy, írj Zolinak.</p>
          )}
          <button
            type="button"
            onClick={reload}
            className="h-11 rounded-lg bg-app-navy px-6 font-semibold text-white"
          >
            Újrapróbálom
          </button>
        </Message>
      );
      break;
    default:
      body = (
        <Message title="Nyisd meg a linkedet">
          <p>Az edzéstervedhez az e-mailben kapott személyes linkkel férhetsz hozzá.</p>
        </Message>
      );
  }

  return (
    <>
      {bare && status !== 'ready' ? <div className="mx-auto max-w-md px-4 py-6">{body}</div> : body}
      {consentOpen && <ConsentScreen />}
    </>
  );
}

function HeaderLink({ to, label, children }: { to: string; label: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      title={label}
      className={({ isActive }) =>
        `flex size-10 items-center justify-center rounded-[10px] ${isActive ? 'bg-app-mint text-app-ink' : 'text-app-navy/70'}`
      }
    >
      {children}
    </NavLink>
  );
}

function Frame() {
  const { dark } = usePrefs();
  const { status } = useSession();
  const { pathname } = useLocation();
  // Új oldalra lépve a lap tetejéről induljunk (különben pl. a hosszú edzésnapról a részletekre lépve
  // az új oldal is legörgetve nyílna meg).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  // /app/print/:week: fejléc és keskeny oszlop nélkül, hogy a nyomtatás A4-es oldalakat adjon.
  // A nyomtatás mindig világos (papírra készül).
  const printView = useMatch('/app/print/:week') !== null;
  if (printView) {
    return (
      <div className="min-h-screen bg-white text-app-navy">
        <Gate bare />
      </div>
    );
  }
  return (
    <div className={`min-h-screen bg-white text-app-navy ${dark ? 'app-dark dark' : ''}`}>
      <RestTimerProvider>
        <header className="sticky top-0 z-30 border-b border-app-navy/15 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
            <Link to="/app" className="text-base font-bold tracking-tight">
              Training<span className="text-app-teal">Boost</span>
            </Link>
            <nav className="flex items-center gap-1" aria-label="Fő menü">
              {status === 'ready' && (
                <>
                  <HeaderLink to="/app/naptar" label="Naptár">
                    <CalendarDays className="size-5" />
                  </HeaderLink>
                  <HeaderLink to="/app/haladas" label="Haladás">
                    <TrendingUp className="size-5" />
                  </HeaderLink>
                </>
              )}
              <HeaderLink to="/app/settings" label="Beállítások">
                <Settings className="size-5" />
              </HeaderLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-md px-4 pb-28 pt-6">
          <Gate />
        </main>
      </RestTimerProvider>
    </div>
  );
}

export default function AppShell() {
  useAppHead();
  return (
    <SessionProvider>
      <PrefsProvider>
        <Frame />
      </PrefsProvider>
    </SessionProvider>
  );
}
