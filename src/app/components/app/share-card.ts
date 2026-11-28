// Megosztható képek (Instagram-story méret, 1080×1920, sötét TrainingBoost-arculat).
// A kép a telefonon készül (canvas), szerver nélkül. A megosztás a telefon saját menüjével megy
// (Web Share API, fájllal); ahol ez nem érhető el (pl. gépen), letöltésként.
// Személyes adat (név, kód) nincs a képen.

export const SHARE_W = 1080;
export const SHARE_H = 1920;

const C = {
  bg: '#0E1726',
  card: '#152236',
  line: '#22324A',
  text: '#FFFFFF',
  muted: '#8FA3B8',
  faint: '#5C708A',
  teal: '#2DD4BF',
  tealDark: '#0E1726',
};
const PAD = 96;
const DISPLAY = '"Space Grotesk", "Inter", system-ui, sans-serif';
const SANS = '"Inter", system-ui, sans-serif';
const INSTAGRAM = '@szekelyzoli_trainer';

export type WeekCard = {
  kind: 'week';
  /** pl. „nov. 23–29.” */
  range: string;
  /** Hétfőtől vasárnapig. minutes: null, ha nincs érvényes időtartam (utólag rögzítve). */
  days: { label: string; done: boolean; minutes: number | null }[];
  workouts: number;
  minutes: number;
  /** pl. { now: 3, total: 12 } → „12 hetes program 3. hete” */
  programWeek: { now: number; total: number } | null;
  streakWeeks: number;
};

export type MonthCard = {
  kind: 'month';
  /** pl. „November” */
  month: string;
  year: number;
  /** Hétfő-alapú: ennyi üres cella a hónap első napja előtt. */
  lead: number;
  daysInMonth: number;
  doneDays: number[];
  streakWeeks: number;
};

export type ProgramCard = {
  kind: 'program';
  weeks: number;
  workouts: number;
  /** Az érvényes időtartamú edzések összege (perc); 0, ha nincs. */
  minutes: number;
};

export type MilestoneCard = {
  kind: 'milestone';
  title: string;
  detail: string;
  /** „Az első hetem” jellegű kártyán pipa, máskor érem. */
  icon: 'medal' | 'check';
};

export type ShareCard = WeekCard | MonthCard | ProgramCard | MilestoneCard;

const font = (weight: number, size: number, family = SANS) => `${weight} ${size}px ${family}`;

/** A betűtípusok betöltése a rajz előtt (különben a canvas tartalék betűvel rajzolna). */
async function ensureFonts() {
  if (!('fonts' in document)) return;
  try {
    await Promise.all([
      document.fonts.load(font(700, 64, DISPLAY)),
      document.fonts.load(font(600, 64, DISPLAY)),
      document.fonts.load(font(400, 40)),
      document.fonts.load(font(600, 40)),
    ]);
  } catch {
    /* tartalék betűvel is jó */
  }
}

/** Sortörés a megadott szélességre (legfeljebb maxLines sor, a végén „…”). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= width || !cur) cur = next;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Keret: háttér, logó, cím, lábléc. A cím alatti y-t adja vissza. */
function frame(ctx: CanvasRenderingContext2D, kicker: string, title: string): number {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = font(700, 60, DISPLAY);
  ctx.fillStyle = C.text;
  ctx.fillText('Training', PAD, 180);
  const tw = ctx.measureText('Training').width;
  ctx.fillStyle = C.teal;
  ctx.fillText('Boost', PAD + tw, 180);

  ctx.font = font(400, 44);
  ctx.fillStyle = C.muted;
  ctx.fillText(kicker, PAD, 340);

  ctx.font = font(700, 104, DISPLAY);
  ctx.fillStyle = C.text;
  const lines = wrap(ctx, title, SHARE_W - 2 * PAD, 2);
  lines.forEach((l, i) => ctx.fillText(l, PAD, 450 + i * 116));

  // Lábléc
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PAD, 1730);
  ctx.lineTo(SHARE_W - PAD, 1730);
  ctx.stroke();
  ctx.font = font(400, 40);
  ctx.fillStyle = C.muted;
  ctx.fillText('trainingboost.hu', PAD, 1810);
  ctx.textAlign = 'right';
  ctx.fillText(INSTAGRAM, SHARE_W - PAD, 1810);
  ctx.textAlign = 'left';

  return 450 + (lines.length - 1) * 116;
}

