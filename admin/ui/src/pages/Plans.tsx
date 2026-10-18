import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorMessage, type PlanSummary } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import { SLUG_RE, btn, btnGhost, btnPrimary, input, slugify } from '../lib/util';

type CopyMode = 'copy' | 'save-as-template' | 'from-template';

// Cím + slug mezők: a slug a címből képződik, amíg kézzel át nem írják.
function TitleSlugFields({
  title,
  slug,
  onTitle,
  onSlug,
  slugError,
}: {
  title: string;
  slug: string;
  onTitle: (v: string) => void;
  onSlug: (v: string) => void;
  slugError: string | null;
}) {
  const slugInvalid = slug !== '' && !SLUG_RE.test(slug);
  return (
    <>
      <label className="block text-sm font-semibold">
        Cím <span className="text-danger">*</span>
        <input className={`${input} mt-1`} value={title} maxLength={120} autoFocus onChange={(e) => onTitle(e.target.value)} />
      </label>
      <label className="block text-sm font-semibold">
        Slug <span className="font-normal text-muted">(kisbetű, szám, kötőjel)</span>
        <input
          className={`${input} mt-1 font-mono`}
          value={slug}
          maxLength={80}
          onChange={(e) => onSlug(e.target.value)}
        />
      </label>
      {slugInvalid && (
        <p className="text-xs font-semibold text-danger">A slug csak kisbetűt, számot és kötőjelet tartalmazhat.</p>
      )}
      {slugError && !slugInvalid && <p className="text-xs font-semibold text-danger">{slugError}</p>}
    </>
  );
}

