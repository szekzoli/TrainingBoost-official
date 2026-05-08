import { useMemo, useState } from "react";
import { applySchema, type ApplyInput } from "@/lib/apply-schema";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  type: ApplyInput["type"];
  submitLabel?: string;
  showPhone?: boolean;
  messagePlaceholder?: string;
  /** Show calendar slot picker (Morning Boost recurring schedule). */
  showSlotPicker?: boolean;
}

// Morning Boost weekly schedule:
// Monday 06:30–07:30, Wednesday 06:30–07:30, Saturday 07:00–08:00.
// JS getDay(): Sun=0, Mon=1, Wed=3, Sat=6.
const SLOT_BY_DAY: Record<number, { label: string; time: string } | undefined> = {
  1: { label: "Hétfő", time: "06:30–07:30" },
  3: { label: "Szerda", time: "06:30–07:30" },
  6: { label: "Szombat", time: "07:00–08:00" },
};

function formatHu(d: Date) {
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
}

export function ApplyForm({
  type,
  submitLabel = "Küldés",
  showPhone = true,
  messagePlaceholder = "Mesélj röviden a céljaidról…",
  showSlotPicker = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const slotString = useMemo(() => {
    if (!date) return "";
    const s = SLOT_BY_DAY[date.getDay()];
    if (!s) return "";
    return `${s.label}, ${formatHu(date)} · ${s.time}`;
  }, [date]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      type,
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      message: String(fd.get("message") || ""),
      slot: slotString,
    };
    if (showSlotPicker && !slotString) {
      toast.error("Kérlek válassz egy alkalmat a naptárból.");
      return;
    }
    const parsed = applySchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Hibás adatok";
      toast.error(first);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/netlify-forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(fd as unknown as Record<string, string>).toString(),
      });
      if (!res.ok) throw new Error("Send failed");
      setDone(true);
      toast.success("Köszönöm, hamarosan jelentkezem!");
      form.reset();
      setDate(undefined);
    } catch {
      toast.error("Sajnos most nem sikerült elküldeni. Próbáld újra.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
        <h3 className="font-display text-xl font-semibold">
          {type === "morning-boost" ? "Köszönöm a jelentkezést!" : "Köszönöm a megkeresést!"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Hamarosan emailben veszem fel veled a kapcsolatot.
        </p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <form
      name="apply"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8"
    >
      <input type="hidden" name="form-name" value="apply" />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="slot" value={slotString} />
      <div hidden>
        <label>
          Ne töltsd ki ezt a mezőt, ha ember vagy.
          <input name="bot-field" />
        </label>
      </div>
      <Field label="Név" name="name" required autoComplete="name" />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      {showPhone && <Field label="Telefon (opcionális)" name="phone" type="tel" autoComplete="tel" />}

      {showSlotPicker && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Válassz alkalmat</label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start rounded-lg text-left font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {slotString || "Válassz egy hétfőt, szerdát vagy szombatot"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  if (d) setCalendarOpen(false);
                }}
                disabled={(d) => {
                  if (d < today) return true;
                  return !SLOT_BY_DAY[d.getDay()];
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
              <div className="border-t border-border p-3 text-xs text-muted-foreground">
                Hétfő & Szerda: 06:30–07:30 · Szombat: 07:00–08:00
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium">Üzenet</label>
        <textarea
          name="message"
          rows={4}
          maxLength={2000}
          placeholder={messagePlaceholder}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Küldés…" : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        maxLength={255}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
      />
    </div>
  );
}
