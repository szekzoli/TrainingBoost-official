import { CircleCheck, ArrowRight, MapPin, Wallet, Ticket } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { ApplyForm } from '../components/ApplyForm';
import personalTrainingImage from '../../imports/personal-training-page.jpg';

export default function PersonalTraining() {
  return (
    <>
      <section className="relative overflow-visible border-b border-border bg-gradient-warm">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-70"></div>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wider text-accent">Személyi edzés</p>
            </Reveal>
            <Reveal delay={1}>
              <h1 className="mt-3 font-display text-4xl font-bold leading-snug md:text-5xl">
                Személyre szabott út a <span className="bg-gradient-accent bg-clip-text text-transparent italic inline-block leading-tight pr-2">céljaidhoz</span>
              </h1>
            </Reveal>
            <Reveal delay={2}>
              <p className="mt-5 text-lg text-muted-foreground">
                Ha egyéni figyelemre és személyre szabott fejlődésre van szükséged, a személyi edzés neked szól.
                Izomépítés, korrekció, core erősítés, fittség fejlesztése — a fókuszt együtt határozzuk meg.
              </p>
            </Reveal>

            <Reveal delay={3}>
              <div className="mt-8">
                <a href="#apply" className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-8 py-3.5 text-base font-semibold text-accent-foreground shadow-[var(--shadow-elegant)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]">
                  Időpontot kérek
                  <ArrowRight className="h-5 w-5" />
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={2}>
            <div className="relative">
              <div className="absolute -inset-3 -z-10 rounded-3xl bg-gradient-accent opacity-25 blur-2xl"></div>
              <img
                src={personalTrainingImage}
                alt="Személyi edzés — funkcionális mozgás"
                className="rounded-2xl object-cover shadow-[var(--shadow-elegant)]"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <h2 className="font-display text-3xl font-bold md:text-4xl">Mire fókuszálunk</h2>
        </Reveal>

        <div className="mt-10 grid gap-6 md:grid-cols-4">
          <Reveal delay={1}>
            <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h3 className="font-display text-xl font-semibold">Izomépítés</h3>
            <ul className="mt-4 space-y-2 flex-1">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                Egyéni célokhoz igazított progresszió
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                Megfelelő volumen és intenzitás
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                Technika és mozgásminőség
              </li>
            </ul>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h3 className="font-display text-xl font-semibold">Fittség fejlesztése</h3>
            <ul className="mt-4 space-y-2 flex-1">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                Állóképesség és kondicionálás
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                Funkcionális erő és mobilitás
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                Hosszú távon fenntartható rutin
              </li>
            </ul>
            </div>
          </Reveal>

          <Reveal delay={3}>
            <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h3 className="font-display text-xl font-semibold">Core erősítés</h3>
            <ul className="mt-4 space-y-2 flex-1">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                Core stabilizálók aktiválása
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                Otthon is végezhető rutin kialakítása
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                Sérülésmegelőzés és tartásjavítás
              </li>
            </ul>
            </div>
          </Reveal>

          <Reveal delay={4}>
            <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h3 className="font-display text-xl font-semibold">Korrekció</h3>
            <ul className="mt-4 space-y-2 flex-1">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                Egyedi problémák és diszbalanszok feltárása
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
                Mozgásminták és testtartás korrekciója
              </li>
            </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-border bg-secondary/50">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-50"></div>
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">Tudnivalók</p>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Mielőtt jössz</h2>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Reveal delay={1}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">Helyszín</h3>
                <p className="mt-1 font-semibold">Black Door Fitness</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  A személyi edzéseket Vácon, a Black Door Fitnessben tartom.
                </p>
              </div>
            </Reveal>

            <Reveal delay={2}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                  <Wallet className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">Egy edzés: 9 000 Ft</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  A díjat közvetlenül nálam tudod rendezni.
                </p>
              </div>
            </Reveal>

            <Reveal delay={3}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                  <Ticket className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">10 alkalmas bérlet: 80 000 Ft</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Opcionálisan bérletet is vásárolhatsz, amely kedvezőbb alkalmanként, és rugalmasan felhasználható.
                </p>
              </div>
            </Reveal>

            <Reveal delay={4}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                  <Wallet className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">Páros edzés</h3>
                <p className="mt-2 font-semibold">13 000 Ft</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Két fő részére tervezett edzés, személyre szabott programmal és közös haladással.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Edzésterv készítés</p>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">
            Személyre szabott edzésterv — a céljaidhoz igazítva
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Egy alapos konzultáció során átbeszéljük a céljaidat, a jelenlegi formádat és a hétköznapjaidat. Ennek alapján készítem el a személyre szabott edzéstervedet, amit szükség esetén egy közös, személyes alkalom keretében veszünk át — hogy a technika és a terhelés is biztosan a helyén legyen.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="group overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <span className="text-xl">1</span>
            </div>
            <h3 className="mt-6 font-display text-xl font-semibold">Farizom fókuszú női edzésterv</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Erős, formás farizom és stabil medence — célzott aktivációval és progresszív terheléssel.
            </p>
          </div>

          <div className="group overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <span className="text-xl">2</span>
            </div>
            <h3 className="mt-6 font-display text-xl font-semibold">CORE erősítő edzésterv</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Mély stabilizáló rendszer és funkcionális törzserő — a tartás, a teljesítmény és a sérülésmegelőzés alapja.
            </p>
          </div>

          <div className="group overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <span className="text-xl">3</span>
            </div>
            <h3 className="mt-6 font-display text-xl font-semibold">Férfi teljes testes edzésterv</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Komplex, izomépítő és erőfejlesztő program a teljes testre — kiegyensúlyozott, fenntartható felépítéssel.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <p className="font-semibold">Konzultáció</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Felmérjük a céljaidat, a hátteredet és a lehetőségeidet.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <p className="font-semibold">Progresszió</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Időszakosan frissített terv, hogy folyamatosan fejlődj.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <p className="font-semibold">Visszacsatolás</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Rendszeres konzultáció, finomhangolás a tapasztalatok alapján.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <a
            href="#apply"
            className="inline-flex rounded-full bg-gradient-accent px-8 py-3.5 text-base font-semibold text-accent-foreground shadow-[var(--shadow-elegant)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]"
          >
            Kérek edzéstervet
          </a>
        </div>
      </section>

      <section id="apply" className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Vedd fel velem a kapcsolatot</h2>
            <p className="mt-2 text-muted-foreground">
              Írd meg, mire szeretnél fókuszálni — emailben hamarosan jelentkezem.
            </p>
          </Reveal>

          <Reveal delay={1} className="mt-10">
            <ApplyForm
              type="personal-training"
              submitLabel="Időpontot kérek"
              messagePlaceholder="Mire szeretnél fókuszálni, milyen gyakran tudnál edzeni…"
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
