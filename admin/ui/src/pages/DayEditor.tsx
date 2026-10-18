import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { api, type PlanDay, type PlanRow, type RowPatch } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import ExercisePicker, { type PickerHandle } from '../components/ExercisePicker';
import {
  canGroup,
  computeMove,
  computeSectionMove,
  groupTags,
  nextGroupLabel,
  sectionsOf,
} from '../lib/blocks';
import { btn } from '../lib/util';
import type { EditorCtl } from './editor-types';

// Szerkeszthető cella: a változás mezőelhagyáskor / Entert követően mentődik. Hiba esetén a bevitt érték megmarad.
function Cell({
  value,
  onCommit,
  label,
  className = '',
  list,
  inputMode,
  placeholder,
}: {
  value: string;
  onCommit: (v: string) => Promise<boolean>;
  label: string;
  className?: string;
  list?: string;
  inputMode?: 'numeric' | 'text';
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [bad, setBad] = useState(false);

  useEffect(() => setDraft(value), [value]);

  async function commit() {
    if (draft === value) {
      setBad(false);
      return;
    }
    const ok = await onCommit(draft);
    setBad(!ok);
    if (ok) setDraft(draft.trim());
  }

  return (
    <input
      aria-label={label}
      aria-invalid={bad}
      title={bad ? 'Nem sikerült menteni – a bevitt érték megmaradt' : undefined}
      value={draft}
      list={list}
      inputMode={inputMode}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(value);
          setBad(false);
        }
      }}
      className={`w-full rounded-[8px] border bg-white px-2 py-1.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 ${
        bad ? 'border-danger bg-danger-soft' : 'border-line'
      } ${className}`}
    />
  );
}

