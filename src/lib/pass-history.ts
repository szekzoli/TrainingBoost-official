// Bérlet-előzmény: a tag alkalmai bérletenként (10-es blokkok), a megújítások dátumával.
// Ugyanez a fájl van a Morning Boost Trackerben is (src/lib/pass-history.ts) – a kettőt együtt kell módosítani.
//
// Számolás a végéről visszafelé, mert a régi adatoknál a bérletek kezdete nincs rögzítve:
//  - „előre” alkalmak: a bérlet elfogyása után, megújítás előtt (tartozás) – a következő bérlethez tartoznak;
//  - jelenlegi bérlet: az utolsó (összes − maradt) alkalom előttük;
//  - korábbi bérletek: visszafelé 10-esével; a legrégebbi blokk lehet hiányos.
// A megújítások dátumai a legfrissebbtől visszafelé a jelenlegi, majd a korábbi bérletekhez tartoznak.

export type PassMember = {
  passesRemaining: number;
  totalPasses: number;
  debt: number;
};

export type PassBlock = {
  kind: "pending" | "current" | "past";
  /** 1-től számozva, a legrégebbi az 1. (a „pending” blokknak nincs sorszáma) */
  number: number | null;
  dates: string[]; // időrendben (YYYY-MM-DD)
  /** a bérletet nyitó megújítás dátuma, ha rögzítve van */
  renewedOn: string | null;
  /** a blokk alkalmai közül ennyi volt a megújítás előtt (tartozásból hozott) */
  beforeRenewal: number;
  /** a legrégebbi, nem teljes blokk (pl. a kezdeti alkalmak) */
  partial: boolean;
};

export function buildPassHistory(member: PassMember, attended: string[], renewalDates: string[]): PassBlock[] {
  const dates = [...attended].sort();
  const renewals = [...renewalDates].sort().reverse(); // legfrissebb elöl
  const blocks: PassBlock[] = [];
  let end = dates.length;

  const debt = Math.max(0, Math.min(member.debt, end));
  if (debt > 0) {
    blocks.push({ kind: "pending", number: null, dates: dates.slice(end - debt, end), renewedOn: null, beforeRenewal: 0, partial: false });
    end -= debt;
  }

  const used = Math.max(0, Math.min(member.totalPasses - member.passesRemaining, end));
  let ri = 0;
  const current = dates.slice(end - used, end);
  blocks.push({ kind: "current", number: null, dates: current, renewedOn: renewals[ri++] ?? null, beforeRenewal: 0, partial: false });
  end -= used;

  while (end > 0) {
    const start = Math.max(0, end - 10);
    blocks.push({
      kind: "past",
      number: null,
      dates: dates.slice(start, end),
      renewedOn: renewals[ri++] ?? null,
      beforeRenewal: 0,
      partial: end - start < 10,
    });
    end = start;
  }

  // Számozás a legrégebbitől; a megújítás előtti alkalmak száma
  let n = 1;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.kind !== "pending") b.number = n++;
    if (b.renewedOn) b.beforeRenewal = b.dates.filter(d => d < b.renewedOn!).length;
  }
  return blocks;
}

const DAYS = ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"];

/** 2026. nov. 23., hétfő */
export function formatDateHu(ymd: string, withDay = true): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12);
  const months = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];
  return `${y}. ${months[m - 1]} ${d}.${withDay ? `, ${DAYS[dt.getDay()]}` : ""}`;
}
