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

/**
 * Közösségi appok beépített böngészője (Instagram, Facebook, Messenger, TikTok stb.). Innen nem lehet
 * a főképernyőhöz adni, és a tárolt adatok sem közösek a Safarival / Chrome-mal.
 * Visszaadja az app nevét, vagy null-t, ha rendes böngészőben vagyunk.
 */
export function inAppBrowser(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN\/Messenger|MessengerForiOS|Orca-Android/i.test(ua)) return 'Messenger';
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'Facebook';
  if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return 'TikTok';
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn';
  if (/\bLine\//i.test(ua)) return 'LINE';
  if (/GSA\//i.test(ua)) return 'Google app';
  return null;
}

export const isIos = () =>
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
