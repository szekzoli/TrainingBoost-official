// Edzésnapok a telefon naptárába: ismétlődő esemény emlékeztetővel, szerver nélkül.
// Két út: .ics fájl (iPhone, Samsung, Outlook) vagy Google Naptár link (Android).

export const WEEKDAYS = [
  { key: 'MO', short: 'H', label: 'hétfő' },
  { key: 'TU', short: 'K', label: 'kedd' },
  { key: 'WE', short: 'Sze', label: 'szerda' },
  { key: 'TH', short: 'Cs', label: 'csütörtök' },
  { key: 'FR', short: 'P', label: 'péntek' },
  { key: 'SA', short: 'Szo', label: 'szombat' },
  { key: 'SU', short: 'V', label: 'vasárnap' },
] as const;

export type DayKey = (typeof WEEKDAYS)[number]['key'];

export type ReminderSettings = {
  days: DayKey[];
  /** ÓÓ:PP */
  time: string;
  /** Az edzés hossza percben. */
  duration: number;
  /** Ennyi perccel előtte szóljon. */
  alarm: number;
  /** Utolsó nap (ÉÉÉÉ-HH-NN), vagy null: 12 hétig. */
  until: string | null;
};

const SETTINGS_KEY = 'tb_app_reminder_v1';

export function loadReminder(): ReminderSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as ReminderSettings) : null;
  } catch {
    return null;
  }
}

export function saveReminder(s: ReminderSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...s, until: null }));
  } catch {
    /* nem baj */
  }
}

const pad = (n: number) => String(n).padStart(2, '0');
const jsDay: Record<DayKey, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/** Az első alkalom: a legközelebbi kiválasztott nap a megadott időpontban (ma is, ha még nem múlt el). */
function firstOccurrence(s: ReminderSettings, now = new Date()): Date {
  const [h, m] = s.time.split(':').map(Number);
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, m, 0);
    if (s.days.some((k) => jsDay[k] === d.getDay()) && d > now) return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h, m, 0);
}

/** Helyi idő, időzóna nélkül ("lebegő" idő): a telefon a saját idejében értelmezi. */
const localStamp = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const utcStamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

function rrule(s: ReminderSettings): string {
  const order = WEEKDAYS.map((w) => w.key).filter((k) => s.days.includes(k));
  const end = s.until ? `;UNTIL=${s.until.replace(/-/g, '')}T235959` : `;COUNT=${order.length * 12}`;
  return `RRULE:FREQ=WEEKLY;BYDAY=${order.join(',')}${end}`;
}

/** Szöveg az iCalendar formátumhoz (vessző, pontosvessző, sortörés escape-elve). */
const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** A 75 bájtnál hosszabb sorokat az iCalendar szabály szerint tördeli. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 74) return line;
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 73) {
      out.push(cur);
      cur = ' ' + ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
}

export function buildIcs(s: ReminderSettings, title: string, appUrl: string): string {
  const start = firstOccurrence(s);
  const end = new Date(start.getTime() + s.duration * 60_000);
  const desc = `Nyisd meg az edzésnaplót: ${appUrl}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TrainingBoost//Edzesnaptar//HU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:tb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@trainingboost.hu`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${localStamp(start)}`,
    `DTEND:${localStamp(end)}`,
    rrule(s),
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(desc)}`,
    `URL:${appUrl}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(title)}`,
    `TRIGGER:-PT${s.alarm}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Google Naptár "esemény létrehozása" link ugyanazzal az ismétlődéssel (az emlékeztetőt a Google maga teszi hozzá). */
export function googleCalendarUrl(s: ReminderSettings, title: string, appUrl: string): string {
  const start = firstOccurrence(s);
  const end = new Date(start.getTime() + s.duration * 60_000);
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${localStamp(start)}/${localStamp(end)}`,
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Budapest',
    details: `Nyisd meg az edzésnaplót: ${appUrl}`,
    recur: rrule(s),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** A program utolsó napja: kezdés + hetek száma × 7 − 1 (ha a kezdés ismert és még nem múlt el). */
export function planEnd(startedOn: string | null | undefined, weeks: number): string | null {
  if (!startedOn || weeks < 1) return null;
  const d = new Date(`${startedOn.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + weeks * 7 - 1);
  if (d < new Date()) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
