// Az ügyfél saját beállításai (csak ezen az eszközön, localStorage): téma, pihenőidő-számláló, alap pihenő
// és a pulzus mező megjelenése.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
/** Pulzus mező: auto = ahol az edző bekapcsolta (gyakorlatonként), always = mindenhol, never = sehol. */
export type HrMode = 'auto' | 'always' | 'never';

type Prefs = {
  theme: ThemePref;
  /** A ténylegesen használt téma (a "system" feloldva). */
  dark: boolean;
  setTheme: (t: ThemePref) => void;
  restTimer: boolean;
  setRestTimer: (on: boolean) => void;
  /** Alap pihenő másodpercben, ha a tervben nincs megadva (0 = nincs). */
  defaultRest: number;
  setDefaultRest: (sec: number) => void;
  hrMode: HrMode;
  setHrMode: (m: HrMode) => void;
  /** Mérföldkövek (lista a Haladásban és gratuláció) be/ki. */
  milestones: boolean;
  setMilestones: (on: boolean) => void;
};

const THEME_KEY = 'tb_app_theme';
const TIMER_KEY = 'tb_app_rest_timer';
const DEFAULT_REST_KEY = 'tb_app_default_rest';
const HR_KEY = 'tb_app_hr_mode';
const MILESTONES_KEY = 'tb_app_milestones';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* privát mód: csak erre a munkamenetre érvényes */
  }
}

const PrefsContext = createContext<Prefs | null>(null);

export function usePrefs(): Prefs {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs a PrefsProvideren belül használható');
  return ctx;
}

function systemDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>(() => {
    const v = read(THEME_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  });
  const [sysDark, setSysDark] = useState(systemDark);
  const [restTimer, setRestTimerState] = useState(() => read(TIMER_KEY) !== 'off');
  const [milestones, setMilestonesState] = useState(() => read(MILESTONES_KEY) !== 'off');
  const [defaultRest, setDefaultRestState] = useState(() => {
    const n = Number(read(DEFAULT_REST_KEY));
    return Number.isFinite(n) && n > 0 && n <= 600 ? n : 0;
  });

  const [hrMode, setHrModeState] = useState<HrMode>(() => {
    const v = read(HR_KEY);
    return v === 'always' || v === 'never' ? v : 'auto';
  });

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = () => setSysDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const setTheme = useCallback((t: ThemePref) => {
    setThemeState(t);
    write(THEME_KEY, t);
  }, []);
  const setMilestones = useCallback((on: boolean) => {
    setMilestonesState(on);
    write(MILESTONES_KEY, on ? 'on' : 'off');
  }, []);

  const setRestTimer = useCallback((on: boolean) => {
    setRestTimerState(on);
    write(TIMER_KEY, on ? 'on' : 'off');
  }, []);

  const setDefaultRest = useCallback((sec: number) => {
    setDefaultRestState(sec);
    write(DEFAULT_REST_KEY, String(sec));
  }, []);

  const setHrMode = useCallback((m: HrMode) => {
    setHrModeState(m);
    write(HR_KEY, m);
  }, []);

  const dark = theme === 'dark' || (theme === 'system' && sysDark);

  // A böngésző sávja és a görgetési háttér is kövesse a témát.
  useEffect(() => {
    const prevBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = dark ? '#0d1622' : '';
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    const prevColor = meta.content;
    meta.content = dark ? '#0d1622' : '#ffffff';
    return () => {
      document.body.style.backgroundColor = prevBg;
      if (created) meta!.remove();
      else meta!.content = prevColor;
    };
  }, [dark]);

  const value = useMemo(
    () => ({
      theme,
      dark,
      setTheme,
      restTimer,
      setRestTimer,
      defaultRest,
      setDefaultRest,
      hrMode,
      setHrMode,
      milestones,
      setMilestones,
    }),
    [theme, dark, setTheme, restTimer, setRestTimer, defaultRest, setDefaultRest, hrMode, setHrMode, milestones, setMilestones],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}
