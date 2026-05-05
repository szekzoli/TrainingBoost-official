import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ApplyForm } from "@/components/site/ApplyForm";
import { Reveal } from "@/components/site/Reveal";
import { Sun, Users, Flame, Zap, MapPin, QrCode, Wallet, Ticket, ExternalLink, Clock, Sparkles, ArrowRight } from "lucide-react";
import morningBoostImg from "@/assets/morning-boost.jpg";

export const Route = createFileRoute("/morning-boost")({
  head: () => ({
    meta: [
      { title: "Morning Boost — Funkcionális edzés | Székely Zoli" },
      {
        name: "description",
        content:
          "Morning Boost: csoportos funkcionális edzés Vácon, a Black Door Fitnessben. Erő, core, mobilitás és állóképesség egy reggeli alkalom keretében.",
      },
      { property: "og:title", content: "Morning Boost — Funkcionális edzés" },
      {
        property: "og:description",
        content:
          "Csoportos funkcionális edzés Székely Zolival. Erő, mobilitás, állóképesség egy reggeli alkalom keretében.",
      },
    ],
  }),
  component: MorningBoostPage,
});

const features = [
  { icon: Sun, title: "Beindítja a reggelt", desc: "Lendületes indítás a teljes napra." },
  { icon: Users, title: "Csoportos energia", desc: "Közös motiváció kis létszámú csoportban." },
  { icon: Flame, title: "Ráfüggsz", desc: "Sűrített, hatékony 60 perces blokk." },
  { icon: Zap, title: "Funkcionális", desc: "Mindennapi mozgásokra szabva." },
];

const structure = [
  {
    n: "01",
    title: "Bemelegítés",
    desc: "Alapos keringésfokozó, core és farizom aktiváló bemelegítés.",
  },
  {
    n: "02",
    title: "Erőállóképességi köredzés",
    desc: "Funkcionális alsótest, felsőtest, erőállóképességi és core erősítő gyakorlatok.",
  },
  {
    n: "03",
    title: "Core / farizom blokk",
    desc: "Bizonyos edzéseken külön fókuszált core és farizom erősítő blokk.",
    optional: true,
  },
  {
    n: "04",
    title: "Nyújtás",
    desc: "Alapos levezető nyújtás a regenerációért és a mobilitásért.",
  },
];

const infoCards = [
  {
    icon: QrCode,
    title: "QR-kódos belépés",
    desc: "A részvételhez nem szükséges külön belépőt váltanod a terembe — egyedi QR-kóddal tudsz belépni, amelyet előzetes jelentkezés után kapsz meg.",
  },
  {
    icon: Wallet,
    title: "Egy edzés: 4 000 Ft",
    desc: "A díjat közvetlenül nálam tudod rendezni. Tartalmazza a terembe lépést is — nincs rejtett költség.",
  },
  {
    icon: Ticket,
    title: "10 alkalmas bérlet: 35 000 Ft",
    desc: "Opcionálisan bérletet is vásárolhatsz, amely kedvezőbb alkalmanként, és rugalmasan felhasználható.",
  },
];

