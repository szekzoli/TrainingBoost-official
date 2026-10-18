import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, errorMessage, type ClientRow, type PlanSummary } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import { btn, btnGhost, btnPrimary, input } from '../lib/util';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('hu-HU');

// "V-0001" jellegű következő sorszám a meglévő azonosítók alapján
function suggestLabel(clients: ClientRow[]): string {
  let max = 0;
  for (const c of clients) {
    const m = /^V-(\d+)$/i.exec(c.label);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `V-${String(max + 1).padStart(4, '0')}`;
}

// Puha figyelmeztetés: két vagy több szavas, betűs érték teljes névnek látszik
const looksLikeName = (s: string) => (s.trim().match(/\p{L}{2,}/gu) ?? []).length >= 2;

const NAME_WARNING =
  'Az azonosítóba ne írd az ügyfél teljes nevét. Használj belső jelölést (pl. V-0001), a név és az azonosító megfeleltetését csak te tudd.';

function NameWarning({ value }: { value: string }) {
  return (
    <div className="space-y-1">
      <p className="rounded-[10px] border border-line bg-canvas px-3 py-2 text-xs text-muted">{NAME_WARNING}</p>
      {looksLikeName(value) && (
        <p role="alert" className="rounded-[10px] border border-amber-400 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          Ez teljes névnek tűnik. Biztosan ezt szeretnéd azonosítóként használni?
        </p>
      )}
    </div>
  );
}

function PlanSelect({ plans, value, onChange }: { plans: PlanSummary[]; value: string; onChange: (id: string) => void }) {
  return (
    <select className={`${input} mt-1`} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">– válassz tervet –</option>
      {plans.map((p) => (
        <option key={p.id} value={p.id}>
          {p.title} ({p.slug})
        </option>
      ))}
    </select>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[10px] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

function NewClientDialog({
  clients,
  plans,
  onClose,
  onCreated,
}: {
  clients: ClientRow[];
  plans: PlanSummary[];
  onClose: () => void;
  onCreated: (client: ClientRow, link: string) => void;
}) {
  const [label, setLabel] = useState(() => suggestLabel(clients));
  const [planId, setPlanId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = label.trim() !== '' && planId !== '' && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.createClient({ label, plan_id: planId });
      onCreated(r.client, r.link);
    } catch (err) {
      setBusy(false);
      setError(errorMessage(err));
    }
  }

  return (
    <Modal title="Új ügyfél" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">
          Azonosító (belső jelölés) <span className="text-danger">*</span>
          <input className={`${input} mt-1`} value={label} maxLength={40} autoFocus onChange={(e) => setLabel(e.target.value)} />
        </label>
        <NameWarning value={label} />
        <label className="block text-sm font-semibold">
          Terv <span className="text-danger">*</span>
          <PlanSelect plans={plans} value={planId} onChange={setPlanId} />
        </label>
        {plans.length === 0 && <p className="text-xs text-muted">Még nincs terv. Előbb hozz létre egyet a Tervek fülön.</p>}
        <FormError message={error} />
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" className={btnGhost} onClick={onClose}>
            Mégse
          </button>
          <button type="submit" className={btnPrimary} disabled={!valid}>
            {busy ? 'Létrehozás…' : 'Létrehozás'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// A link csak itt, egyszer látszik. Esc / háttérkattintás nem zárja be; bezárás csak megerősítés után.
function LinkDialog({ label, link, onClose }: { label: string; link: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  async function copy() {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      field.current?.select();
      setCopyFailed(true);
    }
  }

  return (
    <Modal title="Hozzáférési link" onClose={onClose} wide dismissible={false}>
      <div className="space-y-4 text-sm">
        <p>
          A(z) <strong>{label}</strong> ügyfél hozzáférési linkje:
        </p>
        <div className="flex gap-2">
          <input
            ref={field}
            readOnly
            value={link}
            aria-label="Hozzáférési link"
            onFocus={(e) => e.currentTarget.select()}
            className={`${input} font-mono text-xs`}
          />
          <button type="button" className={btnPrimary} onClick={() => void copy()}>
            {copied ? 'Másolva ✓' : 'Másolás'}
          </button>
        </div>
        {copyFailed && <p className="text-xs text-muted">A másolás nem sikerült, a link ki van jelölve: nyomd meg a Ctrl+C-t.</p>}
        <p role="alert" className="rounded-[10px] border border-amber-400 bg-amber-50 px-3 py-2 font-semibold text-amber-900">
          Ez a link csak most látható. Bezárás után sehol nem kérdezhető le újra, és nem is naplózzuk. Másold ki, és küldd el az
          ügyfélnek. Ha elveszne, új linket kell generálnod (a régi ilyenkor érvénytelen lesz).
        </p>
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          Kimásoltam, el tudom küldeni
        </label>
        <div className="flex justify-end border-t border-line pt-4">
          <button type="button" className={btnPrimary} disabled={!saved} onClick={onClose}>
            Bezárás
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditClientDialog({
  client,
  plans,
  onClose,
  onSaved,
}: {
  client: ClientRow;
  plans: PlanSummary[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [label, setLabel] = useState(client.label);
  const [planId, setPlanId] = useState(client.plan_id);
  const [logCount, setLogCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getClient(client.id)
      .then((c) => setLogCount(c.log_count))
      .catch(() => setLogCount(null));
  }, [client.id]);

  // A jelenlegi terv akkor is kiválasztható marad, ha (már) sablonként van megjelölve
  const options = plans.some((p) => p.id === client.plan_id)
    ? plans
    : [{ id: client.plan_id, title: client.plan_title, slug: client.plan_slug } as PlanSummary, ...plans];

  const planChanged = planId !== client.plan_id;
  const dirty = planChanged || label.trim() !== client.label;
  const valid = label.trim() !== '' && planId !== '' && dirty && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    const patch: { label?: string; plan_id?: string } = {};
    if (label.trim() !== client.label) patch.label = label;
    if (planChanged) patch.plan_id = planId;
    try {
      await api.updateClient(client.id, patch);
      await onSaved();
    } catch (err) {
      setBusy(false);
      setError(errorMessage(err));
    }
  }

  return (
    <Modal title="Ügyfél szerkesztése" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">
          Azonosító
          <input className={`${input} mt-1`} value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <NameWarning value={label} />
        <label className="block text-sm font-semibold">
          Terv
          <PlanSelect plans={options} value={planId} onChange={setPlanId} />
        </label>
        {planChanged && (
          <p className="rounded-[10px] border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            A hozzáférési link nem változik, az ügyfél az új tervet látja.{' '}
            {logCount !== null && logCount > 0 ? (
              <strong>
                Az ügyfélnek {logCount} naplózott edzése van a régi tervből: ezek megmaradnak, de az új terven nem jelennek meg.
              </strong>
            ) : logCount === null ? (
              'A naplózott edzések száma nem kérdezhető le: ha vannak, azok a régi tervhez tartoznak, és az új terven nem jelennek meg.'
            ) : (
              'Nincs naplózott edzése.'
            )}
          </p>
        )}
        <FormError message={error} />
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" className={btnGhost} onClick={onClose}>
            Mégse
          </button>
          <button type="submit" className={btnPrimary} disabled={!valid}>
            {busy ? 'Mentés…' : 'Mentés'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Clients() {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ label: string; link: string } | null>(null);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [revoking, setRevoking] = useState<ClientRow | null>(null);
  const [rotating, setRotating] = useState<ClientRow | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [showRevoked, setShowRevoked] = useState(true);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [c, p] = await Promise.all([api.listClients(), api.listPlans(false)]);
      setClients(c);
      setPlans(p);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (notice?.kind !== 'ok') return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const visible = useMemo(
    () => (clients ?? []).filter((c) => showRevoked || c.revoked_at === null),
    [clients, showRevoked],
  );

  async function restore(c: ClientRow) {
    setNotice({ kind: 'ok', text: 'Mentés…' });
    try {
      await api.updateClient(c.id, { revoked: false });
      await load();
      setNotice({ kind: 'ok', text: `Visszaállítva: ${c.label}` });
    } catch (err) {
      setNotice({ kind: 'error', text: errorMessage(err) });
    }
  }

  const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="mr-auto text-2xl font-bold">Ügyfelek</h1>
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)} disabled={clients === null}>
          Új ügyfél
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showRevoked} onChange={(e) => setShowRevoked(e.target.checked)} />
          Visszavontak is
        </label>
        <span aria-live="polite" className={`ml-auto text-sm ${notice?.kind === 'error' ? 'font-semibold text-danger' : 'text-teal'}`}>
          {notice?.text}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-[14px] border border-line bg-white">
        {loadError ? (
          <div className="p-6 text-sm">
            <p role="alert" className="text-danger">
              {loadError}
            </p>
            <button type="button" className={`${btn} mt-3`} onClick={() => void load()}>
              Újrapróbálom
            </button>
          </div>
        ) : clients === null ? (
          <p className="p-6 text-sm text-muted">Betöltés…</p>
        ) : visible.length === 0 ? (
          <p className="p-6 text-sm text-muted">{clients.length === 0 ? 'Még nincs ügyfél.' : 'Nincs megjeleníthető ügyfél.'}</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-line">
              <tr>
                <th className={th}>Azonosító</th>
                <th className={th}>Terv</th>
                <th className={th}>Létrehozva</th>
                <th className={th}>Állapot</th>
                <th className={th}>
                  <span className="sr-only">Műveletek</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className={`border-b border-line last:border-b-0 ${c.revoked_at ? 'bg-canvas text-muted' : ''}`}>
                  <td className="px-4 py-3 font-semibold">{c.label}</td>
                  <td className="px-4 py-3">{c.plan_title}</td>
                  <td className="px-4 py-3 tabular-nums">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    {c.revoked_at ? (
                      <span className="rounded-full border border-danger/40 px-2 py-0.5 text-xs font-semibold text-danger">
                        visszavont ({fmtDate(c.revoked_at)})
                      </span>
                    ) : (
                      <span className="rounded-full border border-teal px-2 py-0.5 text-xs font-semibold text-teal">aktív</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" className={btn} onClick={() => setEditing(c)}>
                        Szerkesztés
                      </button>
                      <button type="button" className={btn} onClick={() => setRotating(c)}>
                        Új link
                      </button>
                      {c.revoked_at ? (
                        <button type="button" className={btn} onClick={() => void restore(c)}>
                          Visszaállítás
                        </button>
                      ) : (
                        <button type="button" className={`${btn} text-danger`} onClick={() => setRevoking(c)}>
                          Visszavonás
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">
        A hozzáférési link csak a létrehozáskor (vagy új link generálásakor) látható egyszer, később nem kérdezhető le. Visszavonás után a link azonnal érvénytelen,
        a naplózott adatok megmaradnak, és a visszaállítással a link újra működik.
      </p>

      {creating && clients && (
        <NewClientDialog
          clients={clients}
          plans={plans}
          onClose={() => setCreating(false)}
          onCreated={(client, link) => {
            setCreating(false);
            setCreated({ label: client.label, link });
            void load();
          }}
        />
      )}
      {created && <LinkDialog label={created.label} link={created.link} onClose={() => setCreated(null)} />}
      {editing && clients && (
        <EditClientDialog
          client={editing}
          plans={plans}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
            setNotice({ kind: 'ok', text: 'Mentve.' });
          }}
        />
      )}
      {rotating && (
        <ConfirmDialog
          title="Új hozzáférési link"
          confirmLabel="Új link generálása"
          danger
          onClose={() => setRotating(null)}
          onConfirm={async () => {
            const r = await api.regenerateLink(rotating.id);
            setRotating(null);
            setCreated({ label: r.client.label, link: r.link });
            void load();
          }}
        >
          <p>
            Új linket generálsz a(z) <strong>{rotating.label}</strong> ügyfélnek. A <strong>régi link azonnal érvénytelen lesz</strong>, az
            új linket el kell küldeni az ügyfélnek. A naplózott adatai megmaradnak.
          </p>
          {rotating.revoked_at && (
            <p className="text-muted">Az ügyfél hozzáférése jelenleg vissza van vonva, az új link is csak a visszaállítás után működik.</p>
          )}
        </ConfirmDialog>
      )}
      {revoking && (
        <ConfirmDialog
          title="Hozzáférés visszavonása"
          confirmLabel="Visszavonás"
          danger
          onClose={() => setRevoking(null)}
          onConfirm={async () => {
            await api.updateClient(revoking.id, { revoked: true });
            setRevoking(null);
            await load();
            setNotice({ kind: 'ok', text: `Visszavonva: ${revoking.label}` });
          }}
        >
          <p>
            Visszavonod a(z) <strong>{revoking.label}</strong> hozzáférését? A linkje azonnal érvénytelen lesz („Ez a link nem érvényes”),
            a naplózott adatai megmaradnak. Később visszaállítható.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
