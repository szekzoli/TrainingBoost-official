// Áttekintés: mit kell ma csinálni? Esedékes új tervek, inaktív ügyfelek, legutóbbi aktivitás, sablonok.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage, type ClientRow, type PlanSummary } from '../api';
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
        <div className="font-semibold">{c.label}</div>
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
