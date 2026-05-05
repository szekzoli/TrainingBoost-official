import { Menu, X, Instagram, Mail, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

const nav = [
  { to: "/", label: "Főoldal" },
  { to: "/morning-boost", label: "Morning Boost" },
  { to: "/personal-training", label: "Személyi edzés" },
  { to: "/online-programs", label: "Online programok" },
  { to: "/contact", label: "Kapcsolat" },
] as const;

export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Training Boost — Székely Zoli',
      '/morning-boost': 'Morning Boost — Training Boost — Székely Zoli',
      '/personal-training': 'Személyi edzés — Training Boost — Székely Zoli',
      '/online-programs': 'Online programok — Training Boost — Székely Zoli',
      '/contact': 'Kapcsolat — Training Boost — Székely Zoli',
    };
    document.title = titles[location.pathname] || 'Training Boost — Székely Zoli';
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="font-display text-lg font-bold tracking-tight">
            Training <span className="bg-gradient-accent bg-clip-text text-transparent">Boost</span> — Székely Zoli
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  isActive(n.to) && "text-foreground"
                )}
              >
                {n.label}
              </Link>
            ))}
            <a
              href="/morning-boost#apply"
              className="rounded-full bg-gradient-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-glow)]"
            >
              Jelentkezem
            </a>
          </nav>
          <button
            className="md:hidden"
            aria-label="Menü"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        <div
          className={cn(
            "border-t border-border bg-background md:hidden",
            open ? "block" : "hidden",
          )}
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
                  isActive(n.to) && "text-foreground bg-secondary"
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <div className="font-display text-lg font-bold">
              Training <span className="bg-gradient-accent bg-clip-text text-transparent">Boost</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Székely Zoli — személyi edző<br />
              Erő, mobilitás, stabilitás.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Oldalak</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/morning-boost" className="hover:text-foreground">Morning Boost</Link></li>
              <li><Link to="/personal-training" className="hover:text-foreground">Személyi edzés</Link></li>
              <li><Link to="/online-programs" className="hover:text-foreground">Online programok</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Kapcsolat</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Kapcsolat</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href="tel:+36305630283" className="hover:text-foreground">
                  +36 30 563 0283
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:szekely.zoltan92@gmail.com" className="hover:text-foreground">
                  szekely.zoltan92@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                <a
                  href="https://www.instagram.com/szekelyzoli_trainer/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground"
                >
                  @szekelyzoli_trainer
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Székely Zoltán. Minden jog fenntartva.
        </div>
      </footer>
    </div>
  );
}
