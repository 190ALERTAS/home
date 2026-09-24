import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Parte inferior fixa do app: as barras das telas (Copiar/WhatsApp, seleção da escala,
 * total do TAF) flutuam logo acima da navegação, sempre dentro da largura da tela.
 * A altura total vira a variável CSS --dock-h (espaço no fim da página e avisos).
 */
export const DockContext = createContext<HTMLElement | null>(null);

/** Leva o conteúdo para o dock inferior (acima da navegação). */
export function NoDock({ children }: { children: ReactNode }) {
  const slot = useContext(DockContext);
  return slot ? createPortal(children, slot) : null;
}
