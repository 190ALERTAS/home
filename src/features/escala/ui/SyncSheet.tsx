import { useEffect, useState } from 'react';
import { CloudAlert, Cloud, CircleCheck, ListChecks, LogIn, LogOut, RefreshCw, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { Sheet } from '../../../components/Sheet';
import { Switch, gap } from '../../../components/ui';
import { confirmDialog } from '../../../components/dialogs';
import { useOnline } from '../../../lib/pwa';
import { definirSync, formatarQuando, formatarRestante, INTERVALO_MS } from '../sync/estado';
import { apagarNuvem, conectar, desconectar, sincronizar, type Resultado } from '../sync/motor';
import { useStatusSync, type StatusSync } from '../sync/useStatus';
import { BarraJanela, descrever } from './SyncStatus';

const HORAS = INTERVALO_MS / 3_600_000;

interface Retorno {
  tipo: 'ok' | 'info';
  texto: string;
}

/** O que aconteceu, em uma frase (toasts ficam atrás da folha, então o retorno aparece aqui dentro). */
function retornoDe(r: Resultado, okTexto: string): Retorno | null {
  if (r.ok) {
    const texto =
      r.enviou && r.recebeu
        ? 'Escala atualizada nos dois sentidos.'
        : r.recebeu
          ? 'Trouxe as alterações feitas em outros aparelhos.'
          : r.enviou
            ? 'Suas alterações foram enviadas para a nuvem.'
            : 'Tudo já estava igual na nuvem.';
    return { tipo: 'ok', texto: `${okTexto} ${texto}` };
  }
  if (r.motivo === 'janela' || r.motivo === 'ocupado') return { tipo: 'info', texto: r.mensagem };
  return null; // erros aparecem pelo aviso persistente (estado.erro)
}

function Estado({ st }: { st: StatusSync }) {
  const { s, agora, janela: j } = st;
  const d = descrever(st);
  const { Icone } = d;
  return (
    <div className="subcard sync-estado">
      <div className="item-row">
        <span className={`sync-ico ${d.tom}`}>{d.tom === 'ocupado' ? <span className="spinner" aria-hidden /> : <Icone aria-hidden />}</span>
        <div className="grow">
          <strong>{d.titulo}</strong>
          <div className="subtle" style={{ fontSize: 13.5 }}>{d.detalhe}</div>
        </div>
      </div>
      <BarraJanela progresso={j.progresso} aberta={j.aberta} />
      <div className="grid-2">
        <div className="kpi">
          <span className="v" style={{ fontSize: 17 }}>{s.ultima != null ? formatarQuando(s.ultima, agora) : '—'}</span>
          <span className="l">Última sincronização</span>
        </div>
        <div className="kpi">
          <span className={`v ${j.aberta ? 'green' : ''}`} style={{ fontSize: 17 }}>{j.aberta ? 'Agora' : `em ${formatarRestante(j.restanteMs)}`}</span>
          <span className="l">Próxima disponível</span>
        </div>
      </div>
    </div>
  );
}

export function SyncSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const st = useStatusSync();
  const { s, janela: j, pendente } = st;
  const online = useOnline();
  const [retorno, setRetorno] = useState<Retorno | null>(null);

  useEffect(() => {
    if (!open) setRetorno(null);
  }, [open]);

  const entrar = async () => {
    setRetorno(null);
    const r = await conectar();
    setRetorno(retornoDe(r, 'Conta conectada.'));
  };

  const sincronizarAgora = async () => {
    setRetorno(null);
    const r = await sincronizar('manual');
    setRetorno(retornoDe(r, 'Sincronizado.'));
  };

  const sair = async () => {
    const ok = await confirmDialog({
      title: 'Sair da conta Google?',
      message: 'A escala continua neste aparelho e a cópia na nuvem não é alterada. Só deixa de sincronizar.',
      confirmLabel: 'Sair',
    });
    if (!ok) return;
    await desconectar();
    setRetorno(null);
  };

  const apagar = async () => {
    const ok = await confirmDialog({
      title: 'Apagar a cópia na nuvem?',
      message:
        'Remove a escala guardada na sua conta Google. A escala deste aparelho e dos outros não é tocada, e a sincronização automática é desligada.',
      confirmLabel: 'Apagar da nuvem',
      danger: true,
    });
    if (!ok) return;
    const r = await apagarNuvem();
    setRetorno(r.ok ? { tipo: 'ok', texto: 'Cópia na nuvem apagada.' } : null);
  };

  const ocupado = s.ocupado;

  return (
    <Sheet open={open} onClose={onClose} title="Conexão e sincronização" subtitle="Minha escala em todos os seus aparelhos">
      {!s.ativo ? (
        <div className="stack" style={gap(16)}>
          <div className="callout blue">
            <Cloud />
            <div>
              <strong>Mesma escala em todos os aparelhos.</strong> Entre com a mesma conta Google no celular, no tablet e no
              computador e mantenha os lançamentos iguais em todos.
            </div>
          </div>

          <div className="list">
            <div className="list-item">
              <span className="ico"><RefreshCw /></span>
              <span className="txt">
                <strong>Uma sincronização a cada {HORAS} h</strong>
                <small>Manual ou automática, para gastar pouco</small>
              </span>
            </div>
            <div className="list-item">
              <span className="ico"><ListChecks /></span>
              <span className="txt">
                <strong>O que é sincronizado</strong>
                <small>Lançamentos, turnos salvos, carga horária e identificação do PDF</small>
              </span>
            </div>
            <div className="list-item">
              <span className="ico"><ShieldCheck /></span>
              <span className="txt">
                <strong>Só você acessa</strong>
                <small>Cada conta lê e grava apenas nos próprios dados</small>
              </span>
            </div>
          </div>

          {s.erro && (
            <div className="callout amber" role="alert">
              <CloudAlert />
              <div>{s.erro}</div>
            </div>
          )}

          <button type="button" className="btn primary lg block" disabled={ocupado || !online} onClick={entrar}>
            {ocupado ? <span className="spinner" /> : <LogIn />} Entrar com Google
          </button>
          {!online && <p className="subtle" style={{ fontSize: 13 }}>Sem internet no momento: conecte-se para entrar.</p>}

          <p className="subtle" style={{ fontSize: 13 }}>
            Os dados ficam guardados no Firebase (Google), ligados à sua conta. Sem entrar, nada sai do aparelho. Você pode
            apagar a cópia da nuvem quando quiser.
          </p>
        </div>
      ) : (
        <div className="stack" style={gap(18)}>
          <Estado st={st} />

          {s.erro && !s.precisaEntrar && (
            <div className="callout amber" role="alert">
              <CloudAlert />
              <div>{s.erro}</div>
            </div>
          )}
          {s.precisaEntrar && (
            <div className="callout amber" role="alert">
              <CloudAlert />
              <div>Sua sessão do Google expirou. Entre de novo para voltar a sincronizar; a escala deste aparelho está intacta.</div>
            </div>
          )}
          {retorno && (
            <div className={`callout ${retorno.tipo === 'ok' ? 'blue' : ''}`} role="status">
              {retorno.tipo === 'ok' ? <CircleCheck /> : <Cloud />}
              <div>{retorno.texto}</div>
            </div>
          )}

          <div className="stack" style={gap(8)}>
            {s.precisaEntrar ? (
              <button type="button" className="btn primary lg block" disabled={ocupado || !online} onClick={entrar}>
                {ocupado ? <span className="spinner" /> : <LogIn />} Entrar novamente
              </button>
            ) : (
              <button
                type="button"
                className="btn primary lg block"
                disabled={ocupado || !j.aberta || !online}
                onClick={sincronizarAgora}
              >
                {ocupado ? <span className="spinner" /> : <RefreshCw />} Sincronizar agora
              </button>
            )}
            {!s.precisaEntrar && !j.aberta && (
              <p className="subtle" style={{ fontSize: 13, textAlign: 'center' }}>
                A sincronização de {HORAS} h já foi usada. Libera em {formatarRestante(j.restanteMs)}
                {pendente ? ' — suas alterações seguem nela.' : '.'}
              </p>
            )}
            {!online && j.aberta && (
              <p className="subtle" style={{ fontSize: 13, textAlign: 'center' }}>Sem internet no momento.</p>
            )}
          </div>

          <Switch
            checked={s.auto}
            onChange={(auto) => definirSync({ auto })}
            label="Sincronização automática"
            description={`Ao abrir o app, no máximo uma vez a cada ${HORAS} h. Desligada, você sincroniza só pelo botão.`}
          />

          <div className="list">
            <div className="list-item">
              <span className="ico"><UserRound /></span>
              <span className="txt">
                <strong>{s.nome ?? 'Conta Google'}</strong>
                <small>{s.email ?? 'Conectada'}</small>
              </span>
            </div>
            <button type="button" className="list-item" disabled={ocupado} onClick={sair}>
              <span className="ico"><LogOut /></span>
              <span className="txt">
                <strong>Sair desta conta</strong>
                <small>A escala continua neste aparelho</small>
              </span>
            </button>
            <button type="button" className="list-item" disabled={ocupado || !online} onClick={apagar}>
              <span className="ico" style={{ color: 'var(--danger)' }}><Trash2 /></span>
              <span className="txt">
                <strong style={{ color: 'var(--danger)' }}>Apagar cópia na nuvem</strong>
                <small>Remove os dados da sua conta; os aparelhos não são afetados</small>
              </span>
            </button>
          </div>

          <p className="subtle" style={{ fontSize: 13 }}>
            Apagar um lançamento aqui apaga nos outros aparelhos na próxima sincronização. Se dois aparelhos mudarem o mesmo
            lançamento, vale o do aparelho que sincronizar por último. Continue fazendo backups pelo menu da escala.
          </p>
        </div>
      )}
    </Sheet>
  );
}
