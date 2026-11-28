// Áttekintés: mit kell ma csinálni? Figyelendő edzések, esedékes új tervek, inaktív ügyfelek, legutóbbi aktivitás, sablonok.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage, type AttentionItem, type ClientRow, type PlanSummary } from '../api';
import { DueBadge, ProgressCell, daysUntil, fmtDay, relDays } from '../components/ClientBits';
import { btn, btnGhost } from '../lib/util';

const INACTIVE_DAYS = 10;

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Stat({ label, value, to }: { label: string; value: number | string; to: string }) {
  return (
    <Link to={to} className="rounded-[14px] border border-line bg-white px-5 py-4 hover:border-teal">
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </Link>
  );
}

function ClientLine({ c, extra }: { c: ClientRow; extra: React.ReactNode }) {
  return (
    <li className="flex items-center gap-4 py-2.5">
      <div className="min-w-0 flex-1">
        <Link to={`/ugyfel/${c.id}`} className="font-semibold hover:text-teal hover:underline">
          {c.label}
        </Link>
        <Link to={`/terv/${c.plan_id}`} className="block truncate text-xs text-muted hover:text-teal hover:underline">
          {c.plan_title}
        </Link>
      </div>
      <div className="w-36 shrink-0">
        <ProgressCell client={c} />
      </div>
      <div className="w-36 shrink-0 text-right">{extra}</div>
    </li>
  );
}

const RATING_TEXT: Record<number, string> = { 1: 'nagyon könnyű', 5: 'nagyon nehéz' };

