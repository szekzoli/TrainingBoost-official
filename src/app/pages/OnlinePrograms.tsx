import { CircleCheck, ArrowRight } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { ApplyForm } from '../components/ApplyForm';

export default function OnlinePrograms() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-gradient-warm">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-70"></div>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wider text-accent">Online programok</p>
            </Reveal>
            <Reveal delay={1}>
              <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
                Core edzés <span className="bg-gradient-accent bg-clip-text text-transparent italic">bárhol, bármikor</span>
              </h1>
            </Reveal>
            <Reveal delay={2}>
              <p className="mt-5 text-lg text-muted-foreground">
                Ha nem tudsz személyesen részt venni, de szeretnéd magadévá tenni a core aktiváló gyakorlatokat és a stabil alap megteremtését — egyéni online edzésprogramokat állítok össze.
              </p>
            </Reveal>

            <Reveal delay={3}>
              <div className="mt-8">
                <a href="#apply" className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-8 py-3.5 text-base font-semibold text-accent-foreground shadow-[var(--shadow-elegant)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]">
                  Érdeklődöm
                  <ArrowRight className="h-5 w-5" />
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={2}>
            <div className="relative">
              <div className="absolute -inset-3 -z-10 rounded-3xl bg-gradient-accent opacity-25 blur-2xl"></div>
              <img
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1280&h=896&fit=crop"
                alt="Online edzésprogramok"
                className="rounded-2xl object-cover shadow-[var(--shadow-elegant)]"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <h2 className="font-display text-3xl font-bold md:text-4xl">Hogyan működik</h2>
        </Reveal>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Reveal delay={1}>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <h3 className="font-display text-xl font-semibold">Személyre szabott terv</h3>
              <ul className="mt-4 space-y-2">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                  Konzultáció a céljaidról és lehetőségeidről
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                  Saját felszereléshez és környezethez igazított terv
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                  Részletes videós gyakorlat-magyarázatok
                </li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <h3 className="font-display text-xl font-semibold">Folyamatos kapcsolat</h3>
              <ul className="mt-4 space-y-2">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                  Email és üzenet alapú technika-támogatás
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                  Visszajelzés videóid alapján
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                  Heti terv-frissítések és progresszió nyomon követése
                </li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={3}>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <h3 className="font-display text-xl font-semibold">Core fókusz</h3>
              <ul className="mt-4 space-y-2">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                  Stabil törzs és farizom aktiváció
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                  Funkcionális erősítő mozgások
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                  Egylábas stabilitás és egyensúlyjavítás
                </li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="apply" className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Érdekel az online program</h2>
            <p className="mt-2 text-muted-foreground">
              Írd meg, mit szeretnél elérni és milyen körülmények között edzenél — egyedi ajánlatot küldök.
            </p>
          </Reveal>

          <Reveal delay={1} className="mt-10">
            <ApplyForm
              type="online-programs"
              submitLabel="Ajánlatot kérek"
              messagePlaceholder="Célok, jelenlegi edzettség, rendelkezésre álló eszközök…"
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
