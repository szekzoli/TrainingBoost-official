import type { PlanExercise } from '../../../lib/app-api';

// Előírás sáv: SOROZAT | ISMÉTLÉS | ELLENÁLLÁS (a gyakorlat kártyán és a részletek képernyőn is ez jelenik meg)
export default function PrescriptionBar({ item }: { item: PlanExercise }) {
  const cell = 'min-w-0 px-3 py-2';
  const label = 'text-[10px] font-semibold uppercase tracking-wider text-[#5B6B7D]';
  return (
    <dl className="grid grid-cols-3 divide-x divide-[#D5DDE6] border-y border-[#D5DDE6]">
      <div className={cell}>
        <dt className={label}>Sorozat</dt>
        <dd className="mt-0.5 text-sm font-semibold">{item.sets}</dd>
      </div>
      <div className={cell}>
        <dt className={label}>Ismétlés</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold">{item.reps}</dd>
      </div>
      <div className={cell}>
        <dt className={label}>Ellenállás</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold text-app-teal">
          {item.resistance?.trim() || '–'}
        </dd>
      </div>
    </dl>
  );
}
