import { Fragment, type ReactNode } from 'react';
import { hrefSeguro, interpretarMarkdown, type Bloco, type Inline, type ItemLista } from './interpretador';

/**
 * Desenha o markdown das notas de atualização como elementos React (sem HTML cru e sem
 * `dangerouslySetInnerHTML`): todo texto é escapado pelo React e os links só abrem http(s).
 */

function renderInline(nos: Inline[]): ReactNode {
  return nos.map((n, i) => {
    switch (n.t) {
      case 'texto':
        return <Fragment key={i}>{n.v}</Fragment>;
      case 'negrito':
        return <strong key={i}>{renderInline(n.c)}</strong>;
      case 'italico':
        return <em key={i}>{renderInline(n.c)}</em>;
      case 'codigo':
        return <code key={i}>{n.v}</code>;
      case 'quebra':
        return <br key={i} />;
      case 'link': {
        const href = hrefSeguro(n.href);
        if (!href) return <Fragment key={i}>{renderInline(n.c)}</Fragment>;
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer">
            {renderInline(n.c)}
          </a>
        );
      }
    }
  });
}

function Lista({ ordenada, itens }: { ordenada: boolean; itens: ItemLista[] }) {
  const Tag = ordenada ? 'ol' : 'ul';
  return (
    <Tag>
      {itens.map((it, i) => (
        <li key={i} className={it.nivel > 0 ? `md-n${it.nivel}` : undefined}>
          {renderInline(it.c)}
        </li>
      ))}
    </Tag>
  );
}

function renderBloco(b: Bloco, i: number): ReactNode {
  switch (b.t) {
    case 'titulo':
      // O título da release é h3: os do texto ficam um nível abaixo (h4) ou dois (h5).
      return b.nivel <= 2 ? <h4 key={i}>{renderInline(b.c)}</h4> : <h5 key={i}>{renderInline(b.c)}</h5>;
    case 'paragrafo':
      return <p key={i}>{renderInline(b.c)}</p>;
    case 'lista':
      return <Lista key={i} ordenada={b.ordenada} itens={b.itens} />;
    case 'citacao':
      return <blockquote key={i}>{renderInline(b.c)}</blockquote>;
    case 'codigo':
      return (
        <pre key={i}>
          <code>{b.v}</code>
        </pre>
      );
    case 'linha':
      return <hr key={i} className="divider" />;
  }
}

export function Markdown({ texto }: { texto: string }) {
  return <div className="md">{interpretarMarkdown(texto).map(renderBloco)}</div>;
}
