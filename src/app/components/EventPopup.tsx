import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Gift, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import flyerImage from '../../imports/morning-boost-szulinap.jpg';

// Az esemény kezdetekor a felugró ablak és a gomb is magától eltűnik, utána ez a fájl törölhető.
const EVENT_START = new Date('2026-11-14T07:00:00+01:00');
export const EVENT_DAY = new Date(2026, 10, 14);
const SEEN_KEY = 'tb-morning-boost-szulinap-seen';

function isUpcoming() {
  return Date.now() < EVENT_START.getTime();
}

function shouldShow() {
  if (!isUpcoming()) return false;
  try {
    return !sessionStorage.getItem(SEEN_KEY);
  } catch {
    return true;
  }
}

function FlyerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const goingToForm = useRef(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* A szélességet a képernyő magassága is korlátozza, hogy a plakát és a gomb mindig kiférjen. */}
      <DialogContent
        className="w-[min(28rem,calc(100vw-2rem),calc((100dvh-7rem)*0.766))] max-w-none gap-0 overflow-hidden rounded-2xl border-0 p-0 sm:max-w-none [&>button:last-child]:hidden"
        onCloseAutoFocus={(e) => {
          if (!goingToForm.current) return;
          goingToForm.current = false;
          // a fókusz visszaadása visszagörgetne az ablakot megnyitó gombhoz
          e.preventDefault();
          document.getElementById('apply')?.scrollIntoView();
        }}
      >
        <DialogTitle className="sr-only">Morning Boost születésnapi nyílt edzés</DialogTitle>
        <DialogDescription className="sr-only">
          Ingyenes, előzetes regisztrációval. November 14., szombat 07:00, Vác, Black Door Fitness.
        </DialogDescription>
        <img
          src={flyerImage}
          alt="A Morning Boost születésnapi nyílt edzés plakátja"
          width={1095}
          height={1429}
          className="block h-auto w-full"
        />
        <div className="p-3">
          <Link
            to="/morning-boost#apply"
            state={{ eventPreset: true }}
            onClick={() => {
              goingToForm.current = true;
              onOpenChange(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-[var(--shadow-elegant)] transition hover:shadow-[var(--shadow-glow)]"
          >
            Jelentkezés
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
        <DialogClose
          aria-label="Bezárás"
          className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
        >
          <X className="h-5 w-5" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export function EventPopup() {
  const [open, setOpen] = useState(shouldShow);

  useEffect(() => {
    if (!open) return;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // privát módban a tároló hiányozhat, ilyenkor újra megjelenik
    }
  }, [open]);

  return <FlyerDialog open={open} onOpenChange={setOpen} />;
}

export function EventBanner() {
  const [open, setOpen] = useState(false);

  if (!isUpcoming()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-5 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-950 shadow-lg shadow-orange-500/40 transition hover:-translate-y-0.5 hover:bg-orange-400 sm:text-sm"
      >
        <Gift className="h-4 w-4 shrink-0" />
        Szülinapi ingyenes edzés - November 14
      </button>
      <FlyerDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