function useTitleSlug(initialTitle: string) {
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(slugify(initialTitle));
  const [slugTouched, setSlugTouched] = useState(false);
  return {
    title,
    slug,
    setTitle: (v: string) => {
      setTitle(v);
      if (!slugTouched) setSlug(slugify(v));
    },
    setSlug: (v: string) => {
      setSlugTouched(true);
      setSlug(v);
    },
  };
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[10px] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

function NewPlanDialog({
  templates,
  onClose,
  onCreated,
}: {
  templates: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const f = useTitleSlug('');
  const [weeks, setWeeks] = useState(6);
  const [days, setDays] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = f.title.trim() !== '' && SLUG_RE.test(f.slug) && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.createPlan({ title: f.title, slug: f.slug, weeks, days, is_template: templates });
      onCreated(r.id);
    } catch (err) {
      setBusy(false);
      setError(errorMessage(err));
    }
  }

  return (
    <Modal title={templates ? 'Új üres sablon' : 'Új üres terv'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <TitleSlugFields title={f.title} slug={f.slug} onTitle={f.setTitle} onSlug={f.setSlug} slugError={null} />
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-semibold">
            Hetek száma (1–12)
            <input
              type="number"
              min={1}
              max={12}
              className={`${input} mt-1`}
              value={weeks}
              onChange={(e) => setWeeks(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
            />
          </label>
          <label className="block text-sm font-semibold">
            Napok hetente (1–7)
            <input
              type="number"
              min={1}
              max={7}
              className={`${input} mt-1`}
              value={days}
              onChange={(e) => setDays(Math.min(7, Math.max(1, Number(e.target.value) || 1)))}
            />
          </label>
        </div>
        <p className="text-xs text-muted">A napok címe: „A program”, „B program”… Később átnevezhetők.</p>
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

const COPY_TEXT: Record<CopyMode, { title: string; button: string; suffix: string }> = {
  copy: { title: 'Terv másolása', button: 'Másolás', suffix: ' (másolat)' },
  'save-as-template': { title: 'Mentés sablonként', button: 'Mentés sablonként', suffix: ' – sablon' },
  'from-template': { title: 'Új terv sablonból', button: 'Létrehozás', suffix: '' },
};

function CopyDialog({
  mode,
  source,
  onClose,
  onCreated,
}: {
  mode: CopyMode;
  source: PlanSummary;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const text = COPY_TEXT[mode];
  const f = useTitleSlug(source.title + text.suffix);
  const canExpand = mode === 'from-template' && source.week_count === 1;
  const [weeks, setWeeks] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const valid = f.title.trim() !== '' && SLUG_RE.test(f.slug) && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    setSlugError(null);
    const body = { title: f.title, slug: f.slug };
    try {
      const r =
        mode === 'copy'
          ? await api.copyPlan(source.id, body)
          : mode === 'save-as-template'
            ? await api.saveAsTemplate(source.id, body)
            : await api.fromTemplate(source.id, { ...body, weeks: canExpand ? weeks : null });
      onCreated(r.id);
    } catch (err) {
      setBusy(false);
      const msg = errorMessage(err);
      if (/slug/i.test(msg)) setSlugError(msg);
      else setError(msg);
    }
  }

  return (
    <Modal title={text.title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">
          Forrás: <strong className="text-navy">{source.title}</strong>. A napok és a gyakorlat-sorok másolódnak, az ügyfelek és a
          naplók nem.
        </p>
        <TitleSlugFields title={f.title} slug={f.slug} onTitle={f.setTitle} onSlug={f.setSlug} slugError={slugError} />
        {canExpand && (
          <label className="block text-sm font-semibold">
            Hetek száma az új tervben (1–12)
            <input
              type="number"
              min={1}
              max={12}
              className={`${input} mt-1 w-32`}
              value={weeks}
              onChange={(e) => setWeeks(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
            />
            <span className="mt-1 block text-xs font-normal text-muted">
              A sablon egyetlen hete minden hétre átmásolódik.
            </span>
          </label>
        )}
        <FormError message={error} />
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" className={btnGhost} onClick={onClose}>
            Mégse
          </button>
          <button type="submit" className={btnPrimary} disabled={!valid}>
            {busy ? 'Folyamatban…' : text.button}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Plans({ templates }: { templates: boolean }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<PlanSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copying, setCopying] = useState<{ mode: CopyMode; source: PlanSummary } | null>(null);
  const [deleting, setDeleting] = useState<PlanSummary | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setItems(null);
    try {
      setItems(await api.listPlans(templates));
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, [templates]);

  useEffect(() => {
    void load();
  }, [load]);

  const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted';
  const noun = templates ? 'sablon' : 'terv';
  const nounAcc = templates ? 'sablont' : 'tervet';
  const nounDat = templates ? 'sablonhoz' : 'tervhez';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="mr-auto text-2xl font-bold">{templates ? 'Sablonok' : 'Tervek'}</h1>
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
          {templates ? 'Új üres sablon' : 'Új üres terv'}
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-[14px] border border-line bg-white">
        {loadError ? (
          <div className="p-6 text-sm">
            <p role="alert" className="text-danger">
              {loadError}
            </p>
            <button type="button" className={`${btn} mt-3`} onClick={() => void load()}>
              Újrapróbálom
            </button>
          </div>
        ) : items === null ? (
          <p className="p-6 text-sm text-muted">Betöltés…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            Még nincs {noun}.{' '}
            {templates && 'Sablont a Tervek listán a „Mentés sablonként” gombbal készíthetsz egy meglévő tervből.'}
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-line">
              <tr>
                <th className={th}>Cím</th>
                <th className={th}>Slug</th>
                <th className={`${th} text-right`}>Hét × nap</th>
                <th className={`${th} text-right`}>Ügyfelek</th>
                <th className={th}>
                  <span className="sr-only">Műveletek</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 font-semibold">
                    <Link to={`/terv/${p.id}`} className="text-navy underline decoration-line underline-offset-4 hover:text-teal">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{p.slug}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.week_count} × {p.max_days}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.client_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link to={`/terv/${p.id}`} className={`${btn} inline-flex items-center`}>
                        Szerkesztés
                      </Link>
                      <button type="button" className={btn} onClick={() => setCopying({ mode: 'copy', source: p })}>
                        Másolás
                      </button>
                      {templates ? (
                        <button
                          type="button"
                          className={btn}
                          onClick={() => setCopying({ mode: 'from-template', source: p })}
                        >
                          Új terv sablonból
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={btn}
                          onClick={() => setCopying({ mode: 'save-as-template', source: p })}
                        >
                          Mentés sablonként
                        </button>
                      )}
                      <button type="button" className={`${btn} text-danger`} onClick={() => setDeleting(p)}>
                        Törlés
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <NewPlanDialog
          templates={templates}
          onClose={() => setCreating(false)}
          onCreated={(id) => navigate(`/terv/${id}`)}
        />
      )}
      {copying && (
        <CopyDialog
          mode={copying.mode}
          source={copying.source}
          onClose={() => setCopying(null)}
          onCreated={(id) => {
            // Sablonná mentés után a Sablonok lista a természetes folytatás; a többi az új terv szerkesztője
            navigate(`/terv/${id}`);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`${templates ? 'Sablon' : 'Terv'} törlése`}
          confirmLabel="Törlés"
          danger
          blockedReason={
            deleting.client_count > 0
              ? `Ehhez a ${nounDat} ${deleting.client_count} ügyfél tartozik, ezért nem törölhető. Előbb az ügyfelek tervét kell módosítani.`
              : null
          }
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api.deletePlan(deleting.id);
            setDeleting(null);
            await load();
          }}
        >
          <p>
            Biztosan törlöd a(z) <strong>{deleting.title}</strong> {nounAcc} a napjaival és gyakorlat-soraival együtt? Ez nem
            vonható vissza. A gyakorlattár nem változik.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
