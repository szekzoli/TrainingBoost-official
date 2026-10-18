import { useState, type ReactNode } from 'react';
import { errorMessage } from '../api';
import { btnGhost } from '../lib/util';
import Modal from './Modal';

// Megerősítő párbeszédablak. A hiba (pl. "ügyfél tartozik hozzá") az ablakban marad, nem omlik össze semmi.
export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger = false,
  blockedReason,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  /** Ha meg van adva, a megerősítés le van tiltva, és ez az indoklás látszik. */
  blockedReason?: string | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setBusy(false);
      setError(errorMessage(err));
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3 text-sm">{children}</div>
      {blockedReason && (
        <p role="alert" className="mt-3 rounded-[10px] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          {blockedReason}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-[10px] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className={btnGhost}>
          Mégse
        </button>
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={busy || !!blockedReason}
          className={`h-10 rounded-[10px] px-5 text-sm font-semibold text-white disabled:opacity-40 ${
            danger ? 'bg-danger' : 'bg-navy'
          }`}
        >
          {busy ? 'Folyamatban…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
