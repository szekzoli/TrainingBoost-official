// „Megosztom” gomb: elkészíti a képet, előnézetet mutat, és a telefon megosztás-menüjével küldi tovább
// (Instagram Story, Messenger, mentés a galériába…). Ahol a menü nem érhető el, letölti a képet.
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Share2, X } from 'lucide-react';
import { renderCard, shareImage, type ShareCard } from './share-card';

export function ShareButton({
  makeCard,
  filename,
  label = 'Megosztom',
  compact = false,
}: {
  /** A kártya adatai (a gombnyomáskor számolva). */
  makeCard: () => ShareCard;
  filename: string;
  label?: string;
  /** Csak ikon (pl. a mérföldkő-kártyán). */
  compact?: boolean;
}) {
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const open = async () => {
    setBusy(true);
    try {
      const blob = await renderCard(makeCard());
      setPreview({ blob, url: URL.createObjectURL(blob) });
    } catch {
      toast.error('A képet nem sikerült elkészíteni.');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p.url);
      return null;
    });
  };

  const share = async () => {
    if (!preview) return;
    const r = await shareImage(preview.blob, filename);
    if (r === 'downloaded') toast.success('A kép letöltve.');
    if (r !== 'cancelled') close();
  };

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => void open()}
          disabled={busy}
          aria-label={label}
          className="flex size-9 items-center justify-center rounded-[10px] text-app-ink active:bg-app-navy/5 disabled:opacity-50"
        >
          <Share2 className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void open()}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-app-line px-4 text-sm font-semibold text-app-navy active:bg-app-navy/5 disabled:opacity-50"
        >
          <Share2 className="size-4 text-app-teal" /> {busy ? 'Készül…' : label}
        </button>
      )}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Megosztható kép előnézete"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/70 p-4 print:hidden"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <img
            src={preview.url}
            alt="A megosztható kép előnézete"
            className="max-h-[70vh] w-auto max-w-full rounded-[14px] border border-white/10"
          />
          <div className="flex w-full max-w-xs gap-2">
            <button
              type="button"
              onClick={close}
              aria-label="Bezárás"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-white/30 text-white"
            >
              <X className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => void share()}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[12px] bg-app-teal text-base font-semibold text-white"
            >
              <Share2 className="size-5" /> Megosztom
            </button>
          </div>
        </div>
      )}
    </>
  );
}
