/** Copiar, compartilhar e baixar — com alternativas para navegadores antigos. */

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* tenta o método alternativo abaixo */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '0';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

export function whatsappLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function openWhatsApp(text: string): void {
  // Um <a> clicado é mais confiável que window.open (bloqueadores de pop-up, iOS).
  const a = document.createElement('a');
  a.href = whatsappLink(text);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export type ShareResult = 'shared' | 'aborted' | 'unsupported' | 'error';

export async function shareText(text: string, title?: string): Promise<ShareResult> {
  if (!canShare()) return 'unsupported';
  try {
    await navigator.share({ text, title });
    return 'shared';
  } catch (e) {
    return (e as DOMException)?.name === 'AbortError' ? 'aborted' : 'error';
  }
}

export function canShareFiles(files: File[]): boolean {
  try {
    return canShare() && typeof navigator.canShare === 'function' && navigator.canShare({ files });
  } catch {
    return false;
  }
}

export async function shareFiles(files: File[], title?: string, text?: string): Promise<ShareResult> {
  if (!canShareFiles(files)) return 'unsupported';
  try {
    await navigator.share({ files, title, text });
    return 'shared';
  } catch (e) {
    return (e as DOMException)?.name === 'AbortError' ? 'aborted' : 'error';
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Abre o seletor de arquivos e devolve o texto do arquivo escolhido. */
export function pickTextFile(accept = 'application/json,.json'): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return resolve(null);
      try {
        resolve({ name: file.name, text: await file.text() });
      } catch {
        resolve(null);
      }
    });
    // Alguns navegadores não disparam "change" ao cancelar; ok, a promessa fica pendente.
    document.body.appendChild(input);
    input.click();
  });
}
