import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, ChevronDown, RefreshCw } from 'lucide-react';
import { fetchPublicPass, type PassResult } from '../../lib/tracker';
import { buildPassHistory, formatDateHu } from '../../lib/pass-history';

// A Morning Boost tag saját bérlete: trainingboost.hu/berlet/<kód>. A kódot a tracker „Saját link” gombja adja.
// Nem jelenik meg a keresőkben (index.html: noindex), és a kód nem kerül a mérésbe (consent.ts).

function useHead() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Morning Boost bérlet — TrainingBoost';
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !robots;
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    const prev = robots.content;
    robots.content = 'noindex, nofollow';
    return () => {
      document.title = prevTitle;
      if (created) robots!.remove();
      else robots!.content = prev;
    };
  }, []);
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-white text-app-navy">
      <div className="mx-auto max-w-md px-5 pb-16 pt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-app-ink">Morning Boost · Black Door Fitness</p>
        {children}
        <p className="mt-10 text-center text-xs text-app-muted">
          Kérdésed van? Szólj edzésen, vagy írj:{' '}
          <Link to="/contact" className="underline">
            kapcsolat
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function PassPage() {
  useHead();
  const { token = '' } = useParams();
  const [result, setResult] = useState<PassResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchPublicPass(token).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  if (!result) {
    return (
      <Shell>
        <p className="py-16 text-center text-sm text-app-muted">Betöltés…</p>
      </Shell>
    );
  }

  if (result.kind !== 'ok') {
    return (
      <Shell>
        <div className="mt-6 border border-app-line p-6 text-center">
          <h1 className="text-xl font-bold">{result.kind === 'invalid' ? 'Ez a link nem érvényes' : 'Most nem sikerült betölteni'}</h1>
          <p className="mt-3 text-sm leading-relaxed text-app-muted">
            {result.kind === 'invalid'
              ? 'Lehet, hogy elírás van benne, vagy Zoli új linket készített. Kérj tőle újat.'
              : 'Ellenőrizd az internetkapcsolatot, és próbáld újra.'}
          </p>
          {result.kind === 'error' && (
            <button
              onClick={() => setAttempt((n) => n + 1)}
              className="mt-4 inline-flex items-center gap-2 bg-app-navy px-4 py-2 text-sm font-semibold text-white"
            >
              <RefreshCw className="h-4 w-4" /> Újra
            </button>
          )}
        </div>
      </Shell>
    );
  }

  const p = result.pass;
  const blocks = buildPassHistory(
    { passesRemaining: p.passes_remaining, totalPasses: p.total_passes, debt: p.debt },
    p.dates,
    p.renewal_dates
  );
  const current = blocks.find((b) => b.kind === 'current');
  const pending = blocks.find((b) => b.kind === 'pending');
  const past = blocks.filter((b) => b.kind === 'past');
  // „Kovács Anna” → Anna; „Kati B.” → Kati
  const words = p.name.trim().split(/\s+/);
  const lastWord = words[words.length - 1] ?? '';
  const firstName = lastWord.length > 2 && !lastWord.endsWith('.') ? lastWord : words[0];
  const low = p.passes_remaining <= 2;

  return (
    <Shell>
      <h1 className="mt-2 text-2xl font-bold">Szia {firstName}!</h1>

      <section className="mt-6 border border-app-line p-5">
        <p className="text-sm text-app-muted">Ennyi alkalmad maradt a bérletedből</p>
        <p className={`mt-1 text-5xl font-bold ${low ? 'text-[#c2410c]' : 'text-app-ink'}`}>
          {p.passes_remaining}
          <span className="text-2xl font-semibold text-app-muted"> / {p.total_passes}</span>
        </p>
        <div className="mt-4 flex gap-1" aria-hidden>
          {Array.from({ length: p.total_passes }, (_, i) => (
            <span
              key={i}
              className={`h-2 flex-1 ${i < p.total_passes - p.passes_remaining ? 'bg-app-teal' : 'bg-app-line'}`}
            />
          ))}
        </div>
        {p.debt > 0 && (
          <p className="mt-4 bg-[#fef3c7] px-3 py-2 text-sm text-[#92400e]">
            A bérleted elfogyott, azóta {p.debt} alkalmon voltál. Ezek az új bérletből vonódnak le.
          </p>
        )}
        {p.debt === 0 && p.passes_remaining === 0 && (
          <p className="mt-4 bg-[#fef3c7] px-3 py-2 text-sm text-[#92400e]">A bérleted elfogyott, a következő alkalomtól új kell.</p>
        )}
        {p.debt === 0 && p.passes_remaining > 0 && low && (
          <p className="mt-4 text-sm text-[#c2410c]">Hamarosan lejár, érdemes megújítani.</p>
        )}
        <p className="mt-4 text-xs text-app-muted">Összesen {p.dates.length} Morning Boost edzésen voltál. 💪</p>
      </section>

      {pending && pending.dates.length > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-bold">Bérlet nélküli alkalmak</h2>
          <DateList dates={pending.dates} renewedOn={null} />
        </section>
      )}

      {current && (
        <section className="mt-6">
          <h2 className="text-base font-bold">Jelenlegi bérlet</h2>
          {current.renewedOn && (
            <p className="mt-1 text-xs text-app-muted">Megújítva: {formatDateHu(current.renewedOn)}</p>
          )}
          {current.dates.length > 0 ? (
            <DateList dates={current.dates} renewedOn={current.renewedOn} />
          ) : (
            <p className="mt-2 text-sm text-app-muted">Ebből a bérletből még nem volt alkalom.</p>
          )}
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-bold">Korábbi bérletek</h2>
          <div className="mt-2 space-y-2">
            {past.map((b) => (
              <details key={b.number} className="group border border-app-line">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold">
                  <span>
                    {b.number}. bérlet
                    <span className="ml-2 font-normal text-app-muted">
                      {formatDateHu(b.dates[0], false)} – {formatDateHu(b.dates[b.dates.length - 1], false)}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-3 pb-3">
                  {b.renewedOn && <p className="text-xs text-app-muted">Megújítva: {formatDateHu(b.renewedOn)}</p>}
                  <DateList dates={b.dates} renewedOn={b.renewedOn} />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}

function DateList({ dates, renewedOn }: { dates: string[]; renewedOn: string | null }) {
  return (
    <ol className="mt-2 space-y-1">
      {[...dates].reverse().map((d, i) => (
        <li key={d} className="flex items-center gap-3 bg-app-mint px-3 py-2 text-sm">
          <span className="w-6 text-right text-xs font-semibold text-app-ink">{dates.length - i}.</span>
          <CalendarCheck className="h-4 w-4 text-app-ink" />
          <span className="flex-1 whitespace-nowrap">{formatDateHu(d)}</span>
          {renewedOn && d < renewedOn && <span className="text-[11px] text-app-muted">megújítás előtt</span>}
        </li>
      ))}
    </ol>
  );
}
