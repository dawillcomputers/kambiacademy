import { useCallback, useEffect, useState } from 'react';

// Shared light/dark theme for the student & teacher dashboards.
// Defaults to the OS preference and remembers a manual override per device.
// (The superadmin/manager dashboards keep their own existing toggle.)

const STORAGE_KEY = 'kambi-theme';
type Mode = 'light' | 'dark';

const systemMode = (): Mode =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const storedMode = (): Mode | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
};

export function useDashTheme() {
  const [mode, setMode] = useState<Mode>(() => storedMode() ?? systemMode());
  const [overridden, setOverridden] = useState<boolean>(() => storedMode() !== null);

  // Track the OS preference until the user makes an explicit choice.
  useEffect(() => {
    if (overridden || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => setMode(event.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [overridden]);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next: Mode = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      return next;
    });
    setOverridden(true);
  }, []);

  return { mode, isLight: mode === 'light', toggle };
}
