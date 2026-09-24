import { DIAS_SEMANA_CURTOS, MESES, formatDateBR, formatMinutes, parseMonthKey, todayISO, weekdayOf } from '../../lib/date';
import { downloadBlob } from '../../lib/share';
import { emblemaPNG } from '../../components/Emblema';
import { calcularResumo, entriesDoMes } from './calc';
import { ROTULO_MARCACAO, type EscalaDB } from './model';

const MAIUSC = (s: string) => s.toLocaleUpperCase('pt-BR');

export function nomeMes(mes: string): string {
  const { year, month } = parseMonthKey(mes);
  return `${MESES[month - 1]}/${year}`;
}

/** Resumo em texto para enviar pelo WhatsApp. */
export function textoResumo(db: EscalaDB, mes: string): string {
  const r = calcularResumo(db.entries, mes, db.config);
  const linhas = [
    `📅 *ESCALA — ${MAIUSC(nomeMes(mes))}*`,
    `Trabalhadas: *${formatMinutes(r.trabalhado)}* em ${r.turnos} turno(s)`,
    `Meta do mês: ${formatMinutes(r.meta)}${r.meta !== r.metaBase ? ` (base ${formatMinutes(r.metaBase)})` : ''}`,
    r.saldo >= 0 ? `Extras: *${formatMinutes(r.extras)}*` : `Faltam: *${formatMinutes(r.faltam)}*`,
  ];
  const extras: string[] = [];
  if (r.diasFerias) extras.push(`Férias: ${r.diasFerias} dia(s)`);
  if (r.diasAfastamento) extras.push(`Afastamento: ${r.diasAfastamento} dia(s)`);
  if (r.diasEdt) extras.push(`EDT/RSP: ${r.diasEdt}`);
  if (extras.length) linhas.push(extras.join(' · '));
  linhas.push('_Gerado pelo 190 ALERTAS_');
  return linhas.join('\n');
}

export function exportarBackup(db: EscalaDB): void {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `190alertas-escala-backup-${todayISO()}.json`);
}

/** Texto seguro para as fontes padrão do PDF (sem o sinal de menos tipográfico). */
const pdfTxt = (s: string) => s.replace(/−/g, '-').replace(/[–—]/g, '-');

export async function gerarPdfMes(db: EscalaDB, mes: string): Promise<Blob> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const r = calcularResumo(db.entries, mes, db.config);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margem = 40;

  // Cabeçalho
  doc.setFillColor(11, 15, 20);
  doc.rect(0, 0, W, 78, 'F');
  doc.setFillColor(200, 25, 47);
  doc.rect(0, 78, W, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RELATÓRIO DE ESCALA', margem, 36);
  doc.setFontSize(11);
  doc.setTextColor(170, 180, 192);
  doc.setFont('helvetica', 'normal');
  doc.text(MAIUSC(nomeMes(mes)).replace('/', ' DE '), margem, 56);
  doc.setTextColor(231, 236, 242);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('190 ALERTAS', W - margem, 44, { align: 'right' });
  const emblema = emblemaPNG(128);
  if (emblema) doc.addImage(emblema, 'PNG', W - margem - doc.getTextWidth('190 ALERTAS') - 34, 22, 28, 28);
  doc.setFont('helvetica', 'normal');

  let y = 108;
  const p = db.config.perfil;
  const ident = [p.nome && `Nome: ${p.nome}`, p.matricula && `Matrícula: ${p.matricula}`, p.unidade && `Unidade: ${p.unidade}`].filter(Boolean);
  doc.setTextColor(30, 30, 35);
  if (ident.length) {
    doc.setFontSize(10);
    doc.text(ident.join('   ·   '), margem, y);
    y += 22;
  }

  // Quadro-resumo
  const caixas: [string, string][] = [
    ['TRABALHADAS', formatMinutes(r.trabalhado)],
    ['META DO MÊS', formatMinutes(r.meta)],
    [r.saldo >= 0 ? 'EXTRAS' : 'FALTAM', formatMinutes(r.saldo >= 0 ? r.extras : r.faltam)],
    ['TURNOS', String(r.turnos)],
  ];
  const cw = (W - margem * 2 - 18) / 4;
  caixas.forEach(([rot, val], i) => {
    const x = margem + i * (cw + 6);
    doc.setFillColor(242, 244, 247);
    doc.roundedRect(x, y, cw, 52, 4, 4, 'F');
    doc.setFontSize(8);
    doc.setTextColor(93, 105, 119);
    doc.setFont('helvetica', 'bold');
    doc.text(rot, x + 10, y + 17);
    doc.setFontSize(17);
    const cor: [number, number, number] = i !== 2 || r.saldo === 0 ? [18, 24, 32] : r.saldo > 0 ? [18, 131, 74] : [200, 25, 47];
    doc.setTextColor(...cor);
    doc.text(pdfTxt(val), x + 10, y + 40);
  });
  y += 70;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 100);
  const detalhes = [
    `Carga horária base: ${formatMinutes(r.metaBase)} (${r.dias} dias)`,
    r.diasFerias ? `Férias: ${r.diasFerias} dia(s)` : '',
    r.diasAfastamento ? `Afastamento: ${r.diasAfastamento} dia(s)` : '',
    r.diasEdt ? `EDT/RSP: ${r.diasEdt} (-${formatMinutes(r.descontoEdt)})` : '',
    r.extras > 0 ? `Horas normais: ${formatMinutes(r.normais)}` : '',
  ].filter(Boolean);
  doc.text(pdfTxt(detalhes.join('   ·   ')), margem, y);
  y += 14;

  // Tabela
  const corpo = entriesDoMes(db.entries, mes).map((e) => {
    const data = formatDateBR(e.date);
    const dia = DIAS_SEMANA_CURTOS[weekdayOf(e.date)];
    if (e.kind === 'turno') {
      return [data, dia, e.start, e.end, formatMinutes(e.minutes), e.note ?? ''];
    }
    return [data, dia, { content: MAIUSC(ROTULO_MARCACAO[e.kind].longo), colSpan: 3, styles: { fontStyle: 'bold' as const, textColor: [150, 90, 0] as [number, number, number] } }, e.note ?? ''];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margem, right: margem, bottom: 50 },
    head: [['Data', 'Dia', 'Início', 'Fim', 'Horas', 'Observação']],
    body: corpo.length ? corpo : [[{ content: 'Nenhum lançamento neste mês.', colSpan: 6, styles: { halign: 'center' } }]],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 5, lineColor: [221, 226, 232], lineWidth: 0.5, textColor: [18, 24, 32] },
    headStyles: { fillColor: [14, 19, 26], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 247, 249] },
    columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 38 }, 2: { cellWidth: 48 }, 3: { cellWidth: 48 }, 4: { cellWidth: 52, fontStyle: 'bold' } },
  });

  // Rodapé em todas as páginas
  const paginas = doc.getNumberOfPages();
  const H = doc.internal.pageSize.getHeight();
  const agora = new Date();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 140);
    const rodape = doc.splitTextToSize(
      pdfTxt(
        `Gerado pelo 190 ALERTAS em ${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. ` +
          `Carga: ${formatMinutes(db.config.metas['31'])} (31 dias), ${formatMinutes(db.config.metas['30'])} (30 dias); ` +
          `férias/afastamentos proporcionais; EDT/RSP -${formatMinutes(db.config.edtMinutos)}/dia.`,
      ),
      W - margem * 2 - 50,
    );
    doc.text(rodape, margem, H - 30);
    doc.text(`${i}/${paginas}`, W - margem, H - 30, { align: 'right' });
  }

  return doc.output('blob');
}