function MorningBoostPage() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#apply") {
      const el = document.getElementById("apply");
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, []);
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-warm">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-70" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wider text-accent">
                Csoportos edzés
              </p>
            </Reveal>
            <Reveal delay={1}>
              <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
                Morning Boost — <span className="bg-gradient-accent bg-clip-text text-transparent italic">indítsd lendülettel</span> a napod
              </h1>
            </Reveal>
            <Reveal delay={2}>
              <p className="mt-5 text-lg text-muted-foreground">
                Funkcionális csoportos edzés, amely a teljes testet megmozgatja:
                erő, core, mobilitás és állóképesség egy reggeli alkalom keretében.
              </p>
              <p className="mt-3 text-muted-foreground">
                Az edzéseket úgy állítom össze, hogy a kezdők és a haladók is
                megtalálják a kihívást a saját szintjükön.
              </p>
            </Reveal>
            <Reveal delay={2}>
              <div className="mt-6 overflow-hidden rounded-2xl border border-accent/30 bg-card/80 shadow-[var(--shadow-soft)] backdrop-blur">
                <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-accent text-accent-foreground">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">Hétfő · Szerda</p>
                      <p className="font-display text-lg font-semibold">06:30</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-accent text-accent-foreground">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">Szombat</p>
                      <p className="font-display text-lg font-semibold">07:00</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-accent text-accent-foreground">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">Helyszín</p>
                      <p className="font-display text-sm font-semibold leading-tight">Black Door Fitness<br /><span className="text-muted-foreground font-normal">Vác</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={(Math.min(i + 1, 4)) as 1 | 2 | 3 | 4}>
                  <div className="flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-accent text-accent-foreground">
                      <f.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold">{f.title}</p>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={3}>
              <div className="mt-8">
                <a
                  href="#apply"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-elegant)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]"
                >
                  Jelentkezem <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </Reveal>
          </div>
          <Reveal delay={2}>
            <div className="relative">
              <div className="absolute -inset-3 -z-10 rounded-3xl bg-gradient-accent opacity-25 blur-2xl" />
              <img
                src={morningBoostImg}
                alt="Morning Boost csoportos edzés"
                width={1280}
                height={896}
                className="rounded-2xl object-cover shadow-[var(--shadow-elegant)]"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Structure */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Az edzés felépítése</p>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Így épül fel egy alkalom</h2>
          <p className="mt-3 text-muted-foreground">
            Egy 60 perces blokk, ami tudatosan felépített — bemelegítéstől a
            levezető nyújtásig. Itt van, mire számíthatsz:
          </p>
        </Reveal>

        {/* Kiotsuke, Rei! ritual note */}
        <Reveal delay={1} className="mt-8 flex items-start gap-4 rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-base font-semibold">
              „Kiotsuke, Rei!” — meghajlással kezdünk és zárunk
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Judós hagyomány: minden edzést egy közös meghajlással nyitunk és
              ugyanúgy zárunk — a tisztelet és a fókusz pillanata.
            </p>
          </div>
        </Reveal>

        <ol className="mt-6 space-y-4">
          {structure.map((s, i) => (
            <Reveal
              key={s.n}
              delay={(Math.min(i + 1, 4)) as 1 | 2 | 3 | 4}
              className={`flex gap-5 rounded-2xl border p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] ${
                s.optional
                  ? "border-dashed border-accent/40 bg-accent/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="font-display text-3xl font-bold text-accent/70 md:text-4xl">{s.n}</div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                  {s.optional && (
                    <span className="inline-flex items-center rounded-full border border-accent/40 bg-background/70 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
                      Időszakos
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Info / pricing */}
      <section className="relative overflow-hidden border-y border-border bg-secondary/50">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-50" />
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">Tudnivalók</p>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Mielőtt jössz</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {infoCards.map((c, i) => (
              <Reveal key={c.title} delay={(Math.min(i + 1, 3)) as 1 | 2 | 3}>
                <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
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
                Gödtől és Sződligettől is pár percre autóval — kényelmesen
                elérhető a környező településekről is.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Black+Door+Fitness+Vac+Szent+Laszlo+ut+34&hl=en"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Útvonaltervezés <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href="https://blackdoorfitness.hu/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-secondary"
                >
                  Black Door Fitness oldala <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </Reveal>
          <Reveal delay={1}>
            <div className="overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-soft)]">
              <iframe
                title="Black Door Fitness, Vác"
                src="https://www.google.com/maps?q=Vác%2C+Szent+László+út+34&output=embed"
                width="100%"
                height="380"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={{ border: 0 }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Apply form */}
      <section id="apply" className="mx-auto max-w-3xl px-4 pb-24 scroll-mt-20">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Jelentkezz a következő alkalomra</h2>
          <p className="mt-2 text-muted-foreground">
            Heti időpontok: <strong>hétfő 06:30–07:30</strong>,{" "}
            <strong>szerda 06:30–07:30</strong>, <strong>szombat 07:00–08:00</strong>.
            Válassz egy alkalmat a naptárból, és emailben visszaigazolom a részleteket.
          </p>
        </Reveal>
        <Reveal delay={1} className="mt-10">
          <ApplyForm
            type="morning-boost"
            submitLabel="Jelentkezem"
            showSlotPicker
            messagePlaceholder="Pl. korábbi edzéstapasztalat, esetleges sérülések…"
          />
        </Reveal>
      </section>
    </SiteLayout>
  );
}
