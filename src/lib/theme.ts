import { useSyncExternalStore } from 'react';
import { writeString } from './storage';

export type Theme = 'dark' | 'light';

const KEY = '190a:tema';
const listeners = new Set<() => void>();

function read(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.background = theme === 'light' ? '#f1f3f6' : '#0b0f14';
  // As barras do app são escuras nos dois temas; a barra do navegador acompanha.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0b0f14');
  writeString(KEY, theme);
  listeners.forEach((l) => l());
}

export function toggleTheme(): void {
  setTheme(read() === 'dark' ? 'light' : 'dark');
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => 'dark' as Theme,
  );
}
