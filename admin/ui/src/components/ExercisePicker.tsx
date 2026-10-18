import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { api, errorMessage, type Exercise } from '../api';
import { fold, input } from '../lib/util';

export type PickerHandle = { focus: () => void };

// Gyakorlat-kereső: gépelésre szűr, nyilakkal / Enterrel / kattintással választható.
// Ha nincs azonos nevű gyakorlat, "Új gyakorlat felvétele" sor jelenik meg, ami a gyakorlattárba is felveszi.
const ExercisePicker = forwardRef<
  PickerHandle,
  {
    onPick: (exercise: Exercise) => Promise<void> | void;
    disabled?: boolean;
  }
>(function ExercisePicker({ onPick, disabled }, ref) {
  const [all, setAll] = useState<Exercise[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  async function load() {
    try {
      setAll(await api.listExercises());
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const query = q.trim();
  const folded = fold(query);

  const matches = useMemo(() => {
    const visible = all.filter((e) => !e.archived);
    const list = folded
      ? visible
          .filter((e) => fold(e.name).includes(folded) || fold(e.category ?? '').includes(folded))
          .sort((a, b) => {
            const as = fold(a.name).startsWith(folded) ? 0 : 1;
            const bs = fold(b.name).startsWith(folded) ? 0 : 1;
            return as - bs || a.name.localeCompare(b.name, 'hu');
          })
      : [...visible].sort((a, b) => a.name.localeCompare(b.name, 'hu'));
    return list.slice(0, 50);
  }, [all, folded]);

  const exact = query ? all.find((e) => e.name.toLowerCase() === query.toLowerCase()) : undefined;
  const canCreate = query.length > 0 && !exact;
  const archivedExact = exact?.archived ? exact : undefined;
  const itemCount = matches.length + (canCreate ? 1 : 0);

  useEffect(() => setActive(0), [q]);

  async function choose(index: number) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      let ex: Exercise;
      if (index < matches.length) {
        ex = matches[index];
      } else if (canCreate) {
        ex = await api.createExercise({ name: query });
        await load();
      } else {
        return;
      }
      await onPick(ex);
      setQ('');
      setOpen(false);
      inputRef.current?.focus();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(itemCount - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && itemCount > 0) void choose(active);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="picker-list"
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled || busy}
        value={q}
        placeholder="Gyakorlat hozzáadása: kezdj gépelni, vagy válassz a listából…"
        className={input}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {busy && <span className="absolute right-3 top-2.5 text-xs text-muted">Mentés…</span>}
      {open && (
        <ul
          id="picker-list"
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-[10px] border border-line bg-white py-1 shadow-lg"
        >
          {matches.map((m, i) => (
            <li
              key={m.id}
              role="option"
              aria-selected={i === active}
              // mousedown: a kattintás előtt ne záródjon be a lista a blur miatt
              onMouseDown={(e) => {
                e.preventDefault();
                void choose(i);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-sm ${
                i === active ? 'bg-teal-soft' : ''
              }`}
            >
              <span className="font-semibold">{m.name}</span>
              {m.category && <span className="text-xs text-muted">{m.category}</span>}
            </li>
          ))}
          {matches.length === 0 && !canCreate && <li className="px-3 py-2 text-sm text-muted">Nincs találat.</li>}
          {canCreate && (
            <li
              role="option"
              aria-selected={active === matches.length}
              onMouseDown={(e) => {
                e.preventDefault();
                void choose(matches.length);
              }}
              onMouseEnter={() => setActive(matches.length)}
              className={`cursor-pointer border-t border-line px-3 py-2 text-sm font-semibold text-teal ${
                active === matches.length ? 'bg-teal-soft' : ''
              }`}
            >
              + Új gyakorlat felvétele: „{query}”
            </li>
          )}
        </ul>
      )}
      {archivedExact && (
        <p className="mt-1 text-xs text-muted">
          A(z) „{archivedExact.name}” archivált. A Gyakorlattárban állítható vissza.
        </p>
      )}
      {loadError && <p className="mt-1 text-xs font-semibold text-danger">{loadError}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
});

export default ExercisePicker;