export default function DayEditor({ day, ctl, weekCount }: { day: PlanDay; ctl: EditorCtl; weekCount: number }) {
  const rows = day.exercises;
  const tags = useMemo(() => groupTags(rows), [rows]);
  const sections = useMemo(() => sectionsOf(rows), [rows]);
  const sectionNames = useMemo(
    () => [...new Set(rows.map((r) => r.section).filter((s): s is string => !!s))],
    [rows],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<PlanRow | null>(null);
  const [addSection, setAddSection] = useState('');
  const picker = useRef<PickerHandle>(null);
  const dayId = day.id;
  const listId = `sections-${dayId}`;

  // Napváltáskor a kijelölés törlődik, az új sor szakasza az utolsó sor szakasza
  useEffect(() => {
    setSelected(new Set());
    setAddSection(rows[rows.length - 1]?.section ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId]);

  // Újratöltés után a már nem létező sorok kijelölése megszűnik
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(rows.map((r) => r.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const scopedKeys = ['sets', 'reps', 'resistance', 'rest_seconds', 'note'];

  async function patch(row: PlanRow, p: RowPatch): Promise<boolean> {
    const res = await ctl.save(() => api.updateRow(row.id, p, ctl.scope));
    if (!res) return false;
    const touchesScoped = Object.keys(p).some((k) => scopedKeys.includes(k));
    if ('section' in p || (touchesScoped && ctl.scope !== 'this')) await ctl.reload();
    else ctl.patchRow(dayId, row.id, res.row);

    if (touchesScoped && ctl.scope !== 'this') {
      if (res.unmatched_weeks.length > 0) {
        ctl.notify({
          kind: 'warn',
          text: `Módosítva ${res.updated} héten. Nem található egyező gyakorlat (ugyanaz a nap, gyakorlat és szakasz) ezeken a heteken, ezért ott nem változott: ${res.unmatched_weeks
            .map((w) => `${w}.`)
            .join(', ')} hét.`,
        });
      } else {
        ctl.notify({ kind: 'ok', text: `Módosítva ${res.updated} héten.` });
      }
    }
    return true;
  }

  const fail = (text: string) => {
    ctl.notify({ kind: 'error', text });
    return false;
  };

  const commitSets = (row: PlanRow) => async (v: string) => {
    const n = Number(v.trim());
    if (!Number.isInteger(n) || n < 1 || n > 50) return fail('A sorozat 1 és 50 közötti egész szám.');
    return patch(row, { sets: n });
  };
  const commitReps = (row: PlanRow) => async (v: string) => {
    const t = v.trim();
    if (!t || t.length > 60) return fail('Az ismétlés kötelező (legfeljebb 60 karakter).');
    return patch(row, { reps: t });
  };
  const commitRest = (row: PlanRow) => async (v: string) => {
    const t = v.trim();
    if (t === '') return patch(row, { rest_seconds: null });
    const n = Number(t);
    if (!Number.isInteger(n) || n < 0 || n > 3600) return fail('A szünet 0 és 3600 közötti egész szám (másodperc).');
    return patch(row, { rest_seconds: n });
  };
  const commitText = (row: PlanRow, key: 'resistance' | 'note' | 'section') => async (v: string) =>
    patch(row, { [key]: v.trim() === '' ? null : v.trim() });

  async function move(ids: string[] | null) {
    if (!ids) return;
    ctl.applyOrder(dayId, ids);
    const ok = await ctl.save(() => api.setOrder(dayId, ids));
    if (ok === undefined) await ctl.reload(); // hiba: visszaállunk a mentett sorrendre
  }

  async function addRow(exerciseId: string) {
    await ctl.save(() => api.addRow(dayId, { exercise_id: exerciseId, section: addSection.trim() || null }), {
      rethrow: true,
    });
    await ctl.reload();
  }

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const groupable = canGroup(rows, selected);
  const label = groupable ? nextGroupLabel(rows, selected) : null;
  const hasGrouped = selectedRows.some((r) => r.group_label);

  async function form() {
    if (!label) return;
    const ok = await ctl.save(() => api.setGroup([...selected], label));
    if (ok) {
      setSelected(new Set());
      await ctl.reload();
    }
  }

  async function ungroup() {
    const labels = new Set(selectedRows.map((r) => r.group_label).filter(Boolean));
    const ids = rows.filter((r) => r.group_label && labels.has(r.group_label)).map((r) => r.id);
    const ok = await ctl.save(() => api.setGroup(ids, null));
    if (ok) {
      setSelected(new Set());
      await ctl.reload();
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const th = 'px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted';
  const iconBtn = 'inline-flex size-8 items-center justify-center rounded-[8px] border border-line hover:bg-canvas disabled:opacity-30';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <span className="text-sm text-muted">Kijelölt sorok: {selected.size}</span>
        <button type="button" className={btn} disabled={!groupable || !label} onClick={() => void form()}>
          Szuperszett képzése{label ? ` (${label})` : ''}
        </button>
        <button type="button" className={btn} disabled={!hasGrouped} onClick={() => void ungroup()}>
          Szuperszett megszüntetése
        </button>
        {selected.size >= 2 && !groupable && (
          <span className="text-xs text-muted">Szuperszett csak egymás melletti, azonos szakaszú sorokból képezhető.</span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">Ezen a napon még nincs gyakorlat. Adj hozzá lent.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className={`${th} w-8`}>
                  <span className="sr-only">Kijelölés</span>
                </th>
                <th className={th}>Gyakorlat</th>
                <th className={`${th} w-44`}>Szakasz</th>
                <th className={`${th} w-20`}>Sorozat</th>
                <th className={`${th} w-28`}>Ismétlés</th>
                <th className={`${th} w-32`}>Ellenállás</th>
                <th className={`${th} w-20`}>Szünet (mp)</th>
                <th className={`${th} w-48`}>Megjegyzés</th>
                <th className={`${th} w-28`}>
                  <span className="sr-only">Műveletek</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sections.map((sec, si) => (
                <SectionBlock key={`${si}-${sec.section ?? ''}`}>
                  <tr className="border-b border-line bg-canvas">
                    <td colSpan={8} className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-teal">
                      {sec.section ?? 'Szakasz nélkül'}
                      <span className="ml-2 font-normal normal-case text-muted">({sec.rows.length} gyakorlat)</span>
                    </td>
                    <td className="px-2 py-1 text-right">
                      <button
                        type="button"
                        aria-label="Szakasz feljebb"
                        className={iconBtn}
                        disabled={!computeSectionMove(rows, si, -1)}
                        onClick={() => void move(computeSectionMove(rows, si, -1))}
                      >
                        <ChevronUp className="size-4" />
                      </button>{' '}
                      <button
                        type="button"
                        aria-label="Szakasz lejjebb"
                        className={iconBtn}
                        disabled={!computeSectionMove(rows, si, 1)}
                        onClick={() => void move(computeSectionMove(rows, si, 1))}
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </td>
                  </tr>
                  {sec.rows.map((r) => {
                    const tag = tags.get(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-line last:border-b-0 ${selected.has(r.id) ? 'bg-teal-soft' : ''}`}
                      >
                        <td className={`px-2 py-2 ${r.group_label ? 'border-l-4 border-l-teal' : 'border-l-4 border-l-transparent'}`}>
                          <input
                            type="checkbox"
                            aria-label={`Kijelölés: ${r.exercise.name}`}
                            checked={selected.has(r.id)}
                            onChange={() => toggle(r.id)}
                          />
                        </td>
                        <td className="px-2 py-2 font-semibold">
                          {tag && (
                            <span className="mr-2 inline-flex min-w-7 items-center justify-center rounded-[6px] border border-teal px-1 text-xs font-bold text-teal">
                              {tag}
                            </span>
                          )}
                          {r.exercise.name}
                          {r.exercise.archived && (
                            <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted">
                              archivált
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <Cell label="Szakasz" value={r.section ?? ''} list={listId} onCommit={commitText(r, 'section')} />
                        </td>
                        <td className="px-2 py-2">
                          <Cell label="Sorozat" value={String(r.sets)} inputMode="numeric" onCommit={commitSets(r)} />
                        </td>
                        <td className="px-2 py-2">
                          <Cell label="Ismétlés" value={r.reps} onCommit={commitReps(r)} />
                        </td>
                        <td className="px-2 py-2">
                          <Cell label="Ellenállás" value={r.resistance ?? ''} onCommit={commitText(r, 'resistance')} />
                        </td>
                        <td className="px-2 py-2">
                          <Cell
                            label="Szünet (mp)"
                            value={r.rest_seconds === null ? '' : String(r.rest_seconds)}
                            inputMode="numeric"
                            onCommit={commitRest(r)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Cell label="Megjegyzés" value={r.note ?? ''} onCommit={commitText(r, 'note')} />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              aria-label="Feljebb"
                              className={iconBtn}
                              disabled={!computeMove(rows, r.id, -1)}
                              onClick={() => void move(computeMove(rows, r.id, -1))}
                            >
                              <ChevronUp className="size-4" />
                            </button>
                            <button
                              type="button"
                              aria-label="Lejjebb"
                              className={iconBtn}
                              disabled={!computeMove(rows, r.id, 1)}
                              onClick={() => void move(computeMove(rows, r.id, 1))}
                            >
                              <ChevronDown className="size-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Törlés: ${r.exercise.name}`}
                              className={`${iconBtn} text-danger`}
                              onClick={() => setDeleting(r)}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </SectionBlock>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <datalist id={listId}>
        {sectionNames.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="grid gap-3 border-t border-line px-4 py-4 md:grid-cols-[1fr_16rem]">
        <ExercisePicker ref={picker} onPick={(ex) => addRow(ex.id)} />
        <label className="block text-xs font-semibold text-muted">
          Az új sor szakasza
          <input
            value={addSection}
            list={listId}
            maxLength={60}
            placeholder="(nincs szakasz)"
            onChange={(e) => setAddSection(e.target.value)}
            className="mt-1 block w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm font-normal text-navy outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </label>
        <p className="text-xs text-muted md:col-span-2">
          Új gyakorlat hozzáadása és törlése mindig csak erre a hétre vonatkozik. Az új sor 3 × 10 értékkel kerül be, utána átírható.
          {weekCount > 1 && ' A sorozat, ismétlés, ellenállás, szünet és megjegyzés módosítása a fent kiválasztott hatókör szerint más hetekre is érvényes.'}
        </p>
      </div>

      {deleting && (
        <ConfirmDialog
          title="Gyakorlat törlése a napról"
          confirmLabel="Törlés"
          danger
          blockedReason={
            deleting.has_logs
              ? 'Ehhez a gyakorlathoz ügyfél által naplózott sorozat tartozik, ezért nem törölhető.'
              : null
          }
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api.deleteRow(deleting.id);
            setDeleting(null);
            await ctl.reload();
          }}
        >
          <p>
            Biztosan eltávolítod a(z) <strong>{deleting.exercise.name}</strong> gyakorlatot erről a napról? A gyakorlattárból nem
            törlődik.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

// Több <tr> csoportosítása kulccsal (a <tbody> egyetlen marad)
function SectionBlock({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
