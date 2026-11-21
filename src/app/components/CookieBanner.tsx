import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsent, onConsentSettingsOpen, setConsent } from '../../lib/consent';

// Sütisáv: alul, a tartalmat nem takarja ki teljesen. A két gomb egyenrangú (a GDPR szerint az elutasítás
// ugyanolyan könnyű kell legyen, mint az elfogadás).
export function CookieBanner() {
  const [open, setOpen] = useState(() => getConsent() === null);

  useEffect(() => onConsentSettingsOpen(() => setOpen(true)), []);

  if (!open) return null;

  const choose = (v: 'granted' | 'denied') => {
    setOpen(false);
    setConsent(v);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:gap-6">
        <div className="flex-1 text-sm text-muted-foreground">
          <p id="cookie-title" className="font-semibold text-foreground">
            Sütik
          </p>
          <p className="mt-1">
            Az oldal működéséhez nem használok saját sütit. Ha hozzájárulsz, a Google Analytics
            látogatottsági statisztikát készít, ami segít az oldal fejlesztésében.{' '}
            <Link to="/adatkezeles#sutik" className="font-medium text-foreground underline underline-offset-4">
              Részletek
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose('denied')}
            className="flex-1 rounded-full border border-primary/20 bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-secondary md:flex-none"
          >
            Elutasítom
          </button>
          <button
            type="button"
            onClick={() => choose('granted')}
            className="flex-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 md:flex-none"
          >
            Elfogadom
          </button>
        </div>
      </div>
    </div>
  );
}
