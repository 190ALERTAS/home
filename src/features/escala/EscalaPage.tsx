import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  DatabaseBackup,
  Download,
  FileDown,
  FileUp,
  ListChecks,
  MessageCircle,
  Palmtree,
  Settings2,
  Share2,
  Trash2,
  Undo2,
  Wand2,
  Ellipsis,
  ShieldCheck,
} from 'lucide-react';
import { Card, PageHead, Seg, gap } from '../../components/ui';
import { Sheet } from '../../components/Sheet';
import { toast } from '../../components/toast';
import { confirmDialog } from '../../components/dialogs';
import { formatMinutes, monthKeyOf, monthLabel, parseMonthKey, shiftMonth, todayISO } from '../../lib/date';
import { canShareFiles, downloadBlob, openWhatsApp, pickTextFile, shareFiles } from '../../lib/share';
import { readString, writeString } from '../../lib/storage';
import { track } from '../../lib/analytics';
import { calcularResumo, duplicados, entriesDoMes, porDia } from './calc';
import { interpretarBackup, mesclar, normalizarV2 } from './migrate';
import { removerMes } from './ops';
import { dbVazio, type Entry, type EscalaDB } from './model';
import { atualizar, consumirAviso, desfazer, podeDesfazer, useEscala, type Aviso } from './store';
import { exportarBackup, gerarPdfMes, nomeMes, textoResumo } from './acoes';
import { Calendario } from './ui/Calendario';
import { Resumo } from './ui/Resumo';
import { DiaSheet } from './ui/DiaSheet';
import { GeradorSheet } from './ui/GeradorSheet';
import { PeriodoSheet } from './ui/PeriodoSheet';
import { ConfigSheet } from './ui/ConfigSheet';
import { SelecaoBar } from './ui/Selecao';
import { ListaMes } from './ui/Lista';
import { MesPicker } from './ui/MesPicker';
import { AnoView } from './ui/AnoView';
import './escala.css';

const K_AVISO_MIGRACAO = '190a:escala:aviso-migracao-visto';

type Importacao = { tipo: 'v1'; entries: Entry[]; total: number; ignorados: number } | { tipo: 'v2'; db: EscalaDB };

