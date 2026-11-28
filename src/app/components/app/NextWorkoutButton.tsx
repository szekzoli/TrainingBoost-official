// „Következő edzés” gomb (kezdőlap, Naptár): kétsoros, hosszú napnévnél is rendesen tördel.
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { PlanDay } from '../../../lib/app-api';

export function NextWorkoutButton({ day, className = '' }: { day: PlanDay; className?: string }) {
  return (
    <Link
      to={`/app/d/${day.week}/${day.day}`}
      className={`flex min-h-14 items-center gap-3 rounded-[12px] bg-app-teal px-4 py-3 text-white active:opacity-90 ${className}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wider text-white/80">Következő edzés</span>
        <span className="block text-base font-semibold leading-snug">
          {day.week}. hét · {day.title ?? `${day.day}. nap`}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0" aria-hidden />
    </Link>
  );
}
