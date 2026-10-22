import { ChevronRight, Cloud, CloudAlert, CloudCheck, CloudOff, CloudUpload, type LucideIcon } from 'lucide-react';
import { formatarHa } from '../sync/estado';
import { useStatusSync, type StatusSync } from '../sync/useStatus';

export type Tom = 'ok' | 'pendente' | 'erro' | 'ocupado';

export interface Descricao {
  titulo: string;
  detalhe: string;
  tom: Tom;
  Icone: LucideIcon;
}

/** Texto e ícone do estado da sincronização (o mesmo no indicador e no painel). */
export function descrever(st: StatusSync): Descricao {
  const { s, agora } = st;
  switch (st.situacao) {
    case 'ocupado':
      return { titulo: 'Sincronizando…', detalhe: 'Enviando e recebendo a sua escala', tom: 'ocupado', Icone: Cloud };
    case 'sessao':
      return { titulo: 'Sessão expirada', detalhe: 'Toque para entrar de novo com o Google', tom: 'erro', Icone: CloudAlert };
    case 'erro':
      return { titulo: 'Falha na sincronização', detalhe: 'Toque para ver o motivo', tom: 'erro', Icone: CloudAlert };
    case 'pendente': {
      const detalhe = !s.auto
        ? 'Toque para sincronizar agora'
        : !st.online
          ? 'Serão enviadas quando a internet voltar'
          : 'Serão enviadas em instantes';
      return { titulo: 'Alterações não enviadas', detalhe, tom: 'pendente', Icone: CloudUpload };
    }
    default:
      return {
        titulo: 'Sincronizado',
        detalhe: s.ultima != null ? `Última: ${formatarHa(agora - s.ultima)}` : 'Escala em dia com a nuvem',
        tom: 'ok',
        Icone: CloudCheck,
      };
  }
}

function textos(st: StatusSync): { l1: string; l2: string } {
  const { s, agora } = st;
  switch (st.situacao) {
    case 'ocupado':
      return { l1: 'Sincronizando…', l2: 'Aguarde um instante' };
    case 'sessao':
      return { l1: 'Sessão expirada', l2: 'Toque para entrar' };
    case 'erro':
      return { l1: 'Falha ao sincronizar', l2: 'Toque para ver o motivo' };
    case 'pendente':
      return {
        l1: 'Alterações não enviadas',
        l2: !s.auto ? 'Toque para sincronizar' : st.online ? 'Enviando em instantes' : 'Envio quando a internet voltar',
      };
    default: {
      const quando = s.checado ?? s.ultima;
      return { l1: 'Sincronizado', l2: quando != null ? `Conferido ${formatarHa(agora - quando)}` : 'Escala em dia com a nuvem' };
    }
  }
}

/**
 * Indicador discreto à direita de "Resumo do mês": ícone de nuvem colorido pelo estado e duas
 * linhas — o que está acontecendo e quando conferiu a nuvem pela última vez. Sem conta conectada, mostra
 * "Nuvem não configurada". Em todos os casos o toque abre o painel de sincronização.
 */
export function SyncIndicador({ onClick }: { onClick: () => void }) {
  const st = useStatusSync();
  if (!st.s.ativo) {
    return (
      <button
        type="button"
        className="sync-topo off"
        onClick={onClick}
        title="Nuvem não configurada. Entre com o Google para manter a escala igual em todos os aparelhos."
        aria-label="Nuvem não configurada. Toque para configurar a sincronização."
      >
        <CloudOff aria-hidden />
        <span className="txt">
          <strong>Nuvem não configurada</strong>
          <small>Toque para configurar</small>
        </span>
      </button>
    );
  }
  const { detalhe, tom, Icone } = descrever(st);
  const { l1, l2 } = textos(st);
  return (
    <button
      type="button"
      className={`sync-topo ${tom}`}
      onClick={onClick}
      title={`${l1}. ${detalhe}.`}
      aria-label={`${l1}. ${l2}. Abrir sincronização.`}
    >
      {tom === 'ocupado' ? <span className="spinner" aria-hidden /> : <Icone aria-hidden />}
      <span className="txt">
        <strong>{l1}</strong>
        <small>{l2}</small>
      </span>
    </button>
  );
}

/** Linha do menu "Configurações da escala → Conexão e sincronização". */
export function SyncLinha({ onClick }: { onClick: () => void }) {
  const st = useStatusSync();
  const { s } = st;
  const conectado = s.ativo;
  const d = conectado ? descrever(st) : null;
  const Icone = d?.Icone ?? Cloud;
  return (
    <button type="button" className="list-item" onClick={onClick}>
      <span className={`ico sync-ico${d ? ` ${d.tom}` : ''}`}>{d?.tom === 'ocupado' ? <span className="spinner" aria-hidden /> : <Icone />}</span>
      <span className="txt">
        <strong>{conectado ? 'Sincronização com o Google' : 'Sincronizar entre aparelhos'}</strong>
        <small>
          {conectado
            ? `${s.email ?? 'Conta conectada'} · ${d!.titulo}`
            : 'Entre com o Google e use a mesma escala em todos os aparelhos'}
        </small>
      </span>
      <ChevronRight style={{ flex: 'none', color: 'var(--text-3)' }} aria-hidden />
    </button>
  );
}
