// Sütihozzájárulás: a Google Analytics csak a látogató kifejezett hozzájárulása után töltődik be.
// A döntést a böngésző tárolja (localStorage); a láblécben a „Süti-beállítások” linkkel módosítható.

const KEY = 'tb_cookie_consent';
const GA_ID = 'G-VH1HVL18W2';
const CHANGE_EVENT = 'tb-consent-open';

export type Consent = 'granted' | 'denied';

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

/** Az /app/t/<kód> link titkos részét elrejtjük, hogy ne kerüljön a mérésbe. */
const hideCode = (u: string) => String(u || '').replace(/(\/app\/t\/)[^/?#]+/, '$1[kod]');

function loadAnalytics() {
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // A gtag.js az arguments objektumot várja.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    page_location: hideCode(location.href),
    page_referrer: hideCode(document.referrer),
  });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

/** Induláskor: ha korábban hozzájárult, betöltjük a mérést. */
export function initAnalytics() {
  if (getConsent() === 'granted') loadAnalytics();
}

export function setConsent(value: Consent) {
  const previous = getConsent();
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* privát mód: csak erre a látogatásra érvényes */
  }
  if (value === 'granted') {
    loadAnalytics();
  } else if (previous === 'granted') {
    // Visszavont hozzájárulás: a már betöltött mérőkódot és sütijeit csak újratöltéssel lehet eltávolítani.
    for (const c of document.cookie.split(';')) {
      const name = c.split('=')[0].trim();
      if (name.startsWith('_ga')) {
        const domain = location.hostname.replace(/^www\./, '');
        document.cookie = `${name}=; Max-Age=0; path=/`;
        document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
      }
    }
    location.reload();
  }
}

/** A sütisáv újbóli megnyitása (lábléc link). */
export function openConsentSettings() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onConsentSettingsOpen(fn: () => void) {
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}
