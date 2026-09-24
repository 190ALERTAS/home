import { useState, type ReactNode } from 'react';
import { ArrowRight, CalendarDays, Download, Lock, Share, Sparkles, SquarePlus, X } from 'lucide-react';
import mascote from '../../assets/mascote.webp';
import { linkProps, type RouteId } from '../../lib/router';
import { formatMinutes, monthKeyOf, monthLabel, todayISO } from '../../lib/date';
import { readString, writeString } from '../../lib/storage';
import { useInstall } from '../../lib/pwa';
import { NAV, APP_VERSION } from '../../app/nav';
import { IOSInstallHelp } from '../../app/Shell';
import { toast } from '../../components/toast';
import { useEscala } from '../escala/store';
import { calcularResumo } from '../escala/calc';
import './inicio.css';

const K_NOVIDADES = '190a:novidades-v5';

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
      <section className="home-hero">
        <div className="home-mascote">
          <img src={mascote} alt="Mascote do 190 ALERTAS" width={132} height={132} fetchPriority="high" />
        </div>
        <div className="home-txt">
          <span className="eyebrow">De praça para praça</span>
          <h1>
            <span className="n">190</span> ALERTAS
          </h1>
          <p>Release, alerta de veículo, croqui, escala e TAF — rápido, organizado e pronto para o WhatsApp.</p>
        </div>
      </section>

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
          <div className="card-title">
            <Sparkles size={18} /> Novidades da versão 5
          </div>
          <ul>
            <li>
              <b>Novo visual</b>, com tema escuro e claro.
            </li>
            <li>
              <b>Release</b> no novo padrão, com ícone 🚔, 🦅 ou ⚡ no título.
            </li>
            <li>
              <b>Minha Escala</b> mais dinâmica: gerador de escala (12x36, 24x72…), férias, relatório em PDF.{' '}
              <em>Seus registros anteriores foram mantidos.</em>
            </li>
            <li>
              <b>Croqui</b> sobre mapa ou satélite em escala real, com setas, medidas e legenda.
            </li>
            <li>O módulo “Assuntos Correntes” foi descontinuado.</li>
          </ul>
        </section>
      )}

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
          Nada do que você digita é enviado para servidores: rascunhos, escala e croquis ficam salvos só neste aparelho.{' '}
          <a {...linkProps('termos')}>Termos e privacidade</a>
        </p>
      </section>

      <footer className="creditos">
        <CalendarDays size={14} /> Idealizado e criado por <b>Sd Ferrão · 32º BPM</b> — em desenvolvimento desde janeiro de 2023.
        <br />
        Versão {APP_VERSION}
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
