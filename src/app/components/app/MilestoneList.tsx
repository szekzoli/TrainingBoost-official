// Mérföldkövek megjelenítése (Haladás oldal) és az újonnan elértek jelzése.
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Award, Lock } from 'lucide-react';
import { useSession } from './session';
import { computeMilestones, loadSeen, saveSeen } from './milestones';
import { usePrefs } from './prefs';

/**
 * Új mérföldkő elérésekor rövid gratuláció. Az első megnyitáskor a már elérteket csendben megjegyzi.
 * Kikapcsolt mérföldköveknél is megjegyzi őket (csendben), hogy visszakapcsoláskor ne jöjjön egy csomó gratuláció.
 */
export function useMilestoneToasts() {
  const { status, code, plan, logs, weights } = useSession();
  const { milestones: enabled } = usePrefs();
  useEffect(() => {
    if (status !== 'ready' || !code || !plan) return;
    const done = computeMilestones(plan, logs, weights).filter((m) => m.done);
    const seen = loadSeen(code);
    if (!seen || !enabled) {
      saveSeen(code, new Set(done.map((m) => m.id)));
      return;
    }
    const fresh = done.filter((m) => !seen.has(m.id));
    if (fresh.length === 0) return;
    for (const m of fresh.slice(-2)) {
      toast.success(`Mérföldkő: ${m.title}`, { description: m.detail, duration: 6000 });
    }
    for (const m of fresh) seen.add(m.id);
    saveSeen(code, seen);
  }, [status, code, plan, logs, weights, enabled]);
}

export function MilestoneList() {
  const { plan, logs, weights } = useSession();
  const { milestones: enabled } = usePrefs();
  const [all, setAll] = useState(false);
  const items = useMemo(() => (plan ? computeMilestones(plan, logs, weights) : []), [plan, logs, weights]);
  if (!enabled || items.length === 0) return null;
  const done = items.filter((m) => m.done);
  const next = items.filter((m) => !m.done);
  const shownDone = all ? [...done].reverse() : [...done].reverse().slice(0, 4);

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-app-teal">Mérföldkövek</h2>
        <span className="text-xs text-app-muted">{done.length} elérve</span>
      </div>
      {shownDone.length > 0 && (
        <ul className="grid grid-cols-2 gap-2">
          {shownDone.map((m) => (
            <li key={m.id} className="rounded-[14px] border border-app-teal/40 bg-app-mint p-3">
              <Award className="size-5 text-app-ink" aria-hidden />
              <p className="mt-1 text-sm font-semibold leading-snug">{m.title}</p>
              <p className="text-xs leading-snug text-app-muted">{m.detail}</p>
            </li>
          ))}
        </ul>
      )}
      {done.length > 4 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="min-h-11 text-sm font-semibold text-app-teal">
          {all ? 'Kevesebb' : `Mind a ${done.length} elért`}
        </button>
      )}
      {next.length > 0 && (
        <ul className="space-y-1.5">
          {next.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-[12px] border border-app-line px-3 py-2">
              <Lock className="size-4 shrink-0 text-app-navy/40" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{m.title}</span>
                {m.progress && (
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-app-navy/10">
                    <span
                      className="block h-full rounded-full bg-app-teal"
                      style={{ width: `${Math.min(100, (m.progress.now / m.progress.goal) * 100)}%` }}
                    />
                  </span>
                )}
              </span>
              {m.progress && (
                <span className="shrink-0 text-xs tabular-nums text-app-muted">
                  {m.progress.now.toLocaleString('hu-HU')} / {m.progress.goal.toLocaleString('hu-HU')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