/** Címke a jelzés fajtájához: a fájdalom pirossal, a többi semleges. */
function Flag({ text, strong }: { text: string; strong?: boolean }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
        strong ? 'border-danger/40 bg-danger-soft text-danger' : 'border-line bg-canvas text-navy'
      }`}
    >
      {text}
    </span>
  );
}

const hasPain = (s: string | null | undefined) => !!s && /fájt|fáj|fájdal/i.test(s);
const fmtKg = (w: number | null) => (w === null ? null : `${String(w).replace('.', ',')} kg`);

/**
 * Figyelendő: az ügyfelek jelzésértékű edzései (sorozat-megjegyzés, nagyon nehéz / könnyű értékelés,
 * edzés-jegyzet), amíg „Láttam”-ra nem jelölöd. Az ügyfélnek nincs vele teendője.
 */
function AttentionCard() {
  const [items, setItems] = useState<AttentionItem[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.listAttention();
      setItems(r.items);
      setAvailable(r.available);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const seen = async (ids: string[]) => {
    setBusy(true);
    try {
      await api.markReviewed(ids);
      setItems((prev) => (prev ?? []).filter((i) => !ids.includes(i.workout_log_id)));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!available) {
    return (
      <Card title="Figyelendő">
        <p className="text-sm text-muted">A lista a 011-figyelendo.sql lefuttatása után működik (Supabase SQL Editor).</p>
      </Card>
    );
  }

  const list = items ?? [];
  return (
    <Card
      title={`Figyelendő${list.length ? ` (${list.length})` : ''}`}
      action={
        list.length > 1 ? (
          <button
            type="button"
            className="text-xs font-semibold text-teal hover:underline disabled:opacity-40"
            disabled={busy}
            onClick={() => void seen(list.slice(0, 200).map((i) => i.workout_log_id))}
          >
            Mind láttam
          </button>
        ) : undefined
      }
    >
      {error && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {error}
        </p>
      )}
      {!items ? (
        <p className="text-sm text-muted">Betöltés…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted">Nincs új jelzés. A „fájt” címkés vagy megjegyzéses sorozat, a nagyon nehéz vagy könnyű edzés és az edzés-jegyzet kerül ide.</p>
      ) : (
        <ul className="divide-y divide-line">
          {list.map((it) => {
            const pain = hasPain(it.note) || it.sets.some((s) => hasPain(s.note));
            const date = it.performed_on ?? it.completed_at ?? it.last_change;
            return (
              <li key={it.workout_log_id} className="flex gap-4 py-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/ugyfel/${it.client_id}`} className="font-semibold hover:text-teal hover:underline">
                      {it.client_label}
                    </Link>
                    <span className="text-xs text-muted">
                      {fmtDay(date)} · {it.week}. hét · {it.day_title || `${it.day}. nap`}
                    </span>
                    {pain && <Flag text="fájdalom" strong />}
                    {it.rating && RATING_TEXT[it.rating] && <Flag text={RATING_TEXT[it.rating]} />}
                  </div>
                  {it.sets.length > 0 && (
                    <ul className="space-y-0.5 text-sm">
                      {it.sets.map((s) => (
                        <li key={`${s.position}-${s.set_number}`}>
                          <span className="font-semibold">{s.exercise_name}</span>
                          <span className="text-muted">
                            {' '}
                            · {s.set_number}. sorozat
                            {[fmtKg(s.weight_kg), s.reps !== null ? `× ${s.reps}` : null].filter(Boolean).length
                              ? ` · ${[fmtKg(s.weight_kg), s.reps !== null ? `× ${s.reps}` : null].filter(Boolean).join(' ')}`
                              : ''}
                          </span>
                          : <span className={hasPain(s.note) ? 'font-semibold text-danger' : ''}>„{s.note}”</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {it.note && <p className="text-sm italic text-navy/80">Edzés-jegyzet: „{it.note}”</p>}
                </div>
                <button type="button" className={`${btn} shrink-0 self-start`} disabled={busy} onClick={() => void seen([it.workout_log_id])}>
                  Láttam
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [templates, setTemplates] = useState<PlanSummary[]>([]);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, t, p] = await Promise.all([api.listClients(), api.listPlans(true), api.listPlans(false)]);
      setClients(c);
      setTemplates(t);
      setPlans(p);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="rounded-[14px] border border-line bg-white p-6 text-sm">
        <p role="alert" className="text-danger">
          {error}
        </p>
        <button type="button" className={`${btn} mt-3`} onClick={() => void load()}>
          Újrapróbálom
        </button>
      </div>
    );
  }
  if (!clients) return <p className="text-sm text-muted">Betöltés…</p>;

  const active = clients.filter((c) => c.revoked_at === null);
  const due = active
    .filter((c) => c.due_status === 'overdue' || c.due_status === 'soon')
    .sort((a, b) => (a.plan_due_on ?? '').localeCompare(b.plan_due_on ?? ''));
  const lastSeen = (c: ClientRow) => c.last_performed_on ?? c.last_activity;
  const inactive = active
    .filter((c) => {
      const seen = lastSeen(c);
      const since = seen ?? c.plan_started_on ?? c.created_at;
      return -daysUntil(since) >= INACTIVE_DAYS;
    })
    .sort((a, b) => (lastSeen(a) ?? '').localeCompare(lastSeen(b) ?? ''));
  const recent = active
    .filter((c) => c.last_activity)
    .sort((a, b) => (b.last_activity ?? '').localeCompare(a.last_activity ?? ''))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="mr-auto text-2xl font-bold">Áttekintés</h1>
        <a href="/api/reminders.ics" download className={`${btnGhost} inline-flex items-center`}>
          Emlékeztetők naptárba (.ics)
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="aktív ügyfél" value={active.length} to="/ugyfelek" />
        <Stat label="új terv kell (7 napon belül)" value={due.length} to="/ugyfelek?szuro=esedekes" />
        <Stat label="sablon" value={templates.length} to="/sablonok" />
        <Stat label="terv" value={plans.length} to="/tervek" />
      </div>

      <AttentionCard />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Új edzésterv esedékes"
          action={
            <Link to="/ugyfelek?szuro=esedekes" className="text-xs font-semibold text-teal hover:underline">
              Mind
            </Link>
          }
        >
          {due.length === 0 ? (
            <p className="text-sm text-muted">Most senkinek nem esedékes új terv. 👍</p>
          ) : (
            <ul className="divide-y divide-line">
              {due.map((c) => (
                <ClientLine key={c.id} c={c} extra={<DueBadge client={c} />} />
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Nem edzett ${INACTIVE_DAYS}+ napja`}>
          {inactive.length === 0 ? (
            <p className="text-sm text-muted">Mindenki aktív.</p>
          ) : (
            <ul className="divide-y divide-line">
              {inactive.map((c) => (
                <ClientLine
                  key={c.id}
                  c={c}
                  extra={<span className="text-sm text-muted">{lastSeen(c) ? relDays(lastSeen(c)) : 'még nem edzett'}</span>}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card title="Legutóbbi aktivitás">
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Még senki nem naplózott edzést.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((c) => (
                <ClientLine key={c.id} c={c} extra={<span className="text-sm">{relDays(c.last_activity)}</span>} />
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Sablonok"
          action={
            <Link to="/sablonok" className="text-xs font-semibold text-teal hover:underline">
              Kezelés
            </Link>
          }
        >
          {templates.length === 0 ? (
            <p className="text-sm text-muted">Még nincs sablon.</p>
          ) : (
            <ul className="divide-y divide-line">
              {templates.map((t) => {
                const derived = plans.filter((p) => p.based_on_title === t.title).length;
                return (
                  <li key={t.id} className="flex items-center gap-4 py-2.5">
                    <Link to={`/terv/${t.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-teal">
                      {t.title}
                    </Link>
                    <span className="shrink-0 text-xs text-muted">
                      {t.week_count} hét · {t.max_days} nap/hét
                    </span>
                    <span className="w-28 shrink-0 text-right text-xs text-muted">
                      {derived > 0 ? `${derived} terv készült belőle` : 'még nem használt'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-xs text-muted">
        Az emlékeztető dátuma az ügyfélnél állítható („Új terv esedékes”); alapértelmezés: kezdés + a terv hetei. A naptárfájl minden
        letöltéskor friss; importáld a Google Naptárba vagy az Outlookba, 3 nappal előtte jelez. Frissítve: {fmtDay(new Date().toISOString())}
      </p>
    </div>
  );
}
