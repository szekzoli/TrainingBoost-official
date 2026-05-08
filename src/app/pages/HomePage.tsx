  import { Sparkles, ArrowRight, Instagram, Dumbbell, Target, Activity, Footprints, ArrowUpRight } from 'lucide-react';
  import { Link } from 'react-router-dom';
  import { Reveal } from '../components/Reveal';
  import heroImage from '../../imports/zoli-hero.webp';
  import morningBoostImage from '../../imports/morning-boost-hero.png';
  import personalTrainingImage from '../../imports/personal-training-hero.jpg';
  import outdoorBoostImage from '../../imports/outdoor.jpg'; 

  export default function HomePage() {
    return (
      <>
        <section className="relative overflow-visible border-b border-border bg-gradient-warm">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-80"></div>
          <div className="pointer-events-none absolute -top-32 -right-24 -z-10 h-96 w-96 rounded-full bg-accent/30 blur-[120px] animate-pulse-glow"></div>
          <div className="pointer-events-none absolute -bottom-32 -left-24 -z-10 h-96 w-96 rounded-full bg-tertiary/30 blur-[120px] animate-pulse-glow"></div>

          <div className="mx-auto grid max-w-6xl items-end gap-6 px-4 pt-6 md:gap-10 md:pt-12 md:grid-cols-2 md:pb-0">
            <div className="md:pb-20">
              <Reveal>
                <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  Csoportos edzés - Vác
                </p>
              </Reveal>

              <Reveal delay={1}>
                <h1 className="mt-3 font-display text-3xl font-bold leading-snug tracking-tight md:mt-4 md:text-6xl">
                  Erősebb test.<br />
                  <span className="bg-gradient-accent bg-clip-text text-transparent italic">Stabilabb alap.</span>
                </h1>
              </Reveal>

              <Reveal delay={2}>
                <p className="mt-3 max-w-lg text-base md:mt-5 md:text-lg text-muted-foreground">
                  Csoportos és személyi edzésekkel segítelek erőállóképességet, core erőt és mobilitást fejleszteni a hosszú távú egészségért.
                </p>
              </Reveal>

              <Reveal delay={3}>
                <div className="mt-5 md:mt-8">
                  <Link to="/morning-boost" className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-6 py-3 text-sm md:px-8 md:py-3.5 md:text-base font-semibold text-accent-foreground shadow-[var(--shadow-elegant)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]">
                    Morning Boost — jelentkezem
                    <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                  </Link>
                </div>
              </Reveal>
            </div>

            <Reveal delay={2} className="relative flex items-end justify-center self-end">
              <div className="absolute inset-6 -z-10 rounded-[3rem] bg-gradient-accent opacity-25 blur-3xl animate-pulse-glow"></div>
              <img
                src={heroImage}
                alt="Székely Zoltán személyi edző"
                loading="eager"
                className="block h-auto w-full max-w-[280px] md:max-w-md object-contain drop-shadow-2xl"
              />
            </Reveal>
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-border bg-secondary/50">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-60"></div>
          <div className="mx-auto max-w-6xl px-4 py-24">
            <div className="mx-auto max-w-3xl">
              <Reveal className="text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-accent">Rólam</p>
                <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">
                  Sport — gyermekkorom óta a szenvedélyem
                </h2>
              </Reveal>

              <Reveal delay={1}>
                <p className="mt-6 text-lg text-muted-foreground">
                  Székely Zoli vagyok. A sport már gyerekkorom óta végigkíséri az életemet: versenyszerűen judoztam, ahol megtanultam a testtudat és a küzdelem alapjait. Ezt a szenvedélyt később szakmai alapokra helyeztem, és személyi edzőként azóta is folyamatosan képzem magam, hogy a legfrissebb tudással támogathassalak.
                </p>
                <p className="mt-4 text-lg text-muted-foreground">
                  Számomra a sport nem csupán izomépítés, hanem az egészség és a mobilitás megőrzése.
                  Edzéseimena  funkcionális fejlődésre helyezem a fő fókuszt: az  <strong className="text-foreground">erő-állóképesség</strong>, a <strong className="text-foreground">core erő</strong>, a <strong className="text-foreground">mobilitás</strong> és az <strong className="text-foreground">egylábas erő</strong> fejlesztésére.
                </p>
              </Reveal>
            </div>

            <div className="mt-16">
              <Reveal className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-wider text-accent">Alapelvek</p>
                <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">
                  Négy pillér, amire minden edzés épül
                </h2>
              </Reveal>

              <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                <Reveal delay={1}>
                  <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] h-full lg:rounded-2xl lg:p-6">
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-accent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40"></div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent text-accent-foreground shadow-[var(--shadow-soft)] lg:h-12 lg:w-12 lg:rounded-xl">
                      <Dumbbell className="h-4 w-4 lg:h-5 lg:w-5" />
                    </div>
                    <h3 className="mt-3 font-display text-base font-semibold lg:mt-4 lg:text-lg">Erő-állóképesség</h3>
                    <p className="mt-1 text-xs text-muted-foreground lg:text-sm">
                      Kitartó erő, jobb keringés, nagyobb terhelhetőség.
                    </p>
                  </div>
                </Reveal>

                <Reveal delay={2}>
                  <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] h-full lg:rounded-2xl lg:p-6">
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-accent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40"></div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent text-accent-foreground shadow-[var(--shadow-soft)] lg:h-12 lg:w-12 lg:rounded-xl">
                      <Target className="h-4 w-4 lg:h-5 lg:w-5" />
                    </div>
                    <h3 className="mt-3 font-display text-base font-semibold lg:mt-4 lg:text-lg">Core erő</h3>
                    <p className="mt-1 text-xs text-muted-foreground lg:text-sm">
                      A stabil törzs minden mozgás alapja.
                    </p>
                  </div>
                </Reveal>

                <Reveal delay={3}>
                  <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] h-full lg:rounded-2xl lg:p-6">
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-accent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40"></div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent text-accent-foreground shadow-[var(--shadow-soft)] lg:h-12 lg:w-12 lg:rounded-xl">
                      <Activity className="h-4 w-4 lg:h-5 lg:w-5" />
                    </div>
                    <h3 className="mt-3 font-display text-base font-semibold lg:mt-4 lg:text-lg">Mobilitás</h3>
                    <p className="mt-1 text-xs text-muted-foreground lg:text-sm">
                      Szabad, fájdalommentes mozgástartomány.
                    </p>
                  </div>
                </Reveal>

                <Reveal delay={4}>
                  <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] h-full lg:rounded-2xl lg:p-6">
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-accent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40"></div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent text-accent-foreground shadow-[var(--shadow-soft)] lg:h-12 lg:w-12 lg:rounded-xl">
                      <Footprints className="h-4 w-4 lg:h-5 lg:w-5" />
                    </div>
                    <h3 className="mt-3 font-display text-base font-semibold lg:mt-4 lg:text-lg">Egylábas erő</h3>
                    <p className="mt-1 text-xs text-muted-foreground lg:text-sm">
                      Jobb egyensúly, stabilabb mozgás, kisebb sérüléskockázat.
                    </p>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-24">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">Szolgáltatások</p>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">
              Válassz a számodra megfelelő formát
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Reveal delay={1}>
              <Link to="/morning-boost" className="group block h-full overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={morningBoostImage}
                    alt="Morning Boost"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-80"></div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl font-semibold">Morning Boost</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Csoportos funkcionális edzés a nap energikus indításához.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent transition group-hover:gap-2">
                    Részletek
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </Reveal>

            <Reveal delay={2}>
              <Link to="/personal-training" className="group block h-full overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={personalTrainingImage}
                    alt="Személyi edzés"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-80"></div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl font-semibold">Személyi edzés</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Izomépítés, fittség- és core fejlesztés személyre szabva.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent transition group-hover:gap-2">
                    Részletek
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </Reveal>

            <Reveal delay={3}>
              <Link to="/outdoor-training" className="group block h-full overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={outdoorBoostImage}
                    alt="Outdoor Boost"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-80"></div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl font-semibold">Outdoor Boost</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Kültéri csoportos edzés Gödön.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent transition group-hover:gap-2">
                    Részletek
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Instagram</p>
              <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">
                Kövess a közösségi oldalon
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                A legfrissebb edzéstartalmak, motiváció és tippek a{' '}
                <a
                  href="https://www.instagram.com/szekelyzoli_trainer/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  @szekelyzoli_trainer
                </a>{' '}
                profilon.
              </p>
            </div>
            <a
              href="https://www.instagram.com/szekelyzoli_trainer/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <Instagram className="h-4 w-4" />
              Profil megnyitása
            </a>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-soft)]">
            <iframe
              src="https://www.instagram.com/szekelyzoli_trainer/embed"
              title="Instagram – @szekelyzoli_trainer"
              className="block h-[720px] w-full bg-card"
              frameBorder="0"
              scrolling="no"
              allow="encrypted-media"
            />
          </div>

          <a
            href="https://www.instagram.com/szekelyzoli_trainer/"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Tovább a profilra
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </section>
      </>
    );
  }
