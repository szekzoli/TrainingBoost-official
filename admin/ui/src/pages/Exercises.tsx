import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiFailure, type Exercise } from '../api';
import Modal from '../components/Modal';
import { getVideoInfo } from '../../../../src/lib/video';
import { CATEGORIES, EQUIPMENT, MUSCLES, TYPES, typeOf, withCurrent } from '../lib/taxonomy';

// Ékezet- és kisbetű-független összehasonlítás a kereséshez
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

type Saving = 'idle' | 'saving' | 'error';

function ExerciseForm({
  initial,
  categories,
  hrSupported,
  onClose,
  onSaved,
}: {
  initial: Exercise | null;
  categories: string[];
  /** A szerveren már van track_hr oszlop (a 009-es SQL lefutott). */
  hrSupported: boolean;
  onClose: () => void;
  onSaved: (e: Exercise) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [equipment, setEquipment] = useState(initial?.equipment ?? '');
  const [muscle, setMuscle] = useState(initial?.muscle_group ?? '');
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [imageBroken, setImageBroken] = useState(false);
  const [note, setNote] = useState(initial?.technique_note ?? '');
  // Új gyakorlatnál a Kondi / intenzív kategória alapból kéri a pulzust
  const [trackHr, setTrackHr] = useState<boolean | null>(initial ? (initial.track_hr ?? false) : null);
  const trackHrValue = trackHr ?? category.trim() === 'Kondi / intenzív';
  const [state, setState] = useState<Saving>('idle');
  const [error, setError] = useState<string | null>(null);

  const trimmedVideo = videoUrl.trim();
  const video = trimmedVideo ? getVideoInfo(trimmedVideo) : null;
  const videoInvalid = trimmedVideo !== '' && video === null;
  const trimmedImage = imageUrl.trim();
  const imageInvalid = trimmedImage !== '' && !/^https:\/\/[^\s/]+\.[^\s]+$/i.test(trimmedImage);
  const canSave = name.trim() !== '' && !videoInvalid && !imageInvalid && state !== 'saving';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setState('saving');
    setError(null);
    const payload = {
      name,
      category: category.trim() || null,
      equipment: equipment || null,
      muscle_group: muscle || null,
      video_url: trimmedVideo || null,
      image_url: trimmedImage || null,
      technique_note: note.trim() || null,
      // A 009-es SQL előtt a mező nem létezik: csak akkor küldjük, ha a szerver már ismeri
      ...(hrSupported ? { track_hr: trackHrValue } : {}),
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

        <div className="grid grid-cols-3 gap-3">
          <label className="block text-sm font-semibold">
            Mozgásminta
            <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">–</option>
              {withCurrent([...CATEGORIES, ...categories.filter((c) => !CATEGORIES.includes(c))], category).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Fő izomcsoport
            <select className={input} value={muscle} onChange={(e) => setMuscle(e.target.value)}>
              <option value="">–</option>
              {withCurrent(MUSCLES, muscle).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Eszköz
            <select className={input} value={equipment} onChange={(e) => setEquipment(e.target.value)}>
              <option value="">–</option>
              {withCurrent(EQUIPMENT, equipment).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {equipment && <span className="mt-1 block text-xs font-normal text-muted">{typeOf(equipment)}</span>}
          </label>
        </div>

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

        <div>
          <label className="block text-sm font-semibold">
            Kép link <span className="font-normal text-muted">(https://…, pl. a saját oldaladról vagy Imgurról)</span>
            <input
              className={input}
              value={imageUrl}
              maxLength={500}
              placeholder="https://…/gyakorlat.jpg"
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImageBroken(false);
              }}
            />
          </label>
          {imageInvalid && (
            <p className="mt-1 text-xs font-semibold text-danger">A kép linkje https:// kezdetű webcím legyen, vagy hagyd üresen.</p>
          )}
          {trimmedImage && !imageInvalid && (
            <div className="mt-2 flex items-center gap-3">
              {!imageBroken && (
                <img
                  src={trimmedImage}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setImageBroken(true)}
                  className="h-20 w-28 rounded-[10px] border border-line object-cover"
                />
              )}
              <span className={`text-xs ${imageBroken ? 'font-semibold text-danger' : 'text-muted'}`}>
                {imageBroken
                  ? 'A kép nem tölthető be erről a linkről. Közvetlen képlinket adj meg (a link .jpg/.png/.webp képre mutasson).'
                  : 'Előnézet. Az ügyfél a gyakorlat részleteinél és a kártyán látja.'}
              </span>
            </div>
          )}
        </div>

        {hrSupported && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={trackHrValue}
              onChange={(e) => setTrackHr(e.target.checked)}
            />
            <span>
              <span className="font-semibold">Pulzus rögzítése</span>
              <span className="block text-muted">
                Az ügyfél-appban a sorozatok mellett pulzus mező is van (erő-állóképességi, állóképességi gyakorlatokhoz).
              </span>
            </span>
          </label>
        )}

        <label className="block text-sm font-semibold">
          Leírás, technika <span className="font-normal text-muted">(hosszabb szöveg is lehet; a sortörések megmaradnak)</span>
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
  const [fCat, setFCat] = useState('');
  const [fMuscle, setFMuscle] = useState('');
  const [fType, setFType] = useState('');
  const [fEquip, setFEquip] = useState('');
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
      .filter((i) => !q || fold(i.name).includes(q) || fold(i.category ?? '').includes(q) || fold(i.muscle_group ?? '').includes(q))
      .filter((i) => !fCat || (fCat === '-' ? !i.category : i.category === fCat))
      .filter((i) => !fMuscle || (fMuscle === '-' ? !i.muscle_group : i.muscle_group === fMuscle))
      .filter((i) => !fType || typeOf(i.equipment) === fType)
      .filter((i) => !fEquip || i.equipment === fEquip)
      .sort((a, b) => a.name.localeCompare(b.name, 'hu'));
  }, [items, query, showArchived, fCat, fMuscle, fType, fEquip]);
  const filtering = !!(fCat || fMuscle || fType || fEquip);

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

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {(
          [
            ['Mozgásminta', fCat, setFCat, CATEGORIES],
            ['Izomcsoport', fMuscle, setFMuscle, MUSCLES],
            ['Típus', fType, setFType, [...TYPES]],
            ['Eszköz', fEquip, setFEquip, EQUIPMENT],
          ] as [string, string, (v: string) => void, string[]][]
        ).map(([label, value, set, list]) => (
          <select
            key={label}
            aria-label={label}
            value={value}
            onChange={(e) => set(e.target.value)}
            className={`h-9 rounded-[10px] border bg-white px-2 text-sm ${value ? 'border-teal font-semibold text-teal' : 'border-line'}`}
          >
            <option value="">{label}: mind</option>
            {list.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
            {label !== 'Típus' && label !== 'Eszköz' && <option value="-">(nincs megadva)</option>}
          </select>
        ))}
        {filtering && (
          <button
            type="button"
            className={btn}
            onClick={() => {
              setFCat('');
              setFMuscle('');
              setFType('');
              setFEquip('');
            }}
          >
            Szűrők törlése
          </button>
        )}
        <span className="ml-auto text-xs text-muted">{visible.length} gyakorlat</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-[14px] border border-line bg-white">
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
                <th className={th}>Mozgásminta</th>
                <th className={th}>Izomcsoport</th>
                <th className={th}>Eszköz</th>
                <th className={th}>Média</th>
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
                    {i.track_hr && (
                      <span className="ml-2 rounded-full border border-teal/40 px-2 py-0.5 text-xs font-semibold text-teal" title="Pulzus rögzítése">
                        ♥ pulzus
                      </span>
                    )}
                    {i.archived && (
                      <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted">
                        archivált
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{i.category ?? '–'}</td>
                  <td className="px-4 py-3">{i.muscle_group ?? '–'}</td>
                  <td className="px-4 py-3">
                    {i.equipment ?? '–'}
                    {i.equipment && <span className="block text-xs text-muted">{typeOf(i.equipment)}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {i.video_url ? (
                      getVideoInfo(i.video_url) ? (
                        <span className="font-semibold text-teal">videó</span>
                      ) : (
                        <span className="font-semibold text-danger" title="A mentett link nem ismerhető fel">
                          hibás link
                        </span>
                      )
                    ) : (
                      !i.image_url && '–'
                    )}
                    {i.image_url && <span className="ml-2 font-semibold text-teal">kép</span>}
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
          hrSupported={(items ?? []).some((i) => i.track_hr !== undefined)}
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
