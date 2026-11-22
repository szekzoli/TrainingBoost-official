// Beállítások: edzésnapok felvétele a telefon naptárába, emlékeztetővel.
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarPlus } from 'lucide-react';
import { useSession } from './session';
import { downloadBlob } from '../../../lib/summary-xlsx';
import {
  WEEKDAYS,
  buildIcs,
  googleCalendarUrl,
  loadReminder,
  planEnd,
  saveReminder,
  type DayKey,
  type ReminderSettings,
} from './calendar-reminder';

const DEFAULT_DAYS: Record<number, DayKey[]> = {
  1: ['WE'],
  2: ['MO', 'TH'],
  3: ['MO', 'WE', 'FR'],
  4: ['MO', 'TU', 'TH', 'FR'],
  5: ['MO', 'TU', 'WE', 'TH', 'FR'],
};

const ALARMS = [
  { v: 30, label: '30 perccel előtte' },
  { v: 60, label: '1 órával előtte' },
  { v: 120, label: '2 órával előtte' },
  { v: 1440, label: 'előző nap' },
];

export function CalendarReminderCard() {
  const { plan, code } = useSession();
  const perWeek = useMemo(() => plan?.days.filter((d) => d.week === 1).length ?? 3, [plan]);
  const weeks = useMemo(() => Math.max(0, ...(plan?.days.map((d) => d.week) ?? [0])), [plan]);
  const end = planEnd(plan?.plan.started_on, weeks);

  const saved = loadReminder();
  const [days, setDays] = useState<DayKey[]>(saved?.days ?? DEFAULT_DAYS[Math.min(5, Math.max(1, perWeek))]);
  const [time, setTime] = useState(saved?.time ?? '18:00');
  const [duration, setDuration] = useState(saved?.duration ?? 60);
  const [alarm, setAlarm] = useState(saved?.alarm ?? 60);

  const settings: ReminderSettings = { days, time, duration, alarm, until: end };
  const ready = days.length > 0 && /^\d{2}:\d{2}$/.test(time);
  const title = 'Edzés (TrainingBoost)';
  // A saját link kerül az eseménybe: a naptárból nyitva a böngésző mindig a saját tervet mutatja
  // (akkor is, ha ott még nem nyitotta meg, vagy korábban más linket nyitott meg)
  const appUrl = code ? `${window.location.origin}/app/t/${code}` : `${window.location.origin}/app`;

  const toggle = (k: DayKey) => setDays((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));

  const downloadIcs = () => {
    saveReminder(settings);
    const blob = new Blob([buildIcs(settings, title, appUrl)], { type: 'text/calendar;charset=utf-8' });
    downloadBlob(blob, 'edzesnapok.ics');
    toast.success('A naptárfájl elkészült. Nyisd meg, és add hozzá a naptáradhoz.');
  };

  return (
    <section className="space-y-3 border border-app-navy/15 p-4">
      <div className="flex items-start gap-3">
        <CalendarPlus className="mt-0.5 size-5 shrink-0 text-app-teal" />
        <div>
          <h2 className="font-semibold">Edzésnapok a naptáradba</h2>
          <p className="text-sm leading-relaxed text-app-navy/80">
            Ismétlődő esemény kerül a telefonod naptárába, és a naptár szól előtte. Az eseményben a saját linked
            van, onnan egy koppintással megnyílik a naplód. Ezért közös (megosztott) naptárba ne tedd.
          </p>
        </div>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Melyik napokon edzel?</legend>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <button
              key={w.key}
              type="button"
              aria-pressed={days.includes(w.key)}
              aria-label={w.label}
              onClick={() => toggle(w.key)}
              className={`h-11 rounded-[10px] border text-sm font-semibold ${
                days.includes(w.key) ? 'border-app-teal bg-app-mint text-app-ink' : 'border-app-line text-app-navy/70'
              }`}
            >
              {w.short}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Kezdés</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-app-line bg-white px-2 text-base text-app-navy"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Időtartam</span>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="h-11 w-full rounded-[10px] border border-app-line bg-white px-2 text-base text-app-navy"
          >
            {[45, 60, 75, 90].map((m) => (
              <option key={m} value={m}>
                {m} perc
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">Emlékeztető</span>
        <select
          value={alarm}
          onChange={(e) => setAlarm(Number(e.target.value))}
          className="h-11 w-full rounded-[10px] border border-app-line bg-white px-2 text-base text-app-navy"
        >
          {ALARMS.map((a) => (
            <option key={a.v} value={a.v}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-app-muted">
        {end
          ? `A program végéig (${end.replace(/-/g, '. ')}.) ismétlődik.`
          : '12 hétig ismétlődik. Új programnál érdemes újra felvenni.'}
      </p>

      <div className="space-y-2">
        <button
          type="button"
          disabled={!ready}
          onClick={downloadIcs}
          className="h-11 w-full rounded-lg bg-app-teal text-sm font-semibold text-white disabled:opacity-40"
        >
          Hozzáadás a naptárhoz
        </button>
        <a
          href={ready ? googleCalendarUrl(settings, title, appUrl) : undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => saveReminder(settings)}
          aria-disabled={!ready}
          className={`flex h-11 w-full items-center justify-center rounded-lg border border-app-teal text-sm font-semibold text-app-teal ${
            ready ? '' : 'pointer-events-none opacity-40'
          }`}
        >
          Google Naptárral (Android)
        </a>
        <p className="text-xs leading-relaxed text-app-muted">
          iPhone: a „Hozzáadás a naptárhoz” után koppints a letöltött fájlra, majd az „Összes hozzáadása” gombra.
          Androidon a Google Naptár gomb a legegyszerűbb: ott a „Mentés” gombbal veheted fel.
        </p>
      </div>
    </section>
  );
}
