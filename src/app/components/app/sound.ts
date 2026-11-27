// Rövid hangjelzések (csippanás) a Web Audio API-val, hangfájl nélkül.
// iPhone-on a hang csak egy koppintás után indulhat el: ezért az unlockAudio()-t a gombnyomások
// (sorozat kipipálása, Start) hívják, a későbbi csippanások már a felébresztett hangkimenetet használják.
// A telefon néma kapcsolója (iPhone) és a média-hangerő továbbra is érvényes; a zenét nem állítja meg.

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const C: AudioCtor | undefined =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!C) return null;
  try {
    ctx = new C();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Gombnyomáskor hívandó: felébreszti a hangkimenetet (iOS / Chrome automatikus lejátszás-tiltás). */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  // Egy néma, nagyon rövid hang: iOS-en ez „oldja fel” a hangot
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    g.gain.value = 0;
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.01);
  } catch {
    /* nincs teendő */
  }
}

/** Egy csippanás. long: hosszabb, magasabb hang (a visszaszámlálás vége). */
export function beep(long = false) {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  try {
    const t = c.currentTime;
    const dur = long ? 0.45 : 0.12;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = long ? 1320 : 880;
    // Rövid fel- és lefutás, hogy ne pattogjon
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.setValueAtTime(0.35, t + dur - 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* nincs hang: nem baj */
  }
  if (long) {
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      /* nincs rezgés (iPhone) */
    }
  }
}

// ---------------------------------------------------------------------------
// Képernyő ébren tartása (Screen Wake Lock API): amíg számláló fut, ne aludjon el a kijelző.
// Ha a böngésző nem tudja, nem történik semmi (a képernyő a szokásos módon elalszik).
// ---------------------------------------------------------------------------

type Sentinel = { release: () => Promise<void>; released?: boolean };
let sentinel: Sentinel | null = null;
let wanted = false;

async function acquire() {
  const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } }).wakeLock;
  if (!wl || document.visibilityState !== 'visible') return;
  if (sentinel && !sentinel.released) return;
  try {
    sentinel = await wl.request('screen');
    if (!wanted) void releaseNow();
  } catch {
    sentinel = null;
  }
}

async function releaseNow() {
  const s = sentinel;
  sentinel = null;
  try {
    await s?.release();
  } catch {
    /* nincs teendő */
  }
}

// Háttérbe kerülve a böngésző elengedi; visszatérve újra kérjük, ha még kell.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible') void acquire();
  });
}

export function keepAwake(on: boolean) {
  wanted = on;
  if (on) void acquire();
  else void releaseNow();
}
