import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { Reveal } from './Reveal';

// „Melyik neked való?” – három rövid kérdés, a végén egy ajánlás (és egy alternatíva).
// Csak a böngészőben fut, semmit nem küld el és nem tárol.

type Who = 'csoport' | 'edzo' | 'paros' | 'onallo';
type When = 'reggel' | 'kesobb' | 'valtozo';
type Where = 'terem' | 'kint' | 'mindegy';

type Answers = { who?: Who; when?: When; where?: Where };

type Offer = { key: string; title: string; to: string; text: string };

const OFFERS: Record<string, Offer> = {
  mb: {
    key: 'mb',
    title: 'Morning Boost',
    to: '/morning-boost',
    text: 'Reggeli csoportos funkcionális edzés a teremben, kis létszámmal. Alapos bemelegítés, körök, a végén core és nyújtás. Kezdőként is be lehet kapcsolódni.',
  },
  kint: {
    key: 'kint',
    title: 'Kültéri edzés',
    to: '/outdoor-training',
    text: 'Csoportos edzés a szabadban, a felszerelést én viszem. Jó választás, ha szereted a friss levegőt és a társaságot.',
  },
  pt: {
    key: 'pt',
    title: 'Személyi edzés',
    to: '/personal-training',
    text: 'Négyszemközt, a célodhoz és a mostani formádhoz igazítva. Minden alkalommal ott vagyok melletted, figyelek a technikára és a terhelésre.',
  },
  paros: {
    key: 'paros',
    title: 'Páros edzés',
    to: '/personal-training',
    text: 'Személyi edzés kettesben egy társsal, közös programmal és közös haladással. Alkalmanként, 2 főre szól az ár.',
  },
  terv: {
    key: 'terv',
    title: 'Személyre szabott edzésterv',
    to: '/personal-training',
    text: 'Ha a saját tempódban, egyedül edzel: a célodhoz igazított terv, közös átvétellel, saját követő oldallal a telefonodon, és időszakonként frissítjük.',
  },
};

function recommend(a: Required<Answers>): { main: Offer; alt?: Offer; why: string } {
  if (a.who === 'edzo') {
    return {
      main: OFFERS.pt,
      alt: a.when === 'reggel' && a.where !== 'kint' ? OFFERS.mb : OFFERS.terv,
      why: 'Edzővel, egyénileg szeretnél edzeni.',
    };
  }
  if (a.who === 'paros') {
    return { main: OFFERS.paros, alt: a.where === 'kint' ? OFFERS.kint : OFFERS.mb, why: 'Egy társsal együtt edzenél.' };
  }
  if (a.who === 'onallo') {
    return { main: OFFERS.terv, alt: OFFERS.pt, why: 'Önállóan, a saját időbeosztásod szerint edzenél.' };
  }
  // Csoport
  if (a.where === 'kint') {
    return { main: OFFERS.kint, alt: a.when === 'reggel' ? OFFERS.mb : undefined, why: 'Csoportban, a szabadban edzenél.' };
  }
  if (a.when === 'reggel' || a.when === 'valtozo' || a.where === 'terem') {
    return {
      main: OFFERS.mb,
      alt: a.where === 'terem' ? undefined : OFFERS.kint,
      why: a.when === 'reggel' ? 'Csoportban edzenél, és a reggel neked jó.' : 'Csoportban edzenél.',
    };
  }
  return { main: OFFERS.kint, alt: OFFERS.mb, why: 'Csoportban edzenél, inkább később napközben.' };
}

const QUESTIONS: {
  id: keyof Answers;
  q: string;
  options: { v: string; label: string }[];
}[] = [
  {
    id: 'who',
    q: 'Hogyan edzenél a legszívesebben?',
    options: [
      { v: 'csoport', label: 'Csoportban, társaságban' },
      { v: 'edzo', label: 'Egyénileg, edzővel' },
      { v: 'paros', label: 'Kettesben egy társsal' },
      { v: 'onallo', label: 'Önállóan, saját tempóban' },
    ],
  },
  {
    id: 'when',
    q: 'Mikor férne bele az edzés?',
    options: [
      { v: 'reggel', label: 'Reggel, munka előtt' },
      { v: 'kesobb', label: 'Napközben vagy este' },
      { v: 'valtozo', label: 'Változó, rugalmas vagyok' },
    ],
  },
  {
    id: 'where',
    q: 'Hol edzenél?',
    options: [
      { v: 'terem', label: 'Teremben' },
      { v: 'kint', label: 'A szabadban' },
      { v: 'mindegy', label: 'Mindegy' },
    ],
  },
];

export function ServiceChooser() {
  const [a, setA] = useState<Answers>({});
  const step = QUESTIONS.findIndex((q) => !a[q.id]);
  const done = step === -1;
  const result = done ? recommend(a as Required<Answers>) : null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24" aria-labelledby="chooser-title">
      <Reveal>
        <div className="rounded-3xl border border-accent/30 bg-accent/5 p-6 md:p-10">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="h-4 w-4" /> Három kérdés
          </p>
          <h2 id="chooser-title" className="mt-2 font-display text-3xl font-bold md:text-4xl">
            Melyik neked való?
          </h2>

          {!done && (
            <div className="mt-6" aria-live="polite">
              <div className="flex items-center gap-2" aria-hidden>
                {QUESTIONS.map((q, i) => (
                  <span key={q.id} className={`h-1.5 w-10 rounded-full ${i <= step ? 'bg-accent' : 'bg-border'}`} />
                ))}
              </div>
              <p className="mt-4 font-display text-xl font-semibold">{QUESTIONS[step].q}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {QUESTIONS[step].options.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setA((prev) => ({ ...prev, [QUESTIONS[step].id]: o.v }))}
                    className="min-h-12 rounded-2xl border border-border bg-card px-4 py-3 text-left font-medium shadow-[var(--shadow-soft)] transition hover:border-accent hover:text-accent"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setA((prev) => ({ ...prev, [QUESTIONS[step - 1].id]: undefined }))}
                  className="mt-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  ‹ Vissza
                </button>
              )}
            </div>
          )}

          {result && (
            <div className="mt-6" aria-live="polite">
              <p className="text-muted-foreground">{result.why} Ezt ajánlom:</p>
              <div className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <h3 className="font-display text-2xl font-bold">{result.main.title}</h3>
                <p className="mt-2 text-muted-foreground">{result.main.text}</p>
                <Link
                  to={result.main.to}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-soft)]"
                >
                  Megnézem <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {result.alt && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Ez is szóba jöhet:{' '}
                  <Link to={result.alt.to} className="font-semibold text-accent underline-offset-4 hover:underline">
                    {result.alt.title}
                  </Link>
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => setA({})}
                  className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-4 w-4" /> Újrakezdem
                </button>
                <span className="text-muted-foreground">
                  Nem vagy biztos benne?{' '}
                  <Link to="/contact" className="font-semibold text-accent underline-offset-4 hover:underline">
                    Írj, és megbeszéljük
                  </Link>
                  .
                </span>
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}
