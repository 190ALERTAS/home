import { useMemo } from 'react';
import { useEscala } from '../store';
import { iguaisInst, instantaneoDe } from './merge';
import { janela, lerBase, situacao, useRelogio, useSync, type Janela, type Situacao, type SyncEstado } from './estado';

export interface StatusSync {
  s: SyncEstado;
  agora: number;
  janela: Janela;
  /** Há alterações neste aparelho que ainda não foram para a nuvem. */
  pendente: boolean;
  situacao: Situacao;
}

/** Tudo que o indicador da escala e o painel de sincronização precisam para se desenhar. */
export function useStatusSync(): StatusSync {
  const s = useSync();
  const db = useEscala();
  const agora = useRelogio(s.ativo);
  // "ultima" entra nas dependências porque muda quando a base é regravada (sincronizou).
  const pendente = useMemo(() => {
    if (!s.ativo) return false;
    const base = lerBase(s.uid);
    return !base || !iguaisInst(instantaneoDe(db), base);
  }, [db, s.ativo, s.uid, s.ultima]);
  return { s, agora, janela: janela(s.ultima, agora), pendente, situacao: situacao(s, pendente) };
}
