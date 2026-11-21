import { Check, X } from 'lucide-react';
import { Reveal } from './Reveal';

// „Kinek ajánlom?” blokk: kinek szól az edzés, és (őszintén) kinek kevésbé.
export function ForWhom({
  title = 'Kinek ajánlom?',
  items,
  notFor,
}: {
  title?: string;
  items: string[];
  notFor?: { text: string; hint?: React.ReactNode };
}) {
  return (
    <div>
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">Neked szól?</p>
        <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">{title}</h2>
      </Reveal>
      <Reveal delay={1}>
        <ul className="mt-8 grid gap-3 md:grid-cols-2">
          {items.map((t) => (
            <li
              key={t}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-[var(--shadow-soft)] md:text-base"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-accent text-accent-foreground">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Reveal>
      {notFor && (
        <Reveal delay={2}>
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary">
              <X className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <span>
              {notFor.text}
              {notFor.hint && <> {notFor.hint}</>}
            </span>
          </div>
        </Reveal>
      )}
    </div>
  );
}
