/**
 * Android/Chrome telepítési ajánlat elkapása: a böngésző egyszer jelzi (beforeinstallprompt), hogy az app
 * telepíthető; ezt eltesszük, és a Beállításokban egy gombbal felkínáljuk. iPhone-on ilyen nincs,
 * ott a Megosztás → Főképernyőhöz adás útmutató marad.
 */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function canPromptInstall() {
  return deferred !== null;
}

export function subscribeInstall(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Felkínálja a telepítést; true, ha a felhasználó elfogadta. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  notify();
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  return outcome === 'accepted';
}

/** Már a kezdőképernyőről, önálló ablakban fut-e. */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
