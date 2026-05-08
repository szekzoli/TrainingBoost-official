import { ArrowRight } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { ApplyForm } from '../components/ApplyForm';
import outdoorBoostImage from '../../imports/outdoor.jpg';

export default function OutdoorTraining() {
  return (
    <>
      <section className="relative overflow-visible border-b border-border bg-gradient-warm">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-70"></div>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wider text-accent">Kültéri edzés</p>
            </Reveal>
            <Reveal delay={1}>
              <h1 className="mt-3 font-display text-4xl font-bold leading-snug md:text-5xl">
                Outdoor Boost -
                <span className="bg-gradient-accent bg-clip-text text-transparent italic block leading-tight pr-2">
                  Kültéri edzés
                </span>
              </h1>
            </Reveal>
            <Reveal delay={2}>
              <p className="mt-5 text-lg text-muted-foreground">
                Kültéri csoportos edzés Gödön, az Oázis szabad téri edzőparkban. - részletek hamarosan.
              </p>
            </Reveal>

            <Reveal delay={3}>
              <div className="mt-8">
                <a href="#apply" className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-8 py-3.5 text-base font-semibold text-accent-foreground shadow-[var(--shadow-elegant)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]">
                  Érdekel a kültéri edzés
                  <ArrowRight className="h-5 w-5" />
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={2}>
            <div className="relative">
              <div className="absolute -inset-3 -z-10 rounded-3xl bg-gradient-accent opacity-25 blur-2xl"></div>
              <img
                src={outdoorBoostImage}
                alt="Outdoor edzés"
                className="rounded-2xl object-cover shadow-[var(--shadow-elegant)]"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section id="apply" className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Érdekel a kültéri edzés</h2>
            <p className="mt-2 text-muted-foreground">
              Jelentkezz a kültéri edzésre, és hamarosan felveszem veled a kapcsolatot.
            </p>
          </Reveal>

          <Reveal delay={1} className="mt-10">
            <ApplyForm
              type="outdoor-training"
              submitLabel="Jelentkezem kültéri edzésre"
              messagePlaceholder="Mely napok és edzettségi célok érdekelnek?"
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
