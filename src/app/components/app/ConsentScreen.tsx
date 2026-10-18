import { useState } from 'react';
import { toast } from 'sonner';
import { useSession } from './session';

// FIGYELEM: munkaszöveg, az adatvédelmi szövegek (terv 10/5. lépés) véglegesítése még hátravan.
export default function ConsentScreen() {
  const { acceptConsent, declineConsent } = useSession();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    setBusy(true);
    try {
      await acceptConsent();
    } catch {
      toast.error('A hozzájárulást most nem sikerült rögzíteni. Próbáld újra.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-white"
    >
      <div className="mx-auto flex min-h-full max-w-md flex-col px-4 py-8">
        <h2 id="consent-title" className="text-2xl font-bold text-app-navy">
          Adatkezelési hozzájárulás
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-app-navy/80">
          Mielőtt rögzítenéd az első edzésadatodat, kérjük, olvasd el, mit és miért tárolunk.
        </p>

        <ul className="mt-5 space-y-3 border-y border-app-navy/15 py-5 text-sm leading-relaxed text-app-navy/90">
          <li>
            <strong>Mit tárolunk:</strong> az általad megadott súlyokat, ismétlésszámokat, az
            elvégzett edzések tényét és a jegyzeteidet.
          </li>
          <li>
            <strong>Miért:</strong> hogy lásd a haladásodat és az előző alkalom értékeit.
          </li>
          <li>
            <strong>Hol:</strong> az adatok az Európai Unión belül (Frankfurt) tárolódnak, a
            hozzáférés a titkos linkeddel történik.
          </li>
          <li>
            <strong>Törlés:</strong> a hozzájárulást bármikor visszavonhatod, és minden adatodat
            törölheted a Beállítások → „Adataim törlése” menüben.
          </li>
        </ul>

        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-app-navy">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-app-teal"
          />
          <span>Elolvastam, és hozzájárulok az adataim fenti célú kezeléséhez.</span>
        </label>

        <div className="mt-auto space-y-3 pt-8">
          <button
            type="button"
            onClick={accept}
            disabled={!agreed || busy}
            className="h-12 w-full rounded-lg bg-app-navy text-base font-semibold text-white transition disabled:opacity-40"
          >
            {busy ? 'Mentés…' : 'Elfogadom és folytatom'}
          </button>
          <button
            type="button"
            onClick={declineConsent}
            disabled={busy}
            className="h-12 w-full rounded-lg border border-app-navy/25 text-base text-app-navy"
          >
            Most nem
          </button>
        </div>
      </div>
    </div>
  );
}
