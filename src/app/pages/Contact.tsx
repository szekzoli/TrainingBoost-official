import { Mail, Instagram, Phone } from 'lucide-react';
import { ApplyForm } from '../components/ApplyForm';

export default function Contact() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <div className="text-center mb-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">Kapcsolat</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
          Beszéljünk
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Írd le, milyen céljaid vannak, vagy egyeztetni szeretnél egy edzéssel kapcsolatban — emailben hamarosan visszajelzek.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[300px_1fr] lg:gap-12">
        <div className="space-y-4">
          <a
            href="mailto:szekely.zoltan92@gmail.com"
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-elegant)]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">Email</h3>
              <p className="text-sm text-muted-foreground truncate">szekely.zoltan92@gmail.com</p>
            </div>
          </a>

          <a
            href="tel:+36305630283"
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-elegant)]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
              <Phone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">Telefon</h3>
              <p className="text-sm text-muted-foreground">+36 30 563 0283</p>
            </div>
          </a>

          <a
            href="https://www.instagram.com/szekelyzoli_trainer/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-elegant)]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
              <Instagram className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">Instagram</h3>
              <p className="text-sm text-muted-foreground">@szekelyzoli_trainer</p>
            </div>
          </a>
        </div>

        <div>
          <ApplyForm
            type="contact"
            submitLabel="Üzenet küldése"
            messagePlaceholder="Miben segíthetek?"
          />
        </div>
      </div>
    </section>
  );
}
