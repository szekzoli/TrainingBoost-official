import { useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Settings } from 'lucide-react';
import ConsentScreen from './ConsentScreen';
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

function Gate() {
  const { status, reload, consentOpen } = useSession();

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
        <Message title="Nem sikerült betölteni">
          <p>Ellenőrizd az internetkapcsolatot, és próbáld újra.</p>
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
      {body}
      {consentOpen && <ConsentScreen />}
    </>
  );
}

export default function AppShell() {
  useAppHead();
  return (
    <SessionProvider>
      <div className="min-h-screen bg-white text-app-navy">
        <header className="border-b border-app-navy/15">
          <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
            <Link to="/app" className="text-base font-bold tracking-tight">
              Training<span className="text-app-teal">Boost</span>
            </Link>
            <Link to="/app/settings" aria-label="Beállítások" className="p-2 text-app-navy/70">
              <Settings className="size-5" />
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-md px-4 py-6">
          <Gate />
        </main>
      </div>
    </SessionProvider>
  );
}
