import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Download, Lock, Share, SquarePlus, X } from 'lucide-react';
import { linkProps, type RouteId } from '../../lib/router';
import { DIAS_SEMANA_CURTOS, formatDateBR, formatMinutes, monthKeyOf, monthLabel, nowHM, todayISO, weekdayOf } from '../../lib/date';
import { readString, writeString } from '../../lib/storage';
import { useInstall, useOnline } from '../../lib/pwa';
import { NAV, APP_VERSION } from '../../app/nav';
import { IOSInstallHelp } from '../../app/Shell';
import { toast } from '../../components/toast';
import { useEscala } from '../escala/store';
import { calcularResumo, proximoTurno } from '../escala/calc';
import './inicio.css';

const K_NOVIDADES = '190a:novidades-v5';

/** Data e hora do aparelho, atualizadas a cada minuto. */
function useAgora() {
  const [agora, setAgora] = useState(() => ({ data: todayISO(), hora: nowHM() }));
  useEffect(() => {
    const id = window.setInterval(() => setAgora({ data: todayISO(), hora: nowHM() }), 10_000);
    return () => window.clearInterval(id);
  }, []);
  return agora;
}

function saudacao(hora: string): string {
  const h = Number(hora.slice(0, 2));
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const diaCurto = (iso: string) => `${DIAS_SEMANA_CURTOS[weekdayOf(iso)].toUpperCase()} ${formatDateBR(iso).slice(0, 5)}`;

function Painel() {
  const { data, hora } = useAgora();
  const online = useOnline();
  const db = useEscala();
  const servico = proximoTurno(db.entries, `${data}T${hora}`);
  return (
    <section className="painel" aria-label="Painel">
      <div className="painel-topo">
        <span className="eyebrow">Painel</span>
        <h1>{saudacao(hora)}. Bom serviço!</h1>
      </div>
      <dl className="painel-status">
        <div>
          <dt>Data</dt>
          <dd className="mono">
            {DIAS_SEMANA_CURTOS[weekdayOf(data)].toUpperCase()} {formatDateBR(data)}
          </dd>
        </div>
        <div>
          <dt>Hora</dt>
          <dd className="mono">{hora}</dd>
        </div>
        <div>
          <dt>Conexão</dt>
          <dd className={`mono ${online ? 'ok' : 'off'}`}>
            <i aria-hidden /> {online ? 'Online' : 'Offline'}
          </dd>
        </div>
        {servico && (
          <div className="servico">
            <dt>{servico.emAndamento ? 'Em serviço' : 'Próximo serviço'}</dt>
            <dd className="mono">
              <a {...linkProps('escala')}>
                {servico.emAndamento
                  ? `até ${servico.turno.end}`
                  : `${diaCurto(servico.turno.date)} ${servico.turno.start}–${servico.turno.end}`}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function Tile({ id, destaque, extra }: { id: RouteId; destaque?: boolean; extra?: ReactNode }) {
  const n = NAV[id];
  const Icon = n.icon;
  return (
    <a className={`tile${destaque ? ' destaque' : ''}`} {...linkProps(id)}>
      <span className="tile-ico">
        <Icon />
      </span>
      <span className="tile-txt">
        <strong>{n.long}</strong>
        <small>{n.desc}</small>
      </span>
      <ArrowRight className="tile-seta" />
      {extra}
    </a>
  );
}

function ResumoEscala() {
  const db = useEscala();
  const mes = monthKeyOf(todayISO());
  const r = calcularResumo(db.entries, mes, db.config);
  if (db.entries.length === 0) return null;
  const pct = Math.min(1, r.progresso);
  return (
    <span className="tile-escala">
      <span className="tile-escala-txt">
        <b>{formatMinutes(r.trabalhado)}</b> de {formatMinutes(r.meta)} em {monthLabel(mes).split(' ')[0]}
        {r.extras > 0 && <em> · +{formatMinutes(r.extras)} extras</em>}
      </span>
      <span className="tile-escala-bar">
        <i style={{ width: `${pct * 100}%` }} />
      </span>
    </span>
  );
}

export default function InicioPage() {
  const [novidades, setNovidades] = useState(() => !readString(K_NOVIDADES));
  const [iosHelp, setIosHelp] = useState(false);
  const { canPrompt, install, showIOSHelp, installed } = useInstall();

  return (
    <div className="page inicio">
      <Painel />

      {novidades && (
        <section className="card pad novidades">
          <button
            type="button"
            className="icon-btn fechar"
            aria-label="Fechar novidades"
            onClick={() => {
              writeString(K_NOVIDADES, APP_VERSION);
              setNovidades(false);
            }}
          >
            <X />
          </button>
          <div className="card-title">Novidades da versão 5</div>
          <ul>
            <li>
              <b>Novo visual</b>, mais sóbrio, com tema escuro e claro.
            </li>
            <li>
              <b>Release</b> no padrão do batalhão, com ícone 🚔, 🦅 ou ⚡ no título.
            </li>
            <li>
              <b>Data e hora</b> com seletores próprios, que abrem sempre dentro da tela.
            </li>
            <li>
              <b>Minha escala</b> mais dinâmica: gerador de escala (12x36, 24x72…), férias, relatório em PDF.{' '}
              <em>Seus registros anteriores foram mantidos.</em>
            </li>
            <li>
              <b>Croqui</b> com as ruas reais do local em traçado plano (sem satélite), em escala real, com setas, medidas e legenda.
            </li>
            <li>O módulo “Assuntos Correntes” foi descontinuado.</li>
          </ul>
        </section>
      )}

      <div className="eyebrow secao-titulo">Ferramentas</div>
      <div className="tiles">
        <Tile id="veiculos" destaque />
        <Tile id="release" />
        <Tile id="escala" extra={<ResumoEscala />} />
        <Tile id="croqui" />
        <Tile id="taf" />
        <Tile id="sugestoes" />
      </div>

      {!installed && (canPrompt || showIOSHelp) && (
        <section className="card pad instalar">
          <div className="grow">
            <strong>Instale o 190 ALERTAS</strong>
            <p className="muted">Abre como aplicativo, direto da tela inicial, e funciona sem internet.</p>
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={async () => {
              if (canPrompt) {
                if (await install()) toast({ title: 'App instalado!', kind: 'success' });
              } else setIosHelp(true);
            }}
          >
            {canPrompt ? <Download /> : <SquarePlus />} Instalar
          </button>
        </section>
      )}

      <section className="privacidade">
        <Lock size={16} />
        <p>
          Nada do que você digita nas ferramentas é enviado para servidores: rascunhos, escala e croquis ficam salvos só neste
          aparelho.{' '}
          <a {...linkProps('termos')}>Termos e privacidade</a>
        </p>
      </section>

      <footer className="creditos">
        Idealizado e criado por <b>Sd Ferrão · 32º BPM</b> — em desenvolvimento desde janeiro de 2023.
        <br />
        <span className="mono">v{APP_VERSION}</span>
        {showIOSHelp && (
          <>
            {' '}
            · <Share size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> iPhone: Compartilhar → Adicionar à Tela de Início
          </>
        )}
      </footer>

      <IOSInstallHelp open={iosHelp} onClose={() => setIosHelp(false)} />
    </div>
  );
}
