// A gyakorlattár csoportosítása. A supabase/sablonok/gyakorlattar.sql ugyanezeket az értékeket használja.

export const CATEGORIES = [
  'Felsőtest – toló',
  'Felsőtest – húzó',
  'Alsótest – térd domináns',
  'Alsótest – csípő domináns',
  'Core',
  'Kondi / intenzív',
  'Bemelegítés / mobilitás',
];

export const MUSCLES = [
  'Mell',
  'Hát',
  'Váll',
  'Bicepsz',
  'Tricepsz',
  'Comb elülső',
  'Combhajlító',
  'Farizom',
  'Adduktor',
  'Vádli',
  'Has / core',
  'Alkar / fogás',
  'Teljes test',
];

export const EQUIPMENT = [
  'Kézisúlyzó',
  'Rúd',
  'Kettlebell',
  'Landmine',
  'Medicinlabda / tárcsa',
  'Gép',
  'Kábel / csiga',
  'Smith-keret',
  'Kardió gép',
  'Saját testsúly',
  'TRX',
  'Gumikötél / miniband',
  'Fitball / BOSU',
  'Egyéb',
];

export const TYPES = ['Szabad súly', 'Gépes', 'Saját testsúly', 'Egyéb eszköz'] as const;
export type ExerciseType = (typeof TYPES)[number];

/** Az eszközből a típus: szabad súlyos, gépes, saját testsúlyos vagy egyéb eszközös. */
export function typeOf(equipment: string | null | undefined): ExerciseType | null {
  if (!equipment) return null;
  if (['Kézisúlyzó', 'Rúd', 'Kettlebell', 'Landmine', 'Medicinlabda / tárcsa'].includes(equipment)) return 'Szabad súly';
  if (['Gép', 'Kábel / csiga', 'Smith-keret', 'Kardió gép'].includes(equipment)) return 'Gépes';
  if (['Saját testsúly', 'TRX'].includes(equipment)) return 'Saját testsúly';
  return 'Egyéb eszköz';
}

/** Választólista: a rögzített értékek, és ha a mentett érték nincs köztük, az is. */
export function withCurrent(list: string[], current: string | null | undefined): string[] {
  return current && !list.includes(current) ? [...list, current] : list;
}
