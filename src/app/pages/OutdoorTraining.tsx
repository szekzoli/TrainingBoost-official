import { ArrowRight, MapPin, Wallet, Ticket, ExternalLink, Sparkles, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
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
                A kültéri edzés egyelőre szünetel. Ha érdekel, érdeklődj üzenetben — értesítelek, amint újraindul.
              </p>
            </Reveal>

            <Reveal delay={2}>
              <div className="mt-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <MapPin className="h-4 w-4 text-accent" />
                  </div>
                  <p className="text-sm">
                    <strong className="text-foreground">Szabadtéri edzőpark</strong>, Göd
                  </p>
                </div>
              </div>
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
                src={outdoorBoostImage}
                alt="Outdoor edzés"
                className="rounded-2xl object-cover shadow-[var(--shadow-elegant)]"
              />
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

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Reveal delay={1}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">Első edzés: 1 500 Ft</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Az első alkalom kedvezményes áron, hogy kipróbálhasd, mennyire illik hozzád a kültéri edzés.
                </p>
              </div>
            </Reveal>

            <Reveal delay={2}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                  <Wallet className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">Egy alkalom: 3 500 Ft</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  A díjat közvetlenül nálam tudod rendezni az edzés alkalmával.
                </p>
              </div>
            </Reveal>

            <Reveal delay={3}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                  <Ticket className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">10 alkalmas bérlet: 30 000 Ft</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Opcionálisan 10 alkalmas bérletet is vásárolhatsz nálam a kültéri csoportos edzéshez.
                </p>
              </div>
            </Reveal>

            <Reveal delay={4}>
              <div className="h-full rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-6 shadow-[var(--shadow-soft)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">Felszerelés biztosítva</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Minden edzőfelszerelést biztosítok — törölközőt és folyadékot hozz magaddal.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">Helyszín</p>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Hol találkozunk</h2>

            <div className="mt-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold">Szabadtéri edzőpark</p>
                  <p className="text-sm text-muted-foreground">Göd, Kerek Erdő u. 8, 2131</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Gödön, a strand melletti szabadtéri edzőpark.
              </p>

              <div className="mt-5">
                <a
                  href="https://maps.app.goo.gl/LxBFQDsT9mfuKfFT6"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Útvonaltervezés
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={1}>
            <div className="overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-soft)]">
              <iframe
                title="Szabadtéri edzőpark, Göd"
                src="https://maps.google.com/maps?q=G%C3%B6d,+Kerek+Erd%C5%91+u.+8,+2131&t=&z=15&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="380"
                loading="lazy"
                style={{ border: 0 }}
                allowFullScreen
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section id="apply" className="mx-auto max-w-3xl px-4 pb-24 scroll-mt-20">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Érdeklődés</h2>
          <p className="mt-2 text-muted-foreground">
            Küldj üzenetet, és értesítelek, amint a kültéri edzés újraindul.
          </p>
        </Reveal>

        <Reveal delay={1} className="mt-10">
          <ApplyForm
            type="outdoor-training"
            submitLabel="Érdeklődöm"
            messagePlaceholder="Pl. mikor lenne jó, milyen edzéscélod van…"
          />
        </Reveal>

        <Reveal delay={2} className="mt-12 text-center">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
            <MessageCircle className="mx-auto h-10 w-10 text-accent" />
            <h3 className="mt-4 font-display text-2xl font-bold">Kérdésed van? Beszéljünk</h3>
            <p className="mt-2 text-muted-foreground">
              Ha bármi kérdésed van, vagy szeretnél többet tudni az edzésekről, keress bátran.
            </p>
            <Link
              to="/contact"
              onClick={() => window.scrollTo(0, 0)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Kapcsolat
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
