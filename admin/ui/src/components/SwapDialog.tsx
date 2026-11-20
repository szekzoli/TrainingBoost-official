// Gyakorlat cseréje egy terv-sorban: hasonló gyakorlatok javaslata (azonos mozgásminta és izomcsoport),
// vagy keresés a teljes gyakorlattárban. A sorozat, ismétlés, ellenállás, pihenő és megjegyzés marad.
import { useEffect, useMemo, useState } from 'react';
import { api, errorMessage, type Exercise, type PlanRow, type Scope } from '../api';
import { fold, input } from '../lib/util';
import { typeOf } from '../lib/taxonomy';
import Modal from './Modal';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'this', label: 'Csak ez a hét' },
  { value: 'from', label: 'Ettől a héttől a végéig' },
  { value: 'all', label: 'Minden hét' },
];

export default function SwapDialog({
  row,
  week,
  weekCount,
  defaultScope,
  onClose,
  onDone,
}: {
  row: PlanRow;
  week: number;
  weekCount: number;
  defaultScope: Scope;
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const [all, setAll] = useState<Exercise[] | null>(null);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Exercise | null>(null);
  const [scope, setScope] = useState<Scope>(row.has_logs && defaultScope === 'this' ? 'from' : defaultScope);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listExercises()
      .then(setAll)
      .catch((e) => setError(errorMessage(e)));
  }, []);

  const current = all?.find((e) => e.id === row.exercise_id);

  // Javaslat: azonos mozgásminta, előbb azonos izomcsoport, azon belül azonos típus (szabad súly / gépes…)
  const suggestions = useMemo(() => {
    if (!all || !current) return [];
    const score = (e: Exercise) =>
      (e.category && e.category === current.category ? 4 : 0) +
      (e.muscle_group && e.muscle_group === current.muscle_group ? 2 : 0) +
      (typeOf(e.equipment) && typeOf(e.equipment) === typeOf(current.equipment) ? 1 : 0);
    return all
      .filter((e) => !e.archived && e.id !== current.id && score(e) >= 4)
      .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, 'hu'))
      .slice(0, 12);
  }, [all, current]);

  const results = useMemo(() => {
    const f = fold(q.trim());
    if (!all || !f) return [];
    return all
      .filter((e) => !e.archived && e.id !== row.exercise_id)
      .filter((e) => fold(e.name).includes(f) || fold(e.muscle_group ?? '').includes(f) || fold(e.equipment ?? '').includes(f))
      .slice(0, 20);
  }, [all, q, row.exercise_id]);

  async function confirm() {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.replaceRow(row.id, picked.id, scope);
      const parts = [`Csere kész: ${row.exercise.name} → ${picked.name} (${r.replaced} hét).`];
      if (r.logged_weeks.length) parts.push(`Kihagyva, mert már naplózott: ${r.logged_weeks.join(', ')}. hét.`);
      if (r.unmatched_weeks.length) parts.push(`Nem volt párja: ${r.unmatched_weeks.join(', ')}. hét.`);
      await onDone(parts.join(' '));
    } catch (e) {
      setBusy(false);
      setError(errorMessage(e));
    }
  }

  const item = (e: Exercise) => (
    <li key={e.id}>
      <button
        type="button"
        onClick={() => setPicked(e)}
        className={`flex w-full items-baseline justify-between gap-3 rounded-[10px] border px-3 py-2 text-left text-sm ${
          picked?.id === e.id ? 'border-teal bg-teal-soft' : 'border-line hover:bg-canvas'
        }`}
      >
        <span className="font-semibold">{e.name}</span>
        <span className="shrink-0 text-xs text-muted">{[e.muscle_group, e.equipment].filter(Boolean).join(' · ')}</span>
      </button>
    </li>
  );

  return (
    <Modal title="Gyakorlat cseréje" onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        <p>
          <strong>{row.exercise.name}</strong> helyett ({week}. hét). A sorozat ({row.sets} × {row.reps}), az ellenállás, a pihenő és a
          megjegyzés marad, utána átírhatod.
        </p>

        {all === null ? (
          <p className="text-muted">Betöltés…</p>
        ) : (
          <>
            {suggestions.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                  Hasonló gyakorlatok{current?.category ? ` (${current.category}${current.muscle_group ? `, ${current.muscle_group}` : ''})` : ''}
                </h3>
                <ul className="grid gap-1.5 md:grid-cols-2">{suggestions.map(item)}</ul>
              </div>
            )}
            {current && !current.category && (
              <p className="text-xs text-muted">
                Ennek a gyakorlatnak nincs mozgásmintája a gyakorlattárban, ezért nincs javaslat. Keress rá alább.
              </p>
            )}
            <label className="block font-semibold">
              Keresés a gyakorlattárban
              <input
                className={`${input} mt-1`}
                value={q}
                placeholder="Név, izomcsoport vagy eszköz…"
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            {results.length > 0 && <ul className="max-h-64 space-y-1.5 overflow-y-auto">{results.map(item)}</ul>}
          </>
        )}

        {weekCount > 1 && (
          <fieldset>
            <legend className="font-semibold">Hatókör</legend>
            <div className="mt-1 flex flex-wrap gap-4">
              {SCOPES.map((s) => (
                <label key={s.value} className="flex items-center gap-2">
                  <input type="radio" name="swap-scope" checked={scope === s.value} onChange={() => setScope(s.value)} />
                  {s.label}
                </label>
              ))}
            </div>
            {row.has_logs && (
              <p className="mt-2 rounded-[10px] border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Ezen a héten az ügyfél már naplózott ennél a gyakorlatnál, ezért ez a hét nem cserélhető (a napló ne keveredjen). A
                későbbi hetek igen.
              </p>
            )}
          </fieldset>
        )}

        {error && (
          <p role="alert" className="rounded-[10px] border border-danger/40 bg-danger-soft px-3 py-2 text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
          {picked && <span className="mr-auto text-muted">Új: <strong className="text-navy">{picked.name}</strong></span>}
          <button type="button" className="h-10 rounded-[10px] border border-line px-4 font-semibold hover:bg-canvas" onClick={onClose}>
            Mégse
          </button>
          <button
            type="button"
            className="h-10 rounded-[10px] bg-navy px-5 font-semibold text-white disabled:opacity-40"
            disabled={!picked || busy}
            onClick={() => void confirm()}
          >
            {busy ? 'Csere…' : 'Csere'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
