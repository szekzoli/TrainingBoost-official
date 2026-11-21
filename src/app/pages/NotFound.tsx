import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center md:py-32">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent">404</p>
      <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">Ez az oldal nem található</h1>
      <p className="mt-4 text-muted-foreground">
        Lehet, hogy elírás van a címben, vagy az oldal időközben megszűnt. Innen biztosan tovább tudsz menni:
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-elegant)] transition hover:-translate-y-0.5"
        >
          Főoldal
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/morning-boost"
          className="inline-flex items-center rounded-full border border-primary/20 bg-background px-6 py-3 text-sm font-semibold transition hover:bg-secondary"
        >
          Morning Boost
        </Link>
        <Link
          to="/contact"
          className="inline-flex items-center rounded-full border border-primary/20 bg-background px-6 py-3 text-sm font-semibold transition hover:bg-secondary"
        >
          Kapcsolat
        </Link>
      </div>
    </section>
  );
}
