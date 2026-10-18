import { useEffect, useRef, type ReactNode } from 'react';

// Natív <dialog>: fókuszcsapda, Esc és háttér kezelése a böngészőtől.
export default function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-full rounded-[14px] border border-line bg-white p-0 text-navy shadow-xl backdrop:bg-navy/40 ${
        wide ? 'max-w-2xl' : 'max-w-md'
      }`}
    >
      <div className="border-b border-line px-6 py-4">
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}
