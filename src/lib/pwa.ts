import { useEffect, useState, useSyncExternalStore } from 'react';
import { BASE } from './router';

/* ---------- Instalação do app (Android/desktop) ---------- */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Registrado ao importar o módulo, antes do React montar (o evento pode vir cedo).
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
  emit();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  emit();
});

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

export function useInstall() {
  const canPrompt = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => deferred != null,
    () => false,
  );
  const standalone = isStandalone();
  return {
    /** O navegador oferece instalação direta (Chrome/Edge/Android). */
    canPrompt,
    /** iPhone/iPad fora do app instalado: mostrar instruções manuais. */
    showIOSHelp: !standalone && isIOS(),
    installed: standalone,
    async install(): Promise<boolean> {
      if (!deferred) return false;
      const ev = deferred;
      deferred = null;
      emit();
      await ev.prompt();
      const choice = await ev.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
      return choice.outcome === 'accepted';
    },
  };
}

/* ---------- Conexão ---------- */

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/* ---------- Limpeza do service worker da versão 4 ---------- */

/**
 * A versão 4 registrava /home/js/sw.js com um cache próprio. Removemos esse
 * registro e o cache antigo para não sobrar lixo no aparelho.
 */
export async function cleanupLegacyServiceWorker(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs
          .filter((r) => new URL(r.scope).pathname.startsWith(`${BASE}js/`))
          .map((r) => r.unregister().catch(() => false)),
      );
    }
    if ('caches' in window) {
      await caches.delete('minha-pagina-cache-v1');
    }
  } catch {
    /* sem suporte: nada a fazer */
  }
}
