import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, CornerDownLeft, Search, X } from 'lucide-react';
import { Sheet } from './Sheet';

/*
 * Campo de escolha com busca: abre uma folha com a lista agrupada, os itens
 * usados recentemente e a opção de usar o texto digitado. Substitui o <datalist>
 * nativo, que é pouco prático no celular.
 */

export interface GrupoOpcoes {
  titulo: string;
  itens: readonly string[];
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
/** Texto comparável: sem acentos, maiúsculo e com espaços simples. */
export const normalizarBusca = (s: string) =>
  semAcento(s)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
const compacto = (s: string) => s.replace(/ /g, '');

/** Cada palavra da busca precisa aparecer no item (em qualquer ordem). "cg160" acha "CG 160". */
export function combina(item: string, busca: string): boolean {
  const alvo = normalizarBusca(item);
  const palavras = normalizarBusca(busca).split(' ').filter(Boolean);
  return palavras.every((p) => alvo.includes(p) || compacto(alvo).includes(p));
}

interface Linha {
  tipo: 'titulo' | 'item' | 'livre';
  texto: string;
  chave: string;
}

export function CampoOpcoes({
  id,
  rotulo,
  titulo,
  value,
  onChange,
  grupos,
  recentes = [],
  atalhos = [],
  placeholder,
  placeholderBusca = 'Buscar ou digitar',
}: {
  id?: string;
  /** Nome do campo para leitores de tela (ex.: "Fato"). */
  rotulo: string;
  /** Título da folha. */
  titulo?: string;
  value: string;
  onChange: (v: string) => void;
  grupos: readonly GrupoOpcoes[];
  /** Mostrados no topo da lista. */
  recentes?: readonly string[];
  /** Botões de um toque exibidos abaixo do campo. */
  atalhos?: readonly string[];
  placeholder: string;
  placeholderBusca?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const atual = normalizarBusca(value);

  const abrir = () => {
    setBusca('');
    setAberto(true);
    // No computador já dá para digitar; no celular o teclado só abre se tocar na busca.
    if (window.matchMedia?.('(pointer: fine)').matches) setTimeout(() => inputRef.current?.focus(), 60);
  };

  const escolher = (v: string) => {
    onChange(v.trim().replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR'));
    setAberto(false);
  };

  const linhas = useMemo<Linha[]>(() => {
    const termo = busca.trim();
    const out: Linha[] = [];
    const vistos = new Set<string>();
    const adicionarGrupo = (tituloGrupo: string, itens: readonly string[]) => {
      const filtrados = itens.filter((i) => !vistos.has(normalizarBusca(i)) && (!termo || combina(i, termo)));
      if (!filtrados.length) return;
      out.push({ tipo: 'titulo', texto: tituloGrupo, chave: `t:${tituloGrupo}` });
      for (const i of filtrados) {
        vistos.add(normalizarBusca(i));
        out.push({ tipo: 'item', texto: i, chave: `i:${tituloGrupo}:${i}` });
      }
    };
    if (recentes.length) adicionarGrupo('Recentes', recentes);
    for (const g of grupos) adicionarGrupo(g.titulo, g.itens);
    if (termo) {
      const exato = out.some((l) => l.tipo === 'item' && normalizarBusca(l.texto) === normalizarBusca(termo));
      if (!exato) {
        const livre: Linha = { tipo: 'livre', texto: termo.toLocaleUpperCase('pt-BR'), chave: 'livre' };
        // Sem resultados: a opção de usar o texto vem primeiro; com resultados, no fim.
        if (out.length === 0) out.unshift(livre);
        else out.push(livre);
      }
    }
    return out;
  }, [busca, grupos, recentes]);

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const primeira = linhas.find((l) => l.tipo !== 'titulo');
    if (primeira) escolher(primeira.texto);
  };

  const outrosAtalhos = atalhos.filter((a) => normalizarBusca(a) !== atual).slice(0, 3);

  return (
    <>
      <button
        id={id}
        type="button"
        className="input campo-picker campo-opcoes"
        aria-haspopup="dialog"
        aria-label={`${rotulo}: ${value.trim() || placeholder}`}
        onClick={abrir}
      >
        <span className={value.trim() ? 'valor' : 'valor vazio'}>{value.trim() || placeholder}</span>
        <ChevronDown aria-hidden />
      </button>
      {outrosAtalhos.length > 0 && (
        <div className="chips atalhos-opcoes" aria-label={`${rotulo}: atalhos`}>
          {outrosAtalhos.map((a) => (
            <button key={a} type="button" className="chip" onClick={() => onChange(a)}>
              {a}
            </button>
          ))}
        </div>
      )}

      <Sheet open={aberto} onClose={() => setAberto(false)} title={titulo ?? rotulo}>
        <div className="opcoes">
          <div className="opcoes-topo">
            <div className="opcoes-busca">
              <Search aria-hidden />
              <input
                ref={inputRef}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={aoTeclar}
                placeholder={placeholderBusca}
                aria-label={`Buscar ${rotulo.toLowerCase()}`}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
              />
              {busca && (
                <button type="button" className="icon-btn" aria-label="Limpar busca" onClick={() => setBusca('')}>
                  <X />
                </button>
              )}
            </div>
          </div>
          <div className="opcoes-lista" role="listbox" aria-label={titulo ?? rotulo}>
            {linhas.map((l) =>
              l.tipo === 'titulo' ? (
                <div key={l.chave} className="opcoes-grupo" role="presentation">
                  {l.texto}
                </div>
              ) : (
                <button
                  key={l.chave}
                  type="button"
                  role="option"
                  aria-selected={l.tipo === 'item' && normalizarBusca(l.texto) === atual}
                  className={`opcao${l.tipo === 'livre' ? ' livre' : ''}`}
                  onClick={() => escolher(l.texto)}
                >
                  {l.tipo === 'livre' ? (
                    <>
                      <CornerDownLeft aria-hidden />
                      <span>
                        Usar “<b>{l.texto}</b>”
                      </span>
                    </>
                  ) : (
                    <>
                      <span>{l.texto}</span>
                      {normalizarBusca(l.texto) === atual && <Check aria-hidden />}
                    </>
                  )}
                </button>
              ),
            )}
            {linhas.length === 0 && <p className="opcoes-vazio">Digite para buscar ou escrever o texto.</p>}
          </div>
        </div>
      </Sheet>
    </>
  );
}
