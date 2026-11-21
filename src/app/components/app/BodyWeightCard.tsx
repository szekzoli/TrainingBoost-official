// Testsúly: heti egy mérés rögzítése és a változás grafikonja (Haladás oldal).
import { useState } from 'react';
import { toast } from 'sonner';
import { Scale, Trash2 } from 'lucide-react';
import { AppApiError, type BodyWeight } from '../../../lib/app-api';
import { useSession } from './session';
import { fmtDayShort, fromIso, todayIso } from './dates';

const fmtKg = (n: number) => n.toLocaleString('hu-HU', { maximumFractionDigits: 1 });

function parseKg(v: string): number | null {
  const n = Number(v.replace(',', '.').trim());
  return Number.isFinite(n) && n >= 20 && n <= 400 ? Math.round(n * 10) / 10 : null;
}

const daysSince = (iso: string) => Math.round((fromIso(todayIso()).getTime() - fromIso(iso).getTime()) / 86_400_000);

/** Grafikon dátum szerinti tengellyel (a kimaradt hetek is arányosan látszanak). */
function WeightChart({ items }: { items: BodyWeight[] }) {
  if (items.length < 2) return null;
  const t = items.map((w) => fromIso(w.measured_on).getTime());
  const v = items.map((w) => w.weight_kg);
  const t0 = t[0];
  const tSpan = t.at(-1)! - t0 || 1;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const pad = Math.max(0.5, (max - min) * 0.15);
  const lo = min - pad;
  const span = max + pad - lo;
  const W = 300;
  const H = 110;
  const pts = items.map((_, i) => [8 + ((t[i] - t0) / tSpan) * (W - 16), 8 + (1 - (v[i] - lo) / span) * (H - 16)]);
  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full text-app-teal" role="img" aria-label="Testsúly változása">
        {[min, max].map((y) => {
          const yy = 8 + (1 - (y - lo) / span) * (H - 16);
          return (
            <g key={y}>
              <line x1="0" x2={W} y1={yy} y2={yy} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 4" />
              <text x="2" y={yy - 3} className="fill-app-muted text-[10px]">
                {fmtKg(y)}
              </text>
            </g>
          );
        })}
        <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="2.5" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="currentColor" />
        ))}
      </svg>
      <figcaption className="mt-1 flex justify-between text-[11px] text-app-muted">
        <span>{fmtDayShort(items[0].measured_on)}</span>
        <span>{fmtDayShort(items.at(-1)!.measured_on)}</span>
      </figcaption>
    </figure>
  );
}

export function BodyWeightCard() {
  const { weights, logWeight } = useSession();
  const last = weights.at(-1);
  const first = weights[0];
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayIso());
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const kg = parseKg(value);
  const since = last ? daysSince(last.measured_on) : null;
  const due = since === null || since >= 7;
  const diff = first && last && weights.length >= 2 ? Math.round((last.weight_kg - first.weight_kg) * 10) / 10 : null;

  const save = async () => {
    if (kg === null) return;
    setBusy(true);
    try {
      if (await logWeight(date, kg)) {
        toast.success(`Mentve: ${fmtKg(kg)} kg`);
        setValue('');
        setDate(todayIso());
      }
    } catch (e) {
      toast.error(
        e instanceof AppApiError && e.kind === 'network'
          ? 'Most nincs kapcsolat. A mérést net mellett tudod elmenteni.'
          : 'A mentés nem sikerült. Ha a hiba megmarad, szólj az edződnek.',
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d: string) => {
    try {
      await logWeight(d, null);
    } catch {
      toast.error('A törlés nem sikerült. Próbáld újra net mellett.');
    }
  };

  return (
    <section className="rounded-[14px] border border-app-line p-4">
      <div className="flex items-start gap-3">
        <Scale className="mt-0.5 size-5 shrink-0 text-app-teal" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Testsúly</h2>
          {last ? (
            <p className="text-sm text-app-muted">
              Utolsó: <span className="font-semibold text-app-navy">{fmtKg(last.weight_kg)} kg</span> ·{' '}
              {fmtDayShort(last.measured_on)}
              {diff !== null && diff !== 0 && (
                <>
                  {' '}
                  · {diff > 0 ? '+' : '−'}
                  {fmtKg(Math.abs(diff))} kg az első mérés óta
                </>
              )}
            </p>
          ) : (
            <p className="text-sm text-app-muted">
              Hetente egyszer, ugyanazon a napon, reggel, ébredés után mérj. Így a számok összevethetők.
            </p>
          )}
        </div>
      </div>

      <WeightChart items={weights} />

      <div className="mt-3 space-y-2">
        {last && due && <p className="text-sm font-semibold text-app-teal">Ideje az e heti mérésnek.</p>}
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Testsúly kilogrammban</span>
            <input
              inputMode="decimal"
              placeholder={last ? fmtKg(last.weight_kg) : 'pl. 72,5'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void save()}
              className="h-11 w-full rounded-[10px] border border-app-line bg-white pl-3 pr-10 text-base text-app-navy"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-app-muted">kg</span>
          </label>
          <button
            type="button"
            disabled={kg === null || busy}
            onClick={() => void save()}
            className="h-11 shrink-0 rounded-[10px] bg-app-teal px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Mentés
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-app-muted">
          Dátum:
          <input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-9 rounded-[8px] border border-app-line bg-white px-2 text-sm text-app-navy"
          />
        </label>
      </div>

      {weights.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setShowAll((v) => !v)} className="min-h-11 text-sm font-semibold text-app-teal">
            {showAll ? 'Mérések elrejtése' : `Összes mérés (${weights.length})`}
          </button>
          {showAll && (
            <ul className="divide-y divide-app-line rounded-[10px] border border-app-line">
              {[...weights].reverse().map((w) => (
                <li key={w.measured_on} className="flex items-center justify-between px-3 py-1.5 text-sm">
                  <span>{fmtDayShort(w.measured_on)}</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold">{fmtKg(w.weight_kg)} kg</span>
                    <button
                      type="button"
                      onClick={() => void remove(w.measured_on)}
                      aria-label={`${fmtDayShort(w.measured_on)} mérés törlése`}
                      className="flex size-9 items-center justify-center text-app-navy/50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
