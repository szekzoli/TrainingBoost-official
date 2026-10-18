import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiFailure, type Exercise } from '../api';
import Modal from '../components/Modal';
import { getVideoInfo } from '../../../../src/lib/video';

// Ékezet- és kisbetű-független összehasonlítás a kereséshez
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

type Saving = 'idle' | 'saving' | 'error';

function ExerciseForm({
  initial,
  categories,
  onClose,
  onSaved,
}: {
  initial: Exercise | null;
  categories: string[];
  onClose: () => void;
  onSaved: (e: Exercise) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? '');
  const [note, setNote] = useState(initial?.technique_note ?? '');
  const [state, setState] = useState<Saving>('idle');
  const [error, setError] = useState<string | null>(null);

  const trimmedVideo = videoUrl.trim();
  const video = trimmedVideo ? getVideoInfo(trimmedVideo) : null;
  const videoInvalid = trimmedVideo !== '' && video === null;
  const canSave = name.trim() !== '' && !videoInvalid && state !== 'saving';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setState('saving');
    setError(null);
    const payload = {
      name,
      category: category.trim() || null,
      video_url: trimmedVideo || null,
      technique_note: note.trim() || null,
    };
    try {
      const saved = initial ? await api.updateExercise(initial.id, payload) : await api.createExercise(payload);
      onSaved(saved);
    } catch (err) {
      // A bevitt adatok megmaradnak az űrlapban
      setState('error');
      setError(err instanceof ApiFailure ? err.message : 'Ismeretlen hiba történt.');
    }
  }

  const input =
    'mt-1 block w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20';

  return (
    <Modal title={initial ? 'Gyakorlat szerkesztése' : 'Új gyakorlat'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">
          Név <span className="text-danger">*</span>
          <input
            className={input}
            value={name}
            maxLength={120}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="block text-sm font-semibold">
          Kategória <span className="font-normal text-muted">(pl. alsótest, core)</span>
          <input
            className={input}
            value={category}
            maxLength={40}
            list="exercise-categories"
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="exercise-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <div>
          <label className="block text-sm font-semibold">
            Videó link <span className="font-normal text-muted">(YouTube)</span>
            <input
              className={input}
              value={videoUrl}
              maxLength={300}
              placeholder="https://youtu.be/…"
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </label>
          {video && (
            <p className="mt-1 text-xs font-semibold text-teal">
              ✓ Felismerve: YouTube videó{video.vertical ? ' (álló, Shorts)' : ''}
            </p>
          )}
          {videoInvalid && (
            <p className="mt-1 text-xs font-semibold text-danger">
              A link nem ismerhető fel. Adj meg YouTube linket (watch, youtu.be, shorts, embed) vagy a 11 karakteres azonosítót, vagy
              hagyd üresen.
            </p>
          )}
        </div>

        <label className="block text-sm font-semibold">
          Technikai leírás
          <textarea
            className={`${input} min-h-32 resize-y`}
            value={note}
            maxLength={4000}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        {error && (
          <p role="alert" className="rounded-[10px] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
          {state === 'saving' && <span className="mr-auto text-sm text-muted">Mentés…</span>}
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-[10px] border border-line px-4 text-sm font-semibold hover:bg-canvas"
          >
            Mégse
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="h-10 rounded-[10px] bg-navy px-5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Mentés
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmDelete({
  exercise,
  onClose,
  onDeleted,
}: {
  exercise: Exercise;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [state, setState] = useState<Saving>('idle');
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setState('saving');
    setError(null);
    try {
      await api.deleteExercise(exercise.id);
      onDeleted();
    } catch (err) {
      setState('error');
      setError(err instanceof ApiFailure ? err.message : 'Ismeretlen hiba történt.');
    }
  }

  return (
    <Modal title="Gyakorlat törlése" onClose={onClose}>
      <p className="text-sm">
        Biztosan törlöd a(z) <strong>{exercise.name}</strong> gyakorlatot? Ez nem vonható vissza.
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-[10px] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-[10px] border border-line px-4 text-sm font-semibold hover:bg-canvas"
        >
          Mégse
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={state === 'saving'}
          className="h-10 rounded-[10px] bg-danger px-5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {state === 'saving' ? 'Törlés…' : 'Törlés'}
        </button>
      </div>
    </Modal>
  );
}

export default function Exercises() {
  const [items, setItems] = useState<Exercise[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Exercise | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setItems(await api.listExercises());
    } catch (err) {
      setLoadError(err instanceof ApiFailure ? err.message : 'Ismeretlen hiba történt.');
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

  const categories = useMemo(
    () => [...new Set((items ?? []).map((i) => i.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, 'hu')),
    [items],
  );

  const visible = useMemo(() => {
    const q = fold(query.trim());
    return (items ?? [])
      .filter((i) => showArchived || !i.archived)
      .filter((i) => !q || fold(i.name).includes(q) || fold(i.category ?? '').includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'hu'));
  }, [items, query, showArchived]);

  const archivedCount = (items ?? []).filter((i) => i.archived).length;

  async function setArchived(e: Exercise, archived: boolean) {
    setNotice({ kind: 'ok', text: 'Mentés…' });
    try {
      await api.updateExercise(e.id, { archived });
      await load();
      setNotice({ kind: 'ok', text: archived ? `Archiválva: ${e.name}` : `Visszaállítva: ${e.name}` });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof ApiFailure ? err.message : 'Ismeretlen hiba történt.' });
    }
  }

  const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted';
  const btn = 'h-9 rounded-[10px] border border-line px-3 text-xs font-semibold hover:bg-canvas';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="mr-auto text-2xl font-bold">Gyakorlattár</h1>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="h-10 rounded-[10px] bg-navy px-5 text-sm font-semibold text-white"
        >
          Új gyakorlat
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Keresés névre vagy kategóriára…"
          aria-label="Keresés"
          className="h-10 w-80 max-w-full rounded-[10px] border border-line bg-white px-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Archiváltak is{archivedCount > 0 ? ` (${archivedCount})` : ''}
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
            <button type="button" onClick={() => void load()} className={`${btn} mt-3`}>
              Újrapróbálom
            </button>
          </div>
        ) : items === null ? (
          <p className="p-6 text-sm text-muted">Betöltés…</p>
        ) : visible.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            {items.length === 0 ? 'A gyakorlattár még üres.' : 'Nincs a keresésnek megfelelő gyakorlat.'}
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-line">
              <tr>
                <th className={th}>Név</th>
                <th className={th}>Kategória</th>
                <th className={th}>Videó</th>
                <th className={`${th} text-right`}>Tervekben</th>
                <th className={th}>
                  <span className="sr-only">Műveletek</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => (
                <tr key={i.id} className={`border-b border-line last:border-b-0 ${i.archived ? 'bg-canvas text-muted' : ''}`}>
                  <td className="px-4 py-3 font-semibold">
                    {i.name}
                    {i.archived && (
                      <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted">
                        archivált
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{i.category ?? '–'}</td>
                  <td className="px-4 py-3">
                    {i.video_url ? (
                      getVideoInfo(i.video_url) ? (
                        <span className="font-semibold text-teal">van</span>
                      ) : (
                        <span className="font-semibold text-danger" title="A mentett link nem ismerhető fel">
                          hibás link
                        </span>
                      )
                    ) : (
                      '–'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{i.plan_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" className={btn} onClick={() => setEditing(i)}>
                        Szerkesztés
                      </button>
                      {i.archived ? (
                        <button type="button" className={btn} onClick={() => void setArchived(i, false)}>
                          Visszaállítás
                        </button>
                      ) : (
                        <button type="button" className={btn} onClick={() => void setArchived(i, true)}>
                          Archiválás
                        </button>
                      )}
                      {i.plan_count === 0 && (
                        <button
                          type="button"
                          className={`${btn} text-danger`}
                          onClick={() => setDeleting(i)}
                        >
                          Törlés
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
        Tervben szereplő gyakorlat nem törölhető, csak archiválható: az archivált gyakorlat nem jelenik meg a kereséskor, de a meglévő
        tervekben megmarad.
      </p>

      {editing && (
        <ExerciseForm
          initial={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setNotice({ kind: 'ok', text: `Mentve: ${saved.name}` });
            void load();
          }}
        />
      )}
      {deleting && (
        <ConfirmDelete
          exercise={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setNotice({ kind: 'ok', text: `Törölve: ${deleting.name}` });
            setDeleting(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
