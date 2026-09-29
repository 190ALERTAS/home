/**
 * Estatísticas anônimas de uso (Google Analytics). Nunca enviar conteúdo digitado
 * pelo usuário — apenas nomes de telas e ações.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPage(path: string, title: string): void {
  try {
    window.gtag?.('event', 'page_view', { page_path: path, page_title: title, page_location: location.href });
  } catch {
    /* sem rede ou bloqueado: tudo bem */
  }
}

export function track(action: string, params: Record<string, string | number | boolean> = {}): void {
  try {
    window.gtag?.('event', action, params);
  } catch {
    /* ignora */
  }
}
