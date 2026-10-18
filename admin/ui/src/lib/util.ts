// Ékezet- és kisbetű-független összehasonlítás a kereséshez
export const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Cím -> slug javaslat: kisbetű, szám és kötőjel
export function slugify(title: string): string {
  return fold(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Hét- és napcímkék
export const weekLabel = (w: number) => `${w}. hét`;

export const input =
  'block w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20';
export const btn = 'h-9 rounded-[10px] border border-line px-3 text-xs font-semibold hover:bg-canvas disabled:opacity-40';
export const btnPrimary = 'h-10 rounded-[10px] bg-navy px-5 text-sm font-semibold text-white disabled:opacity-40';
export const btnGhost = 'h-10 rounded-[10px] border border-line px-4 text-sm font-semibold hover:bg-canvas';
