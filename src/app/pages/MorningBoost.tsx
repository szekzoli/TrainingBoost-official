import { ArrowRight, Clock, MapPin, Sun, Users, Flame, Zap, Sparkles, QrCode, Wallet, Ticket, ExternalLink, RefreshCw, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal';
import { ApplyForm } from '../components/ApplyForm';
import morningBoostImage from '../../imports/morning-boost-page.png';

export default function MorningBoost() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-gradient-warm">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-70"></div>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wider text-accent">Csoportos edzés</p>
            </Reveal>
            <Reveal delay={1}>
              <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
                Morning Boost — <span className="bg-gradient-accent bg-clip-text text-transparent italic">indítsd lendülettel</span> a napod
              </h1>
            </Reveal>
            <Reveal delay={2}>
              <p className="mt-5 text-lg text-muted-foreground">
                60 perces funkcionális csoportos edzés: erő, core, mobilitás és állóképesség — lendületes napinditás kis létszámú csoportban.
              </p>
            </Reveal>

            <Reveal delay={2}>
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <Clock className="h-4 w-4 text-accent" />
                  </div>
                  <p className="text-sm">
                    <strong className="text-foreground">Hétfő, Szerda</strong> 06:30 · <strong className="text-foreground">Szombat</strong> 07:00
                  </p>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <MapPin className="h-4 w-4 text-accent" />
                  </div>
                  <p className="text-sm">
                    <strong className="text-foreground">Black Door Fitness</strong>, Vác
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={3}>
              <div className="mt-8">
                <a href="#apply" className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-8 py-3.5 text-base font-semibold text-accent-foreground shadow-[var(--shadow-elegant)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]">
                  Jelentkezem
                  <ArrowRight className="h-5 w-5" />
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={2}>
            <div className="relative">
              <div className="absolute -inset-3 -z-10 rounded-3xl bg-gradient-accent opacity-25 blur-2xl"></div>
              <img
                src={morningBoostImage}
                alt="Morning Boost csoportos edzés"
                className="rounded-2xl object-cover shadow-[var(--shadow-elegant)]"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Az edzés felépítése</p>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Így épül fel egy alkalom</h2>
          <p className="mt-3 text-muted-foreground">
            60 perc bemelegítéssel és nyújtással, erre számíthatsz:
          </p>
        </Reveal>

        <Reveal delay={1}>
          <div className="mt-8 flex items-start gap-4 rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <p className="font-display text-base font-semibold"><em>„Kiotsuke, Rei!"</em> — meghajlással kezdünk és zárunk</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Judós hagyomány: minden edzést egy közös meghajlással nyitunk és ugyanúgy zárunk — a tisztelet és a fókusz pillanata.
              </p>
            </div>
          </div>
        </Reveal>

        <ol className="mt-6 space-y-4">
          {[
            { num: '01', title: 'Bemelegítés', desc: 'Alapos keringésfokozó, core és farizom aktiváló és mobilizáló bemelegítés.', special: false },
            { num: '02', title: 'Erőállóképességi köredzés', desc: 'Funkcionális alsótest, felsőtest, erőállóképességi és core erősítő gyakorlatok.', special: false },
            { num: '03', title: 'Core / farizom blokk', desc: 'Bizonyos edzéseken külön fókuszált core és/vagy farizom erősítő blokk.', special: true },
            { num: '04', title: 'Nyújtás', desc: 'Alapos levezető nyújtás a regenerációért és a mobilitásért.', special: false },
          ].map((step, idx) => (
            <Reveal
              key={idx}
              delay={idx + 1 as 0 | 1 | 2 | 3 | 4}
              className={`flex gap-5 rounded-2xl border p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] ${
                step.special ? 'border-dashed border-accent/40 bg-accent/5' : 'border-border bg-card'
              }`}
            >
              <div className="font-display text-3xl font-bold text-accent/70 md:text-4xl">{step.num}</div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                  {step.special && (
                    <span className="inline-flex items-center rounded-full border border-accent/40 bg-background/70 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
                      Bizonyos edzéseken
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="relative overflow-hidden border-y border-border bg-secondary/50">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-50"></div>
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">Tudnivalók</p>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Mielőtt jössz</h2>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Reveal delay={1}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                  <QrCode className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">QR-kódos belépés</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  A részvételhez nem szükséges külön belépőt váltanod a terembe — egyedi QR-kóddal tudsz belépni, amelyet előzetes jelentkezés után kapsz meg.
                </p>
              </div>
            </Reveal>

            <Reveal delay={2}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                  <Wallet className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">Egy edzés: 4 000 Ft</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  A díjat közvetlenül nálam tudod rendezni. Tartalmazza a terembe lépést is, nem szükséges külön belépő / bérlet.
                </p>
              </div>
            </Reveal>

            <Reveal delay={3}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                  <Ticket className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">10 alkalmas bérlet: 35 000 Ft</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Opcionálisan 10 alkalmas bérletet is vásárolhatsz nálam a csoportos edzéshez.
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
                  <p className="font-display text-lg font-semibold">Black Door Fitness, Vác</p>
                  <p className="text-sm text-muted-foreground">2600 Vác, Szent László út 34.</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Gödtől és Sződligettől is pár percre autóval — kényelmesen elérhető a környező településekről is.
                Ingyenes parkolás a helyszínen.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Black+Door+Fitness+Vac+Szent+Laszlo+ut+34&hl=en"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Útvonaltervezés
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href="https://blackdoorfitness.hu/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-secondary"
                >
                  Black Door Fitness oldala
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={1}>
            <div className="overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-soft)]">
              <iframe
                title="Black Door Fitness, Vác"
                src="https://maps.google.com/maps?q=Black+Door+Fitness,+V%C3%A1c,+Szent+L%C3%A1szl%C3%B3+%C3%BAt+34&t=&z=15&ie=UTF8&iwloc=&output=embed"
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
          <h2 className="font-display text-3xl font-bold md:text-4xl">Jelentkezz</h2>
          <p className="mt-2 text-muted-foreground">
            Heti időpontok: <strong>hétfő 06:30–07:30</strong>, <strong>szerda 06:30–07:30</strong>, <strong>szombat 07:00–08:00</strong>. Válassz egy alkalmat a naptárból, és emailben visszaigazolom a részleteket.
          </p>
        </Reveal>

        <Reveal delay={1} className="mt-10">
          <ApplyForm
            type="morning-boost"
            submitLabel="Jelentkezem"
            messagePlaceholder="Pl. korábbi edzéstapasztalat, esetleges sérülések…"
            showSlotPicker={true}
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
