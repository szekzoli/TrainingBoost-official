// Ügyfelekhez kapcsolódó kis megjelenítő elemek (lista és áttekintő közösen használja).
import type { ClientRow } from '../api';

/** ÉÉÉÉ-HH-NN vagy időbélyeg -> "2026. 11. 20." */
export const fmtDay = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('hu-HU') : '–';

/** A mai nap (helyi idő) ÉÉÉÉ-HH-NN formában. */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Hány nap múlva (negatív: hány napja) a dátum. */
export function daysUntil(iso: string): number {
  const a = new Date(`${todayLocal()}T12:00:00`).getTime();
  const b = new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export function relDays(iso: string | null | undefined): string {
  if (!iso) return 'még nincs';
  const n = -daysUntil(iso);
  if (n <= 0) return 'ma';
  if (n === 1) return 'tegnap';
  return `${n} napja`;
}

export function DueBadge({ client }: { client: ClientRow }) {
  if (!client.plan_due_on || client.revoked_at) return <span className="text-xs text-muted">–</span>;
  const n = daysUntil(client.plan_due_on);
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap';
  if (client.due_status === 'overdue') {
    return <span className={`${base} border border-danger/40 bg-danger-soft text-danger`}>lejárt ({-n} napja)</span>;
  }
  if (client.due_status === 'soon') {
    return (
      <span className={`${base} border border-amber-400 bg-amber-50 text-amber-900`}>
        {n === 0 ? 'ma esedékes' : `${n} nap múlva`}
      </span>
    );
  }
  return <span className="text-sm tabular-nums">{fmtDay(client.plan_due_on)}</span>;
}

export function ProgressCell({ client }: { client: ClientRow }) {
  const { days_done: done, days_total: total } = client;
  return (
    <div className="min-w-24">
      <div className="text-xs tabular-nums text-muted">
        {done} / {total} edzés
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-line" aria-hidden="true">
        <div className="h-full rounded-full bg-teal-fill" style={{ width: total ? `${Math.min(100, (done / total) * 100)}%` : '0%' }} />
      </div>
    </div>
  );
}
