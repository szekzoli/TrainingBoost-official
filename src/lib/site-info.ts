// A weboldal üzemeltetőjének adatai (impresszum, adatkezelési tájékoztató).
// Az üres mezők nem jelennek meg az oldalon; ha megvannak, elég itt kitölteni őket.
export const OPERATOR = {
  name: 'Székely Zoltán',
  brand: 'Training Boost',
  email: 'szekely.zoltan92@gmail.com',
  phone: '+36 30 563 0283',
  phoneHref: 'tel:+36305630283',
  /** Székhely vagy levelezési cím, pl. "2600 Vác, ..." */
  address: '',
  /** Adószám (egyéni vállalkozónál). */
  taxNumber: '',
  /** Egyéni vállalkozói nyilvántartási szám. */
  registrationNumber: '',
} as const;

/** Az adatkezelési tájékoztató hatálybalépésének napja (módosításkor frissítendő). */
export const PRIVACY_UPDATED = '2026. november 21.';
