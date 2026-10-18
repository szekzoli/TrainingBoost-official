import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api, errorMessage, type PlanDay, type PlanFull, type PlanRow, type Scope } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import { SLUG_RE, btn, btnGhost, btnPrimary, input } from '../lib/util';
import DayEditor from './DayEditor';
import type { EditorCtl, Notice } from './editor-types';
import Overview from './Overview';

type SaveState = { kind: 'idle' | 'saved' | 'error'; text?: string };

function SaveIndicator({ pending, state, onDismiss }: { pending: number; state: SaveState; onDismiss: () => void }) {
  let text = '';
  let cls = 'text-muted';
  if (pending > 0) text = 'Mentés…';
  else if (state.kind === 'saved') {
    text = 'Mentve';
    cls = 'text-teal';
  } else if (state.kind === 'error') {
    text = 'Nem sikerült menteni';
    cls = 'text-danger';
  }
  return (
    <span aria-live="polite" className={`text-sm font-semibold ${cls}`}>
      {text}
      {pending === 0 && state.kind === 'error' && (
        <button type="button" onClick={onDismiss} className="ml-2 text-xs font-normal underline">
          rendben
        </button>
      )}
    </span>
  );
}

function CopyWeekDialog({
  data,
  fromWeek,
  onClose,
  onDone,
}: {
  data: PlanFull;
  fromWeek: number;
  onClose: () => void;
  onDone: (toWeek: number) => Promise<void>;
}) {
  const weeks = [...new Set(data.days.map((d) => d.week))].sort((a, b) => a - b);
  const nextWeek = (weeks[weeks.length - 1] ?? 0) + 1;
  const options = [...weeks.filter((w) => w !== fromWeek), ...(nextWeek <= 52 ? [nextWeek] : [])];
  const [to, setTo] = useState<number>(options[0] ?? nextWeek);
  const [confirming, setConfirming] = useState(false);

  const targetDays = data.days.filter((d) => d.week === to);
  const targetRows = targetDays.reduce((n, d) => n + d.exercises.length, 0);
  const hasContent = targetDays.length > 0;
  const blocked = targetDays.some((d) => d.has_logs)
    ? 'A cél héthez ügyfél által naplózott edzés tartozik, ezért a tartalma nem cserélhető le.'
    : null;

  if (confirming) {
    return (
      <ConfirmDialog
        title="Hét tartalmának cseréje"
        confirmLabel="Másolás és csere"
        danger
        blockedReason={blocked}
        onClose={onClose}
        onConfirm={async () => {
          await api.copyWeek(data.plan.id, fromWeek, to);
          await onDone(to);
        }}
      >
        <p>
          A(z) <strong>{to}. hét</strong> jelenlegi tartalma ({targetDays.length} nap, {targetRows} gyakorlat-sor) <strong>törlődik</strong>,
          és helyére a(z) <strong>{fromWeek}. hét</strong> másolata kerül. Ez nem vonható vissza.
        </p>
      </ConfirmDialog>
    );
  }

  return (
    <Modal title={`${fromWeek}. hét másolása`} onClose={onClose}>
      <div className="space-y-4">
        <label className="block text-sm font-semibold">
          Cél hét
          <select className={`${input} mt-1`} value={to} onChange={(e) => setTo(Number(e.target.value))}>
            {options.map((w) => (
              <option key={w} value={w}>
                {w}. hét{weeks.includes(w) ? '' : ' (új hét)'}
              </option>
            ))}
          </select>
        </label>
        {hasContent ? (
          <p className="rounded-[10px] border border-line bg-canvas px-3 py-2 text-sm">
            A(z) {to}. héten már van tartalom ({targetDays.length} nap, {targetRows} gyakorlat-sor): a másolás ezt <strong>felülírja</strong>.
          </p>
        ) : (
          <p className="text-sm text-muted">A cél hét még üres, a másolás létrehozza.</p>
        )}
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" className={btnGhost} onClick={onClose}>
            Mégse
          </button>
          {hasContent ? (
            <button type="button" className={btnPrimary} onClick={() => setConfirming(true)}>
              Tovább
            </button>
          ) : (
            <ConfirmInline
              onRun={async () => {
                await api.copyWeek(data.plan.id, fromWeek, to);
                await onDone(to);
              }}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

// Egy gomb, ami futtat egy műveletet, és a hibát mellette mutatja
function ConfirmInline({ onRun }: { onRun: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      {error && (
        <span role="alert" className="mr-auto text-sm text-danger">
          {error}
        </span>
      )}
      <button
        type="button"
        className={btnPrimary}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await onRun();
          } catch (err) {
            setBusy(false);
            setError(errorMessage(err));
          }
        }}
      >
        {busy ? 'Másolás…' : 'Másolás'}
      </button>
    </>
  );
}

function PlanHeader({ data, ctl }: { data: PlanFull; ctl: EditorCtl }) {
  const p = data.plan;
  const [title, setTitle] = useState(p.title);
  const [slug, setSlug] = useState(p.slug);
  const [description, setDescription] = useState(p.description ?? '');
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(p.title);
    setSlug(p.slug);
    setDescription(p.description ?? '');
  }, [p.title, p.slug, p.description]);

  const dirty = title !== p.title || slug !== p.slug || description !== (p.description ?? '');
  const slugInvalid = !SLUG_RE.test(slug);
  const valid = title.trim() !== '' && !slugInvalid;

  async function saveHeader() {
    if (!valid) return;
    setSlugError(null);
    const patch: { title?: string; slug?: string; description?: string | null } = {};
    if (title !== p.title) patch.title = title;
    if (slug !== p.slug) patch.slug = slug;
    if (description !== (p.description ?? '')) patch.description = description.trim() || null;
    try {
      await ctl.save(() => api.updatePlan(p.id, patch), { rethrow: true });
      await ctl.reload();
    } catch (err) {
      // Az űrlap megőrzi a bevitt adatot
      const msg = errorMessage(err);
      if (/slug/i.test(msg)) setSlugError(msg);
    }
  }

  async function toggleTemplate(v: boolean) {
    const ok = await ctl.save(() => api.updatePlan(p.id, { is_template: v }));
    if (ok) await ctl.reload();
  }

  return (
    <div className="rounded-[14px] border border-line bg-white p-5 print:hidden">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold">
          Cím
          <input className={`${input} mt-1`} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold">
          Slug
          <input
            className={`${input} mt-1 font-mono ${slugInvalid || slugError ? 'border-danger' : ''}`}
            value={slug}
            maxLength={80}
            onChange={(e) => setSlug(e.target.value)}
          />
          {slugInvalid && <span className="mt-1 block text-xs text-danger">Csak kisbetű, szám és kötőjel.</span>}
          {slugError && <span className="mt-1 block text-xs text-danger">{slugError}</span>}
        </label>
        <label className="block text-sm font-semibold md:col-span-2">
          Leírás
          <textarea
            className={`${input} mt-1 min-h-20 resize-y`}
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={p.is_template} onChange={(e) => void toggleTemplate(e.target.checked)} />
          Sablon
        </label>
        <span className="text-xs text-muted">Ügyfelek ezen a terven: {p.client_count}</span>
        <button type="button" className={`${btnPrimary} ml-auto`} disabled={!dirty || !valid} onClick={() => void saveHeader()}>
          Mentés
        </button>
      </div>
    </div>
  );
}

