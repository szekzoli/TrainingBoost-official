// Az ügyfél saját beállításai (csak ezen az eszközön, localStorage): téma és pihenőidő-számláló.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';

type Prefs = {
  theme: ThemePref;
  /** A ténylegesen használt téma (a "system" feloldva). */
  dark: boolean;
  setTheme: (t: ThemePref) => void;
  restTimer: boolean;
  setRestTimer: (on: boolean) => void;
};

const THEME_KEY = 'tb_app_theme';
const TIMER_KEY = 'tb_app_rest_timer';

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
  const setRestTimer = useCallback((on: boolean) => {
    setRestTimerState(on);
    write(TIMER_KEY, on ? 'on' : 'off');
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
    () => ({ theme, dark, setTheme, restTimer, setRestTimer }),
    [theme, dark, setTheme, restTimer, setRestTimer],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}
