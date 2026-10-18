// A nap sorainak csoportosítása szakaszokra és szuperszett-blokkokra, és a sorrend-mozgatás szabályai.
// A szabály (hogy a szuperszett sorai mindig egymás mellett maradjanak):
//  - egy sor csak a saját szakaszán belül mozog;
//  - szuperszetten belül a sor a csoport többi sorával cserél helyet;
//  - a szuperszett szélső sora (vagy az önálló sor) az egész szomszédos blokkon lép át, a csoport egyben marad.
import type { PlanRow } from '../api';

export type Section = { section: string | null; rows: PlanRow[] };

export function sectionsOf(rows: PlanRow[]): Section[] {
  const out: Section[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && (last.section ?? '') === (r.section ?? '')) last.rows.push(r);
    else out.push({ section: r.section, rows: [r] });
  }
  return out;
}

// Egymás utáni, azonos nem üres group_label értékű sorok egy blokk; a többi sor önálló blokk.
export function blocksOf(rows: PlanRow[]): PlanRow[][] {
  const out: PlanRow[][] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && r.group_label && last[0].group_label === r.group_label) last.push(r);
    else out.push([r]);
  }
  return out;
}

function flatten(sections: Section[]): string[] {
  return sections.flatMap((s) => s.rows.map((r) => r.id));
}

function swap<T>(arr: T[], i: number, j: number) {
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

// Az új sorrend (azonosítók), vagy null, ha a sor abba az irányba nem mozdítható.
export function computeMove(rows: PlanRow[], id: string, dir: -1 | 1): string[] | null {
  const sections = sectionsOf(rows);
  const si = sections.findIndex((s) => s.rows.some((r) => r.id === id));
  if (si < 0) return null;
  const blocks = blocksOf(sections[si].rows);
  const bi = blocks.findIndex((b) => b.some((r) => r.id === id));
  const ri = blocks[bi].findIndex((r) => r.id === id);

  const block = blocks[bi];
  if (dir === -1 ? ri > 0 : ri < block.length - 1) {
    swap(block, ri, ri + dir);
  } else if (dir === -1 ? bi > 0 : bi < blocks.length - 1) {
    swap(blocks, bi, bi + dir);
  } else {
    return null;
  }
  sections[si] = { ...sections[si], rows: blocks.flat() };
  return flatten(sections);
}

// Egy teljes szakasz mozgatása a szomszédos szakasz fölé / alá.
export function computeSectionMove(rows: PlanRow[], sectionIndex: number, dir: -1 | 1): string[] | null {
  const sections = sectionsOf(rows);
  const j = sectionIndex + dir;
  if (sectionIndex < 0 || j < 0 || j >= sections.length) return null;
  swap(sections, sectionIndex, j);
  return flatten(sections);
}

// A következő szabad szuperszett-jelölés (A, B, C...), a megadott sorok jelölései nélkül.
export function nextGroupLabel(rows: PlanRow[], excludeIds: Set<string>): string | null {
  const used = new Set(rows.filter((r) => !excludeIds.has(r.id) && r.group_label).map((r) => r.group_label));
  for (let c = 65; c <= 90; c++) {
    const l = String.fromCharCode(c);
    if (!used.has(l)) return l;
  }
  return null;
}

// Szuperszett képezhető-e a kijelölt sorokból: legalább 2, azonos szakasz, egymás melletti pozíciók.
export function canGroup(rows: PlanRow[], selected: Set<string>): boolean {
  if (selected.size < 2) return false;
  const idx = rows.map((r, i) => (selected.has(r.id) ? i : -1)).filter((i) => i >= 0);
  if (idx.length !== selected.size) return false;
  if (idx[idx.length - 1] - idx[0] + 1 !== idx.length) return false;
  const sec = rows[idx[0]].section ?? '';
  return idx.every((i) => (rows[i].section ?? '') === sec);
}

// A sorokhoz tartozó szuperszett-jelölés a csoporton belüli sorszámmal (A1, A2...).
export function groupTags(rows: PlanRow[]): Map<string, string> {
  const tags = new Map<string, string>();
  for (const block of blocksOf(rows)) {
    if (block.length > 1 && block[0].group_label) {
      block.forEach((r, i) => tags.set(r.id, `${r.group_label}${i + 1}`));
    }
  }
  return tags;
}