export default function EscalaPage() {
  const db = useEscala();
  const hoje = todayISO();
  const [mes, setMes] = useState(monthKeyOf(hoje));
  const [visao, setVisao] = useState<'mes' | 'ano'>('mes');
  const [ano, setAno] = useState(parseMonthKey(monthKeyOf(hoje)).year);
  const [dia, setDia] = useState<string | null>(null);
  const [selecao, setSelecao] = useState<Set<string> | null>(null);
  const [sheet, setSheet] = useState<null | 'gerador' | 'periodo' | 'config' | 'menu' | 'mes'>(null);
  const [aviso, setAviso] = useState<Aviso | undefined>();
  const [importacao, setImportacao] = useState<Importacao | null>(null);
  const [pdfCarregando, setPdfCarregando] = useState(false);

  useEffect(() => {
    const a = consumirAviso();
    if (!a) return;
    if (a.tipo === 'migrado') {
      if (!readString(K_AVISO_MIGRACAO)) setAviso(a);
      toast({ title: 'Escala migrada para a nova versão', desc: `${a.turnos} turno(s) e ${a.marcacoes} marcação(ões) preservados.`, kind: 'success', duration: 5000 });
    } else if (a.tipo === 'sincronizado') {
      toast({ title: 'Lançamentos recuperados', desc: `${a.adicionadas} lançamento(s) feitos na versão anterior foram incorporados.`, kind: 'success', duration: 5000 });
    } else {
      toast({ title: 'Escala recuperada', desc: 'Os dados foram reconstruídos a partir da cópia da versão anterior.', kind: 'info', duration: 5000 });
    }
  }, []);

  const doMes = useMemo(() => entriesDoMes(db.entries, mes), [db.entries, mes]);
  const resumo = useMemo(() => calcularResumo(db.entries, mes, db.config), [db.entries, mes, db.config]);
  const mapa = useMemo(() => porDia(doMes), [doMes]);
  const dups = useMemo(() => duplicados(doMes), [doMes]);
  const inicioSugerido = mes === monthKeyOf(hoje) ? hoje : `${mes}-01`;

  const irMes = (m: string) => {
    setMes(m);
    setAno(parseMonthKey(m).year);
  };

  const tocarDia = (d: string) => {
    if (selecao) {
      const s = new Set(selecao);
      if (s.has(d)) s.delete(d);
      else s.add(d);
      setSelecao(s);
    } else setDia(d);
  };

  const fecharAviso = () => {
    writeString(K_AVISO_MIGRACAO, new Date().toISOString());
    setAviso(undefined);
  };

  /* ---------- Ações do menu ---------- */

  const compartilharResumo = () => {
    track('escala_resumo');
    openWhatsApp(textoResumo(db, mes));
  };

  const pdf = async (modo: 'baixar' | 'compartilhar') => {
    setPdfCarregando(true);
    try {
      const blob = await gerarPdfMes(db, mes);
      const nome = `Escala_${mes}.pdf`;
      track('escala_pdf', { modo });
      if (modo === 'compartilhar') {
        const file = new File([blob], nome, { type: 'application/pdf' });
        const r = await shareFiles([file], `Escala ${nomeMes(mes)}`);
        if (r === 'unsupported') downloadBlob(blob, nome);
      } else downloadBlob(blob, nome);
      setSheet(null);
    } catch {
      toast({ title: 'Não foi possível gerar o PDF', desc: 'Verifique a conexão e tente novamente.', kind: 'error' });
    } finally {
      setPdfCarregando(false);
    }
  };

  const importar = async () => {
    const arq = await pickTextFile();
    if (!arq) return;
    const r = interpretarBackup(arq.text);
    if (r.formato === 'invalido') {
      toast({ title: 'Arquivo não reconhecido', desc: 'Escolha um backup da escala (.json).', kind: 'error' });
      return;
    }
    setSheet(null);
    setImportacao(
      r.formato === 'v1'
        ? { tipo: 'v1', entries: r.resultado.entries, total: r.resultado.total, ignorados: r.resultado.ignorados }
        : { tipo: 'v2', db: r.db },
    );
  };

  const concluirImportacao = (modo: 'mesclar' | 'substituir') => {
    if (!importacao) return;
    const novas = importacao.tipo === 'v1' ? importacao.entries : importacao.db.entries;
    let adicionadas = novas.length;
    atualizar((atual) => {
      if (modo === 'substituir') {
        if (importacao.tipo === 'v2') return normalizarV2({ ...importacao.db, meta: atual.meta }) ?? atual;
        return { ...atual, entries: novas };
      }
      const m = mesclar(atual.entries, novas);
      adicionadas = m.adicionadas;
      return { ...atual, entries: m.entries };
    }, 'Importação');
    track('escala_importar', { modo });
    toast({
      title: 'Backup importado',
      desc: modo === 'mesclar' ? `${adicionadas} lançamento(s) novo(s).` : `${novas.length} lançamento(s) restaurados.`,
      kind: 'success',
      action: { label: 'Desfazer', onClick: () => desfazer() },
    });
    setImportacao(null);
  };

  const apagarMes = async () => {
    setSheet(null);
    const ok = await confirmDialog({
      title: `Apagar ${monthLabel(mes)}?`,
      message: `Todos os ${doMes.length} lançamento(s) de ${monthLabel(mes)} serão removidos.`,
      confirmLabel: 'Apagar mês',
      danger: true,
    });
    if (!ok) return;
    atualizar((d) => removerMes(d, mes), `Mês ${monthLabel(mes)} apagado`);
    toast({ title: 'Mês apagado', kind: 'success', action: { label: 'Desfazer', onClick: () => desfazer() } });
  };

  const apagarTudo = async () => {
    setSheet(null);
    const ok1 = await confirmDialog({
      title: 'Apagar TODOS os registros?',
      message: 'Isso remove toda a sua escala deste aparelho. Considere fazer um backup antes.',
      confirmLabel: 'Continuar',
      danger: true,
    });
    if (!ok1) return;
    const ok2 = await confirmDialog({
      title: 'Confirmação final',
      message: 'Esta ação é irreversível. NÃO SEJA BISONHO.',
      confirmLabel: 'Sim, apagar TUDO',
      danger: true,
    });
    if (!ok2) return;
    atualizar((d) => ({ ...dbVazio(), modelos: d.modelos, config: d.config, meta: d.meta }), 'Tudo apagado');
    toast({ title: 'Todos os registros foram apagados', kind: 'success', action: { label: 'Desfazer', onClick: () => desfazer() } });
  };

  return (
    <div className="page wide">
      <PageHead
        icon={CalendarDays}
        title="Minha Escala"
        subtitle="Turnos, horas trabalhadas e extras do mês."
        actions={
          <>
            <button type="button" className="icon-btn" aria-label="Configurações da escala" onClick={() => setSheet('config')}>
              <Settings2 />
            </button>
            <button type="button" className="icon-btn" aria-label="Mais ações" onClick={() => setSheet('menu')}>
              <Ellipsis />
            </button>
          </>
        }
      />

      {aviso?.tipo === 'migrado' && (
        <div className="callout blue" style={{ marginBottom: 14 }}>
          <ShieldCheck />
          <div className="grow">
            <strong>Seus registros foram migrados.</strong> {aviso.turnos} turno(s) e {aviso.marcacoes} marcação(ões) da
            versão anterior estão aqui, com as mesmas horas. Uma cópia original ficou guardada neste aparelho.
            <div style={{ marginTop: 8 }}>
              <button type="button" className="btn sm" onClick={fecharAviso}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="esc-top">
        <Seg<'mes' | 'ano'>
          value={visao}
          onChange={setVisao}
          ariaLabel="Visão"
          options={[
            { value: 'mes', label: 'Mês' },
            { value: 'ano', label: 'Ano' },
          ]}
        />
        {visao === 'mes' && (
          <div className="month-switch">
            <button type="button" className="icon-btn" aria-label="Mês anterior" onClick={() => irMes(shiftMonth(mes, -1))}>
              <ChevronLeft />
            </button>
            <button type="button" className="title" onClick={() => setSheet('mes')} aria-label="Escolher mês">
              {monthLabel(mes).split(' ')[0]}
              <small>{parseMonthKey(mes).year}</small>
            </button>
            <button type="button" className="icon-btn" aria-label="Próximo mês" onClick={() => irMes(shiftMonth(mes, 1))}>
              <ChevronRight />
            </button>
          </div>
        )}
      </div>

      {visao === 'ano' ? (
        <Card title={`Resumo de ${ano}`}>
          <AnoView
            db={db}
            ano={ano}
            onAno={setAno}
            onMes={(m) => {
              irMes(m);
              setVisao('mes');
            }}
          />
        </Card>
      ) : (
        <div className="split" style={{ alignItems: 'start' }}>
          <div className="section">
            <Card
              title="Resumo do mês"
              actions={
                mes !== monthKeyOf(hoje) ? (
                  <button type="button" className="btn sm ghost" onClick={() => irMes(monthKeyOf(hoje))}>
                    Hoje
                  </button>
                ) : undefined
              }
            >
              <Resumo r={resumo} />
            </Card>

            <div className="quick" role="toolbar" aria-label="Ações rápidas">
              <button type="button" onClick={() => setDia(mes === monthKeyOf(hoje) ? hoje : `${mes}-01`)}>
                <CalendarPlus /> Lançar turno
              </button>
              <button type="button" onClick={() => setSheet('gerador')}>
                <Wand2 /> Gerar escala
              </button>
              <button type="button" onClick={() => setSheet('periodo')}>
                <Palmtree /> Férias / afast.
              </button>
              <button
                type="button"
                aria-pressed={!!selecao}
                onClick={() => setSelecao(selecao ? null : new Set())}
              >
                <ListChecks /> Vários dias
              </button>
            </div>

            <section className="card" aria-label={`Calendário de ${monthLabel(mes)}`}>
              <Calendario
                mes={mes}
                porData={mapa}
                hoje={hoje}
                duplicados={dups}
                selecao={selecao}
                onDia={tocarDia}
                onSwipe={(d) => irMes(shiftMonth(mes, d))}
              />
            </section>

            {selecao && (
              <SelecaoBar datas={[...selecao].sort()} onLimpar={() => setSelecao(new Set())} onSair={() => setSelecao(null)} />
            )}
          </div>

          <div className="section split-aside">
            <Card
              title="Lançamentos"
              actions={
                podeDesfazer() ? (
                  <button
                    type="button"
                    className="btn sm ghost"
                    onClick={() => {
                      const r = desfazer();
                      if (r) toast({ title: 'Desfeito', desc: r });
                    }}
                  >
                    <Undo2 /> Desfazer
                  </button>
                ) : undefined
              }
            >
              <ListaMes entries={doMes} duplicados={dups} onDia={setDia} />
            </Card>
            <p className="base-calculo">
              Carga horária: {formatMinutes(db.config.metas['31'])} em meses de 31 dias, {formatMinutes(db.config.metas['30'])} em
              meses de 30 dias e {formatMinutes(db.config.metas['28'])}/{formatMinutes(db.config.metas['29'])} em fevereiro. Férias e
              afastamentos descontam a carga proporcionalmente; cada EDT/RSP desconta {formatMinutes(db.config.edtMinutos)}. O turno
              conta no mês em que começa. Dados salvos apenas neste aparelho — faça backups.
            </p>
          </div>
        </div>
      )}

      <DiaSheet data={dia} onClose={() => setDia(null)} onNavigate={(d) => {
        setDia(d);
        if (monthKeyOf(d) !== mes) irMes(monthKeyOf(d));
      }} />
      <GeradorSheet open={sheet === 'gerador'} onClose={() => setSheet(null)} mes={mes} inicioSugerido={inicioSugerido} />
      <PeriodoSheet open={sheet === 'periodo'} onClose={() => setSheet(null)} inicioSugerido={inicioSugerido} />
      <ConfigSheet open={sheet === 'config'} onClose={() => setSheet(null)} />
      <MesPicker open={sheet === 'mes'} onClose={() => setSheet(null)} mes={mes} entries={db.entries} onEscolher={irMes} />

      <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title="Escala" subtitle={monthLabel(mes)}>
        <div className="stack" style={gap(14)}>
          <div className="list">
            <button type="button" className="list-item" onClick={compartilharResumo}>
              <span className="ico"><MessageCircle /></span>
              <span className="txt"><strong>Enviar resumo do mês</strong><small>Texto com horas, meta e extras (WhatsApp)</small></span>
            </button>
            <button type="button" className="list-item" disabled={pdfCarregando} onClick={() => pdf('baixar')}>
              <span className="ico">{pdfCarregando ? <span className="spinner" /> : <FileDown />}</span>
              <span className="txt"><strong>Exportar PDF do mês</strong><small>Relatório com todos os lançamentos</small></span>
            </button>
            {canShareFiles([new File([''], 'x.pdf', { type: 'application/pdf' })]) && (
              <button type="button" className="list-item" disabled={pdfCarregando} onClick={() => pdf('compartilhar')}>
                <span className="ico"><Share2 /></span>
                <span className="txt"><strong>Compartilhar PDF</strong><small>Enviar o relatório direto pelo WhatsApp</small></span>
              </button>
            )}
          </div>
          <div className="list">
            <button type="button" className="list-item" onClick={() => { exportarBackup(db); track('escala_backup'); setSheet(null); }}>
              <span className="ico"><Download /></span>
              <span className="txt"><strong>Fazer backup</strong><small>Salva um arquivo .json com toda a escala</small></span>
            </button>
            <button type="button" className="list-item" onClick={importar}>
              <span className="ico"><FileUp /></span>
              <span className="txt"><strong>Importar backup</strong><small>Aceita também o arquivo “registros.json” da versão anterior</small></span>
            </button>
          </div>
          <div className="list">
            <button type="button" className="list-item" onClick={apagarMes}>
              <span className="ico"><Trash2 /></span>
              <span className="txt"><strong>Apagar {monthLabel(mes)}</strong><small>Remove os lançamentos deste mês</small></span>
            </button>
            <button type="button" className="list-item" onClick={apagarTudo}>
              <span className="ico" style={{ color: 'var(--danger)' }}><DatabaseBackup /></span>
              <span className="txt"><strong style={{ color: 'var(--danger)' }}>Apagar todos os registros</strong><small>Pede confirmação dupla</small></span>
            </button>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={!!importacao}
        onClose={() => setImportacao(null)}
        title="Importar backup"
        footer={
          <>
            <button type="button" className="btn" onClick={() => concluirImportacao('substituir')}>
              Substituir tudo
            </button>
            <button type="button" className="btn primary" onClick={() => concluirImportacao('mesclar')}>
              Mesclar
            </button>
          </>
        }
      >
        {importacao && (
          <div className="stack">
            <p>
              {importacao.tipo === 'v1'
                ? `Arquivo da versão anterior com ${importacao.total} registro(s)${importacao.ignorados ? ` (${importacao.ignorados} sem data válida)` : ''}.`
                : `Backup com ${importacao.db.entries.length} lançamento(s).`}
            </p>
            <p className="muted">
              <strong>Mesclar</strong> adiciona somente o que ainda não existe. <strong>Substituir tudo</strong> troca a escala
              atual pelo conteúdo do arquivo. As duas opções podem ser desfeitas logo em seguida.
            </p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
