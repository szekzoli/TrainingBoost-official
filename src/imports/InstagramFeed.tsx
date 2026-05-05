import { Instagram, ArrowUpRight } from "lucide-react";

const HANDLE = "szekelyzoli_trainer";
const PROFILE_URL = `https://www.instagram.com/${HANDLE}/`;

export function InstagramFeed() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Instagram
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">
            Kövess a közösségi oldalon
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            A legfrissebb edzéstartalmak, motiváció és tippek a{" "}
            <a
              href={PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              @{HANDLE}
            </a>{" "}
            profilon.
          </p>
        </div>
        <a
          href={PROFILE_URL}
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
          src={`https://www.instagram.com/${HANDLE}/embed`}
          title={`Instagram – @${HANDLE}`}
          loading="lazy"
          className="block h-[720px] w-full bg-card"
          frameBorder={0}
          scrolling="no"
          allow="encrypted-media"
        />
      </div>

      <a
        href={PROFILE_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        Tovább a profilra <ArrowUpRight className="h-4 w-4" />
      </a>
    </section>
  );
}