/** Nagy szám + mértékegység egy sorban; a végét adja vissza (x). */
function bigStat(ctx: CanvasRenderingContext2D, value: string, unit: string, x: number, y: number, color = C.text): number {
  ctx.font = font(700, 150, DISPLAY);
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
  const w = ctx.measureText(value).width;
  ctx.font = font(400, 50);
  ctx.fillStyle = C.muted;
  ctx.fillText(unit, x + w + 18, y);
  return x + w + 18 + ctx.measureText(unit).width;
}

function check(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, cy + s * 0.02);
  ctx.lineTo(cx - s * 0.12, cy + s * 0.38);
  ctx.lineTo(cx + s * 0.55, cy - s * 0.35);
  ctx.stroke();
}

function drawWeek(ctx: CanvasRenderingContext2D, c: WeekCard) {
  frame(ctx, c.range, 'Ez a hetem');

  const left = PAD;
  const right = SHARE_W - PAD;
  const base = 1180;
  const maxH = 460;
  const n = c.days.length;
  const barW = 92;
  const gap = (right - left - n * barW) / (n - 1);
  const maxMin = Math.max(30, ...c.days.map((d) => d.minutes ?? 0));

  c.days.forEach((d, i) => {
    const x = left + i * (barW + gap);
    const cx = x + barW / 2;
    if (d.done) {
      const h = d.minutes ? Math.max(70, (d.minutes / maxMin) * maxH) : maxH * 0.45;
      ctx.fillStyle = C.teal;
      roundRect(ctx, x, base - h, barW, h, 18);
      ctx.fill();
      ctx.textAlign = 'center';
      if (d.minutes) {
        ctx.font = font(600, 40);
        ctx.fillStyle = C.text;
        ctx.fillText(String(d.minutes), cx, base - h - 24);
      } else {
        check(ctx, cx, base - h - 50, 36, C.teal, 9);
      }
    } else {
      ctx.fillStyle = C.line;
      roundRect(ctx, x, base - 14, barW, 14, 7);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.font = font(d.done ? 600 : 400, 40);
    ctx.fillStyle = d.done ? C.text : C.faint;
    ctx.fillText(d.label, cx, base + 70);
  });
  ctx.textAlign = 'left';

  const y = 1470;
  const end = bigStat(ctx, String(c.workouts), 'edzés', PAD, y);
  if (c.minutes > 0) bigStat(ctx, String(c.minutes), 'perc', Math.max(end + 90, 560), y);

  const extras = [
    c.programWeek ? `${c.programWeek.total} hetes program ${c.programWeek.now}. hete` : null,
    c.streakWeeks > 1 ? `${c.streakWeeks} hét egymás után` : null,
  ].filter(Boolean) as string[];
  ctx.font = font(400, 46);
  ctx.fillStyle = C.muted;
  extras.forEach((t, i) => ctx.fillText(t, PAD, 1580 + i * 66));
}

function drawMonth(ctx: CanvasRenderingContext2D, c: MonthCard) {
  frame(ctx, String(c.year), c.month);

  const left = PAD;
  const cell = (SHARE_W - 2 * PAD) / 7;
  const top = 650;
  const rowH = 108;
  const heads = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
  ctx.textAlign = 'center';
  ctx.font = font(600, 36);
  ctx.fillStyle = C.faint;
  heads.forEach((h, i) => ctx.fillText(h, left + cell * i + cell / 2, top - 40));

  const done = new Set(c.doneDays);
  for (let d = 1; d <= c.daysInMonth; d++) {
    const idx = c.lead + d - 1;
    const cx = left + (idx % 7) * cell + cell / 2;
    const cy = top + Math.floor(idx / 7) * rowH + 40;
    if (done.has(d)) {
      ctx.fillStyle = C.teal;
      ctx.beginPath();
      ctx.arc(cx, cy - 14, 50, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = font(done.has(d) ? 700 : 400, 42);
    ctx.fillStyle = done.has(d) ? C.tealDark : C.muted;
    ctx.fillText(String(d), cx, cy);
  }
  ctx.textAlign = 'left';

  const y = 1530;
  bigStat(ctx, String(c.doneDays.length), 'edzésnap', PAD, y);
  if (c.streakWeeks > 1) {
    ctx.font = font(400, 46);
    ctx.fillStyle = C.muted;
    ctx.fillText(`${c.streakWeeks} hét egymás után`, PAD, 1630);
  }
}

function medal(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  // szalag
  ctx.fillStyle = C.line;
  ctx.beginPath();
  ctx.moveTo(cx - 120, cy - 330);
  ctx.lineTo(cx - 30, cy - 330);
  ctx.lineTo(cx + 40, cy - 150);
  ctx.lineTo(cx - 50, cy - 150);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 120, cy - 330);
  ctx.lineTo(cx + 30, cy - 330);
  ctx.lineTo(cx - 40, cy - 150);
  ctx.lineTo(cx + 50, cy - 150);
  ctx.closePath();
  ctx.fill();
  // érem
  ctx.fillStyle = C.teal;
  ctx.beginPath();
  ctx.arc(cx, cy, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.bg;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, Math.PI * 2);
  ctx.stroke();
  // csillag
  ctx.fillStyle = C.bg;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 90 : 38;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function checkBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.fillStyle = C.teal;
  ctx.beginPath();
  ctx.arc(cx, cy, 190, 0, Math.PI * 2);
  ctx.fill();
  check(ctx, cx, cy, 190, C.bg, 34);
}

function drawProgram(ctx: CanvasRenderingContext2D, c: ProgramCard) {
  // A terv címe szándékosan nincs rajta (gyakran benne van az ügyfél neve)
  frame(ctx, `${c.weeks} hetes edzésprogram`, 'Program teljesítve');
  checkBadge(ctx, SHARE_W / 2, 940);

  const rows: [string, string][] = [
    [String(c.weeks), 'hét'],
    [String(c.workouts), 'edzés'],
  ];
  if (c.minutes >= 60) rows.push([String(Math.round(c.minutes / 60)), 'óra edzés']);
  else if (c.minutes > 0) rows.push([String(c.minutes), 'perc edzés']);
  const y0 = 1330;
  const colW = (SHARE_W - 2 * PAD) / rows.length;
  rows.forEach(([v, u], i) => {
    const cx = PAD + colW * i + colW / 2;
    ctx.textAlign = 'center';
    ctx.font = font(700, 130, DISPLAY);
    ctx.fillStyle = C.text;
    ctx.fillText(v, cx, y0);
    ctx.font = font(400, 46);
    ctx.fillStyle = C.muted;
    ctx.fillText(u, cx, y0 + 76);
  });
  ctx.textAlign = 'left';
}

function drawMilestone(ctx: CanvasRenderingContext2D, c: MilestoneCard) {
  frame(ctx, 'Mérföldkő', c.title);
  if (c.icon === 'check') checkBadge(ctx, SHARE_W / 2, 1000);
  else medal(ctx, SHARE_W / 2, 1060);
  ctx.textAlign = 'center';
  ctx.font = font(400, 50);
  ctx.fillStyle = C.muted;
  wrap(ctx, c.detail, SHARE_W - 2 * PAD - 80, 3).forEach((l, i) => ctx.fillText(l, SHARE_W / 2, 1420 + i * 70));
  ctx.textAlign = 'left';
}

/** A kártya rajza egy canvasra (a tesztekhez és az előnézethez is). */
export function drawCard(ctx: CanvasRenderingContext2D, card: ShareCard) {
  if (card.kind === 'week') drawWeek(ctx, card);
  else if (card.kind === 'month') drawMonth(ctx, card);
  else if (card.kind === 'program') drawProgram(ctx, card);
  else drawMilestone(ctx, card);
}

/** A kártya PNG képként. */
export async function renderCard(card: ShareCard): Promise<Blob> {
  await ensureFonts();
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  drawCard(ctx, card);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'),
  );
}

/**
 * Megosztás a telefon menüjével (Instagram Story, Messenger, mentés a galériába…); ahol nem
 * érhető el, letöltés. 'shared' | 'downloaded' | 'cancelled'.
 */
export async function shareImage(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // más hiba: letöltéssel próbáljuk
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
