import { Link } from "@tanstack/react-router";
import { Instagram, Mail, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <div className="font-display text-lg font-bold">
            Székely <span className="text-primary">Zoli</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Személyi edző — erő, core, állóképesség, egylábas stabilitás.
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
              <Mail className="h-4 w-4" />
              <a href="mailto:szekely.zoltan92@gmail.com" className="hover:text-foreground">
                szekely.zoltan92@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>
                +36 30 563 0283
              </span>
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
  );
}