export default function PlanEditor() {
  const { id = '' } = useParams();
  const [data, setData] = useState<PlanFull | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<'edit' | 'overview'>('edit');
  const [week, setWeek] = useState<number | null>(null);
  const [dayNo, setDayNo] = useState<number | null>(null);
  const [scope, setScope] = useState<Scope>('this');
  const [pending, setPending] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [copyingWeek, setCopyingWeek] = useState(false);
  const [deletingDay, setDeletingDay] = useState<PlanDay | null>(null);
  const idRef = useRef(id);
  idRef.current = id;
  const hasData = useRef(false);
  hasData.current = data !== null;

  const reload = useCallback(async () => {
    try {
      const d = await api.getPlan(idRef.current);
      setData(d);
      setLoadError(null);
    } catch (err) {
      if (!hasData.current) setLoadError(errorMessage(err));
      else setNotice({ kind: 'error', text: errorMessage(err) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setData(null);
    setLoadError(null);
    setWeek(null);
    setDayNo(null);
    void reload();
  }, [id, reload]);

  // Értelmes alapértelmezett kijelölés / érvénytelenné vált kijelölés javítása
  const weeks = useMemo(() => [...new Set((data?.days ?? []).map((d) => d.week))].sort((a, b) => a - b), [data]);
  useEffect(() => {
    if (!data) return;
    if (week === null || !weeks.includes(week)) setWeek(weeks[0] ?? null);
  }, [data, weeks, week]);

  const weekDays = useMemo(() => (data?.days ?? []).filter((d) => d.week === week), [data, week]);
  const day = weekDays.find((d) => d.day === dayNo) ?? weekDays[0] ?? null;

  const save = useCallback(async function <T>(fn: () => Promise<T>, opts?: { rethrow?: boolean }) {
    setPending((n) => n + 1);
    try {
      const r = await fn();
      setSaveState({ kind: 'saved' });
      return r;
    } catch (err) {
      const text = errorMessage(err);
      setSaveState({ kind: 'error', text });
      setNotice({ kind: 'error', text });
      if (opts?.rethrow) throw err;
      return undefined;
    } finally {
      setPending((n) => n - 1);
    }
  }, []);

  useEffect(() => {
    if (notice?.kind !== 'ok') return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const mapDay = (dayId: string, fn: (d: PlanDay) => PlanDay) =>
    setData((prev) => (prev ? { ...prev, days: prev.days.map((d) => (d.id === dayId ? fn(d) : d)) } : prev));

  const ctl: EditorCtl = {
    planId: id,
    save,
    reload,
    notify: setNotice,
    scope,
    patchRow: (dayId, rowId, fields) =>
      mapDay(dayId, (d) => ({
        ...d,
        exercises: d.exercises.map((r) => (r.id === rowId ? ({ ...r, ...fields } as PlanRow) : r)),
      })),
    patchDay: (dayId, fields) => mapDay(dayId, (d) => ({ ...d, ...fields })),
    applyOrder: (dayId, ids) =>
      mapDay(dayId, (d) => {
        const byId = new Map(d.exercises.map((r) => [r.id, r]));
        return { ...d, exercises: ids.map((rid, i) => ({ ...byId.get(rid)!, position: i + 1 })) };
      }),
  };

  async function addDay(targetWeek: number) {
    const r = await save(() => api.addDay(id, targetWeek));
    if (!r) return;
    const fresh = await api.getPlan(id).catch(() => null);
    if (fresh) {
      setData(fresh);
      const created = fresh.days.find((d) => d.id === r.id);
      if (created) {
        setWeek(created.week);
        setDayNo(created.day);
      }
    }
  }

  if (loadError) {
    return (
      <div className="rounded-[14px] border border-line bg-white p-6 text-sm">
        <p role="alert" className="text-danger">
          {loadError}
        </p>
        <Link to="/tervek" className={`${btn} mt-3 inline-flex items-center`}>
          Vissza a tervekhez
        </Link>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-muted">Betöltés…</p>;

  const backTo = data.plan.is_template ? '/sablonok' : '/tervek';
  const maxWeek = weeks[weeks.length - 1] ?? 0;
  const tabCls = (active: boolean) =>
    `h-10 border-b-2 px-4 text-sm font-semibold ${active ? 'border-teal text-teal' : 'border-transparent text-muted hover:text-navy'}`;
  const scopeLabels: [Scope, string][] = [
    ['this', 'Csak ez a hét'],
    ['from', `Ettől a hétig a végéig${week ? ` (${week}.–${maxWeek}. hét)` : ''}`],
    ['all', 'Minden hét'],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <Link to={backTo} className="text-sm font-semibold text-teal hover:underline">
          ‹ {data.plan.is_template ? 'Sablonok' : 'Tervek'}
        </Link>
        <h1 className="mr-auto text-2xl font-bold">{data.plan.title}</h1>
        {data.plan.is_template && (
          <span className="rounded-full border border-teal px-3 py-0.5 text-xs font-semibold text-teal">sablon</span>
        )}
        <SaveIndicator pending={pending} state={saveState} onDismiss={() => setSaveState({ kind: 'idle' })} />
      </div>

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-3 rounded-[10px] border px-4 py-3 text-sm print:hidden ${
            notice.kind === 'error'
              ? 'border-danger/40 bg-danger-soft text-danger'
              : notice.kind === 'warn'
                ? 'border-amber-400 bg-amber-50 text-amber-900'
                : 'border-teal/40 bg-teal-soft text-teal'
          }`}
        >
          <span className="mr-auto">{notice.text}</span>
          <button type="button" className="text-xs underline" onClick={() => setNotice(null)}>
            bezár
          </button>
        </div>
      )}

      <PlanHeader data={data} ctl={ctl} />

      <div className="flex border-b border-line print:hidden" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'edit'} className={tabCls(tab === 'edit')} onClick={() => setTab('edit')}>
          Szerkesztés
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'overview'}
          className={tabCls(tab === 'overview')}
          onClick={() => setTab('overview')}
        >
          Áttekintő
        </button>
      </div>

      {tab === 'overview' ? (
        <Overview data={data} />
      ) : (
        <div>
          {/* Hét fülek */}
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Hetek">
            {weeks.map((w) => (
              <button
                key={w}
                type="button"
                role="tab"
                aria-selected={w === week}
                onClick={() => setWeek(w)}
                className={`h-9 rounded-[10px] border px-4 text-sm font-semibold ${
                  w === week ? 'border-navy bg-navy text-white' : 'border-line bg-white hover:bg-canvas'
                }`}
              >
                {w}. hét
              </button>
            ))}
            <button
              type="button"
              className={`${btn} inline-flex items-center gap-1`}
              disabled={maxWeek >= 52}
              onClick={() => void addDay(maxWeek + 1).then(() => setTab('edit'))}
            >
              <Plus className="size-4" /> Új hét
            </button>
            {week !== null && (
              <button type="button" className={`${btn} ml-auto`} onClick={() => setCopyingWeek(true)}>
                {week}. hét másolása…
              </button>
            )}
          </div>

          {week === null ? (
            <p className="mt-6 rounded-[14px] border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
              A tervnek még nincs hete. Az „Új hét” gombbal hozz létre egyet.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-[14px] border border-line bg-white">
              {/* Nap fülek */}
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3" role="tablist" aria-label="Napok">
                {weekDays.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    role="tab"
                    aria-selected={day?.id === d.id}
                    onClick={() => setDayNo(d.day)}
                    className={`h-9 rounded-[10px] border px-4 text-sm font-semibold ${
                      day?.id === d.id ? 'border-teal bg-teal-soft text-teal' : 'border-line hover:bg-canvas'
                    }`}
                  >
                    {d.title || `${d.day}. nap`}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${btn} inline-flex items-center gap-1`}
                  disabled={weekDays.length >= 7}
                  onClick={() => void addDay(week)}
                >
                  <Plus className="size-4" /> Új nap
                </button>
              </div>

              {day && (
                <>
                  <div className="flex flex-wrap items-end gap-4 border-b border-line px-4 py-3">
                    <label className="block text-xs font-semibold text-muted">
                      A nap címe
                      <DayTitle day={day} ctl={ctl} />
                    </label>
                    {weeks.length > 1 && (
                      <fieldset className="ml-auto">
                        <legend className="text-xs font-semibold text-muted">Módosítás hatóköre (sorozat, ismétlés, ellenállás, szünet, megjegyzés)</legend>
                        <div className="mt-1 flex flex-wrap gap-4">
                          {scopeLabels.map(([v, label]) => (
                            <label key={v} className="flex items-center gap-1.5 text-sm">
                              <input type="radio" name="scope" checked={scope === v} onChange={() => setScope(v)} />
                              {label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}
                    <button type="button" className={`${btn} text-danger`} onClick={() => setDeletingDay(day)}>
                      Nap törlése
                    </button>
                  </div>
                  <DayEditor key={day.id} day={day} ctl={ctl} weekCount={weeks.length} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {copyingWeek && week !== null && (
        <CopyWeekDialog
          data={data}
          fromWeek={week}
          onClose={() => setCopyingWeek(false)}
          onDone={async (to) => {
            setCopyingWeek(false);
            await reload();
            setWeek(to);
            setNotice({ kind: 'ok', text: `A(z) ${week}. hét átmásolva a(z) ${to}. hétre.` });
          }}
        />
      )}
      {deletingDay && (
        <ConfirmDialog
          title="Nap törlése"
          confirmLabel="Törlés"
          danger
          blockedReason={
            deletingDay.has_logs ? 'Ehhez a naphoz ügyfél által naplózott edzés tartozik, ezért nem törölhető.' : null
          }
          onClose={() => setDeletingDay(null)}
          onConfirm={async () => {
            await api.deleteDay(deletingDay.id);
            setDeletingDay(null);
            await reload();
            setNotice({ kind: 'ok', text: 'A nap törölve.' });
          }}
        >
          <p>
            Biztosan törlöd a(z) {deletingDay.week}. hét <strong>{deletingDay.title || `${deletingDay.day}. nap`}</strong> napját a{' '}
            {deletingDay.exercises.length} gyakorlat-sorával együtt? Ez csak ezt a hetet érinti, és nem vonható vissza.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function DayTitle({ day, ctl }: { day: PlanDay; ctl: EditorCtl }) {
  const [draft, setDraft] = useState(day.title ?? '');
  const [bad, setBad] = useState(false);
  useEffect(() => setDraft(day.title ?? ''), [day.title, day.id]);

  async function commit() {
    const next = draft.trim() === '' ? null : draft.trim();
    if (next === day.title) return;
    const ok = await ctl.save(() => api.renameDay(day.id, next));
    setBad(ok === undefined);
    if (ok !== undefined) ctl.patchDay(day.id, { title: next });
  }

  return (
    <input
      value={draft}
      maxLength={60}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={`${input} mt-1 w-56 font-normal text-navy ${bad ? 'border-danger' : ''}`}
    />
  );
}
