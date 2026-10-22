import { describe, expect, it } from 'vitest';
import { calcularResumo, conflitos, duplicados, minutosComputados, proximoTurno, turnosFrequentes } from './calc';
import { interpretarBackup, mesclar, migrarV1, normalizarV2, paraV1, parseHorasV1 } from './migrate';
import {
  GSE_LIMITE,
  PADRAO_REV,
  ROTULO_INDISP,
  ROTULO_SERVICO,
  configPadrao,
  dbVazio,
  indisponibilidadeDe,
  marcacaoDe,
  servicoDe,
  type Entry,
  type Turno,
} from './model';
import {
  adicionarTurno,
  aplicarTurno,
  editarTurno,
  impactoLancamento,
  limparDias,
  marcar,
  marcarIndisponibilidade,
  removerMes,
} from './ops';
import { PRESETS, aplicarGerador, preverGerador } from './gerador';
import { K_BACKUP_V1, K_ESPELHO, K_V1, K_V2, assinatura, carregar, salvar, type KV } from './store';

/** Dados exatamente como a versão 4 gravava em localStorage["registros"]. */
const LEGADO = {
  '2025-08': [
    { data: '2025-08-01', inicio: '07:00', fim: '19:00', horasTrabalhadas: '12h0m' },
    { data: '2025-08-02', inicio: '19:00', fim: '07:00', horasTrabalhadas: '12h0m' },
    { data: '2025-08-05', inicio: '08:00', fim: '08:00', horasTrabalhadas: '0h0m' },
    { data: '2025-08-10', inicio: '-', fim: '-', horasTrabalhadas: 'FER', tipo: 'FER' },
    { data: '2025-08-11', inicio: '-', fim: '-', horasTrabalhadas: 'FER', tipo: 'FER' },
    { data: '2025-08-12', inicio: '-', fim: '-', horasTrabalhadas: 'EDT/RSP', tipo: 'EDT/RSP' },
    { data: '2025-08-20', inicio: '13:30', fim: '01:15', horasTrabalhadas: '11h45m' },
  ],
  '2025-09': [{ data: '2025-09-03', inicio: '07:00', fim: '19:00', horasTrabalhadas: '12h0m' }],
};

function memKV(inicial: Record<string, string> = {}): KV & { dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial));
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
    removeItem: (k) => void dados.delete(k),
  };
}

const turnos = (entries: Entry[]) => entries.filter((e): e is Turno => e.kind === 'turno');

describe('migração da versão 4', () => {
  it('converte todos os registros preservando as horas gravadas', () => {
    const r = migrarV1(LEGADO);
    expect(r.total).toBe(8);
    expect(r.ignorados).toBe(0);
    const t = turnos(r.entries);
    expect(t).toHaveLength(5);
    expect(t.map((x) => [x.date, x.start, x.end, x.minutes])).toEqual([
      ['2025-08-01', '07:00', '19:00', 720],
      ['2025-08-02', '19:00', '07:00', 720],
      ['2025-08-05', '08:00', '08:00', 0], // a v4 registrava 0h para início = fim; mantido
      ['2025-08-20', '13:30', '01:15', 705],
      ['2025-09-03', '07:00', '19:00', 720],
    ]);
    expect(r.entries.filter((e) => e.kind === 'ferias').map((e) => e.date)).toEqual(['2025-08-10', '2025-08-11']);
    expect(r.entries.filter((e) => e.kind === 'edt').map((e) => e.date)).toEqual(['2025-08-12']);
  });

  it('ignora lixo sem quebrar e recalcula horas ilegíveis como a v4', () => {
    const r = migrarV1({
      '2025-01': [
        { data: 'xx', inicio: '07:00', fim: '19:00', horasTrabalhadas: '12h0m' },
        null,
        { data: '2025-01-02', inicio: '22:00', fim: '06:30', horasTrabalhadas: '???' },
      ],
    });
    expect(r.total).toBe(3);
    expect(r.ignorados).toBe(2);
    expect(turnos(r.entries)[0].minutes).toBe(510);
  });

  it('lê horas no formato da v4', () => {
    expect(parseHorasV1('12h0m')).toBe(720);
    expect(parseHorasV1('7h45m')).toBe(465);
    expect(parseHorasV1('FER')).toBeNull();
  });

  it('volta ao formato v4 (espelho) sem perder informação', () => {
    const { entries } = migrarV1(LEGADO);
    const v1 = paraV1(entries);
    expect(v1['2025-08']).toContainEqual({ data: '2025-08-20', inicio: '13:30', fim: '01:15', horasTrabalhadas: '11h45m' });
    expect(v1['2025-08']).toContainEqual({ data: '2025-08-12', inicio: '-', fim: '-', horasTrabalhadas: 'EDT/RSP', tipo: 'EDT/RSP' });
    const ida = migrarV1(v1);
    expect(turnos(ida.entries).map((t) => t.minutes)).toEqual(turnos(entries).map((t) => t.minutes));
  });
});

describe('resumo mensal', () => {
  const cfg = configPadrao();

  it('usa 177h em meses de 31 dias e 171h em meses de 30 dias', () => {
    expect(calcularResumo([], '2026-10', cfg).meta).toBe(177 * 60);
    expect(calcularResumo([], '2026-09', cfg).meta).toBe(171 * 60);
    expect(calcularResumo([], '2026-02', cfg).meta).toBe(160 * 60);
    expect(calcularResumo([], '2028-02', cfg).meta).toBe(165 * 60);
  });

  it('calcula trabalhadas, normais, extras e saldo', () => {
    let db = dbVazio();
    for (let d = 1; d <= 15; d++) db = adicionarTurno(db, `2026-09-${String(d * 2 - 1).padStart(2, '0')}`, '07:00', '19:00');
    const r = calcularResumo(db.entries, '2026-09', cfg);
    expect(r.turnos).toBe(15);
    expect(r.trabalhado).toBe(180 * 60);
    expect(r.normais).toBe(171 * 60);
    expect(r.extras).toBe(9 * 60);
    expect(r.saldo).toBe(9 * 60);
    expect(r.faltam).toBe(0);
  });

  it('desconta férias proporcionalmente e 6h por EDT/RSP', () => {
    const { entries } = migrarV1(LEGADO);
    const r = calcularResumo(entries, '2025-08', cfg);
    expect(r.diasFerias).toBe(2);
    expect(r.diasEdt).toBe(1);
    expect(r.descontoAusencias).toBe(Math.round((177 * 60 * 2) / 31));
    expect(r.descontoEdt).toBe(360);
    expect(r.meta).toBe(177 * 60 - Math.round((177 * 60 * 2) / 31) - 360);
    expect(r.trabalhado).toBe(720 + 720 + 0 + 705);
  });

  it('respeita metas configuradas pelo usuário', () => {
    const c = { ...cfg, metas: { ...cfg.metas, '28': 150 * 60 } };
    expect(calcularResumo([], '2026-02', c).meta).toBe(150 * 60);
  });
});

describe('padrão de carga horária (mês de 30 dias: 171h)', () => {
  /** Escala gravada antes da revisão 2: sem "padraoRev" e com os 170h que eram o padrão. */
  const antigo = (meta30: number, extra: Record<string, unknown> = {}) => ({
    version: 2,
    entries: [],
    config: { metas: { '28': 9600, '29': 9900, '30': meta30, '31': 10620 }, edtMinutos: 360, ...extra },
  });

  it('o padrão de fábrica é 171h e já nasce carimbado', () => {
    const c = configPadrao();
    expect(c.metas['30']).toBe(171 * 60);
    expect(c.padraoRev).toBe(PADRAO_REV);
  });

  it('quem nunca mexeu (170h gravado) passa para 171h, uma única vez', () => {
    const db = normalizarV2(antigo(170 * 60))!;
    expect(db.config.metas['30']).toBe(171 * 60);
    expect(db.config.padraoRev).toBe(PADRAO_REV);
    // idempotente: reler o que acabou de sair não muda nada
    expect(normalizarV2(JSON.parse(JSON.stringify(db)))!.config).toEqual(db.config);
  });

  it('valor personalizado é mantido (só recebe o carimbo)', () => {
    const db = normalizarV2(antigo(168 * 60))!;
    expect(db.config.metas['30']).toBe(168 * 60);
    expect(db.config.padraoRev).toBe(PADRAO_REV);
  });

  it('170h digitado de propósito depois da revisão não é trocado', () => {
    const db = normalizarV2(antigo(170 * 60, { padraoRev: PADRAO_REV }))!;
    expect(db.config.metas['30']).toBe(170 * 60);
  });

  it('não herda o carimbo dos valores de fábrica quando a configuração vem sem ele', () => {
    expect(normalizarV2({ version: 2, entries: [] })!.config.metas['30']).toBe(171 * 60);
    expect(normalizarV2(antigo(170 * 60, { padraoRev: 'lixo' }))!.config.metas['30']).toBe(171 * 60);
  });

  it('abrir o app com a escala antiga mostra 171h e o resumo do mês usa 171h', () => {
    const kv = memKV({ [K_V2]: JSON.stringify(antigo(170 * 60)) });
    const { db } = carregar(kv);
    expect(calcularResumo([], '2026-09', db.config).meta).toBe(171 * 60);
  });

  it('configurações de nuvem e da base antigas convergem para o mesmo valor (sem "alteração" a mesclar)', () => {
    const a = normalizarV2(antigo(170 * 60))!.config;
    const b = normalizarV2(antigo(170 * 60))!.config;
    expect(a).toEqual(b);
    expect(a.metas['30']).toBe(171 * 60);
  });
});

describe('operações', () => {
  it('turno noturno e de 24h', () => {
    let db = adicionarTurno(dbVazio(), '2026-09-01', '19:00', '07:00');
    db = adicionarTurno(db, '2026-09-02', '08:00', '08:00');
    expect(turnos(db.entries).map((t) => t.minutes)).toEqual([720, 1440]);
  });

  it('editar mantém duração migrada se o horário não mudar', () => {
    const { entries } = migrarV1(LEGADO);
    const zero = turnos(entries).find((t) => t.minutes === 0)!;
    let db = { ...dbVazio(), entries };
    db = editarTurno(db, zero.id, { note: 'plantão' });
    expect(turnos(db.entries).find((t) => t.id === zero.id)!.minutes).toBe(0);
    db = editarTurno(db, zero.id, { end: '20:00' });
    expect(turnos(db.entries).find((t) => t.id === zero.id)!.minutes).toBe(720);
  });

  it('marcações não duplicam e férias substituem EDT', () => {
    let db = marcar(dbVazio(), ['2026-09-10', '2026-09-11'], 'edt');
    db = marcar(db, ['2026-09-10'], 'edt');
    expect(db.entries).toHaveLength(2);
    db = marcar(db, ['2026-09-10'], 'ferias');
    expect(db.entries.map((e) => `${e.date}:${e.kind}`)).toEqual(['2026-09-10:ferias', '2026-09-11:edt']);
  });

  it('editar troca o tipo de serviço (e volta a ordinário)', () => {
    let db = adicionarTurno(dbVazio(), '2026-09-10', '07:00', '19:00');
    const id = db.entries[0].id;
    db = editarTurno(db, id, { servico: 'gse' });
    expect(turnos(db.entries)[0].servico).toBe('gse');
    db = editarTurno(db, id, { note: 'x' });
    expect(turnos(db.entries)[0].servico).toBe('gse');
    db = editarTurno(db, id, { servico: 'ordinario' });
    expect('servico' in turnos(db.entries)[0]).toBe(false);
  });

  it('lançar turno remove a indisponibilidade do dia (e só dele)', () => {
    let db = marcar(dbVazio(), ['2026-09-10', '2026-09-11'], 'edt');
    db = adicionarTurno(db, '2026-09-10', '07:00', '19:00');
    expect(db.entries.map((e) => `${e.date}:${e.kind}`)).toEqual(['2026-09-10:turno', '2026-09-11:edt']);
    db = aplicarTurno(db, ['2026-09-11'], '19:00', '07:00', false, { servico: 'gse', note: 'Reforço' });
    expect(db.entries.map((e) => `${e.date}:${e.kind}`)).toEqual(['2026-09-10:turno', '2026-09-11:turno']);
    expect(turnos(db.entries)[1]).toMatchObject({ servico: 'gse', note: 'Reforço' });
  });

  it('lançar indisponibilidade remove os turnos do dia', () => {
    let db = aplicarTurno(dbVazio(), ['2026-09-10', '2026-09-11'], '07:00', '19:00', false);
    db = marcarIndisponibilidade(db, ['2026-09-10'], 'convalescenca', 'Atestado');
    expect(db.entries.map((e) => `${e.date}:${e.kind}`)).toEqual(['2026-09-10:afastamento', '2026-09-11:turno']);
    expect(db.entries[0]).toMatchObject({ motivo: 'convalescenca', note: 'Atestado' });
  });

  it('trocar férias por EDT mantém uma marcação só', () => {
    let db = marcarIndisponibilidade(dbVazio(), ['2026-09-10'], 'ferias');
    db = marcarIndisponibilidade(db, ['2026-09-10'], 'edt');
    expect(db.entries.map((e) => e.kind)).toEqual(['edt']);
    db = marcarIndisponibilidade(db, ['2026-09-10'], 'convalescenca');
    db = marcarIndisponibilidade(db, ['2026-09-10'], 'afastamento');
    expect(db.entries).toHaveLength(1);
    expect(db.entries[0]).toMatchObject({ kind: 'afastamento' });
    expect('motivo' in db.entries[0]).toBe(false);
  });

  it('mesma indisponibilidade de novo não troca o id', () => {
    const db = marcarIndisponibilidade(dbVazio(), ['2026-09-10'], 'convalescenca');
    const id = db.entries[0].id;
    expect(marcarIndisponibilidade(db, ['2026-09-10'], 'convalescenca').entries[0].id).toBe(id);
  });

  it('impactoLancamento conta o que será removido', () => {
    let db = aplicarTurno(dbVazio(), ['2026-09-10'], '07:00', '19:00', false);
    db = adicionarTurno(db, '2026-09-10', '19:00', '23:00');
    db = marcar(db, ['2026-09-11'], 'edt');
    const datas = ['2026-09-10', '2026-09-11', '2026-09-12'];
    expect(impactoLancamento(db.entries, datas, 'escala')).toEqual({ turnos: 0, marcacoes: 1 });
    expect(impactoLancamento(db.entries, datas, 'indisponibilidade')).toEqual({ turnos: 2, marcacoes: 0 });
    expect(impactoLancamento(db.entries, ['2026-09-11'], 'indisponibilidade')).toEqual({ turnos: 0, marcacoes: 0 });
  });

  it('aplica turno em lote, limpa dias e remove mês', () => {
    let db = aplicarTurno(dbVazio(), ['2026-09-01', '2026-09-03'], '07:00', '19:00', false);
    db = aplicarTurno(db, ['2026-09-03'], '19:00', '07:00', true);
    expect(turnos(db.entries).map((t) => `${t.date} ${t.start}`)).toEqual(['2026-09-01 07:00', '2026-09-03 19:00']);
    db = limparDias(db, ['2026-09-01']);
    expect(db.entries).toHaveLength(1);
    db = adicionarTurno(db, '2026-10-01', '07:00', '19:00');
    db = removerMes(db, '2026-09');
    expect(db.entries.map((e) => e.date)).toEqual(['2026-10-01']);
  });

  it('detecta duplicados e horários frequentes', () => {
    let db = adicionarTurno(dbVazio(), '2026-09-01', '07:00', '19:00');
    db = adicionarTurno(db, '2026-09-01', '07:00', '19:00');
    db = adicionarTurno(db, '2026-09-02', '19:00', '07:00');
    expect(duplicados(db.entries).size).toBe(1);
    expect(turnosFrequentes(db.entries)[0]).toMatchObject({ start: '07:00', end: '19:00', vezes: 2 });
  });
});

describe('gerador de escala', () => {
  const opc = { inicio: '2026-10-01', fim: '2026-10-31', substituir: false };
  const preset = (id: string) => PRESETS.find((p) => p.id === id)!.padrao;

  it('12x36 em outubro/2026: 16 turnos, 192h', () => {
    const p = preverGerador([], preset('12x36'), opc);
    expect(p.novos).toHaveLength(16);
    expect(p.minutos).toBe(192 * 60);
    expect(p.novos[1].date).toBe('2026-10-03');
  });

  it('12x24 / 12x48 alterna dia e noite', () => {
    const p = preverGerador([], preset('12x24-12x48'), opc);
    expect(p.novos.slice(0, 3).map((t) => `${t.date} ${t.start}`)).toEqual([
      '2026-10-01 07:00',
      '2026-10-02 19:00',
      '2026-10-05 07:00',
    ]);
  });

  it('dias da semana (seg a sex) em outubro/2026: 22 dias', () => {
    expect(preverGerador([], preset('semana'), opc).novos).toHaveLength(22);
  });

  it('6x18 em outubro/2026: 31 turnos, 186h', () => {
    const p = preverGerador([], preset('6x18'), opc);
    expect(p.novos).toHaveLength(31);
    expect(p.minutos).toBe(186 * 60);
    expect(p.novos[0]).toMatchObject({ start: '06:00', end: '12:00' });
  });

  it('pula qualquer indisponibilidade, inclusive EDT/RSP', () => {
    const db = marcar(dbVazio(), ['2026-10-01', '2026-10-03'], 'edt');
    const p = preverGerador(db.entries, preset('12x36'), opc);
    expect(p.novos).toHaveLength(14);
    expect(p.pulados).toBe(2);
  });

  it('pula férias e dias já lançados; substitui quando pedido', () => {
    let db = marcar(dbVazio(), ['2026-10-03'], 'ferias');
    db = adicionarTurno(db, '2026-10-05', '08:00', '12:00');
    const p = preverGerador(db.entries, preset('12x36'), opc);
    expect(p.novos).toHaveLength(14);
    expect(p.pulados).toBe(2);
    const s = preverGerador(db.entries, preset('12x36'), { ...opc, substituir: true });
    expect(s.novos).toHaveLength(15);
    expect(s.removidos).toHaveLength(1);
    const aplicado = aplicarGerador(db, s);
    expect(turnos(aplicado.entries).find((t) => t.date === '2026-10-05')!.start).toBe('07:00');
  });
});

describe('armazenamento e migração automática', () => {
  it('primeiro acesso sem dados', () => {
    const kv = memKV();
    const r = carregar(kv);
    expect(r.db.entries).toEqual([]);
    expect(r.aviso).toBeUndefined();
  });

  it('migra "registros" uma única vez, com backup intocado', () => {
    const bruto = JSON.stringify(LEGADO);
    const kv = memKV({ [K_V1]: bruto, mesAtualSelecionado: '2025-08' });
    const r1 = carregar(kv);
    expect(r1.aviso).toEqual({ tipo: 'migrado', turnos: 5, marcacoes: 3, ignorados: 0 });
    expect(kv.dados.get(K_BACKUP_V1)).toBe(bruto);
    expect(kv.dados.get(K_V1)).toBe(bruto); // os dados antigos não são alterados na migração
    expect(kv.dados.get(K_V2)).toBeTruthy();

    const r2 = carregar(kv);
    expect(r2.aviso).toBeUndefined();
    expect(r2.db.entries.map((e) => e.id)).toEqual(r1.db.entries.map((e) => e.id));
  });

  it('ao salvar, espelha no formato antigo e não gera sincronização falsa', () => {
    const kv = memKV({ [K_V1]: JSON.stringify(LEGADO) });
    const { db } = carregar(kv);
    const novo = adicionarTurno(db, '2025-09-05', '07:00', '19:00');
    salvar(kv, novo);
    expect(kv.dados.get(K_ESPELHO)).toBe(assinatura(kv.dados.get(K_V1)!));
    expect(JSON.parse(kv.dados.get(K_V1)!)['2025-09']).toHaveLength(2);
    const r = carregar(kv);
    expect(r.aviso).toBeUndefined();
    expect(turnos(r.db.entries)).toHaveLength(6);
    // backup continua sendo o original
    expect(JSON.parse(kv.dados.get(K_BACKUP_V1)!)['2025-09']).toHaveLength(1);
  });

  it('incorpora lançamentos feitos na versão antiga depois da migração', () => {
    const kv = memKV({ [K_V1]: JSON.stringify(LEGADO) });
    carregar(kv);
    const antigo = JSON.parse(kv.dados.get(K_V1)!);
    antigo['2025-09'].push({ data: '2025-09-07', inicio: '07:00', fim: '19:00', horasTrabalhadas: '12h0m' });
    kv.dados.set(K_V1, JSON.stringify(antigo));
    const r = carregar(kv);
    expect(r.aviso).toEqual({ tipo: 'sincronizado', adicionadas: 1 });
    expect(turnos(r.db.entries).some((t) => t.date === '2025-09-07')).toBe(true);
    expect(carregar(kv).aviso).toBeUndefined();
  });

  it('recupera a partir dos dados antigos se o novo estiver ilegível', () => {
    const kv = memKV({ [K_V1]: JSON.stringify(LEGADO), [K_V2]: '{quebrado' });
    const r = carregar(kv);
    expect(r.aviso).toEqual({ tipo: 'recuperado' });
    expect(turnos(r.db.entries)).toHaveLength(5);
    expect([...kv.dados.keys()].some((k) => k.startsWith(`${K_V2}:ilegivel:`))).toBe(true);
  });
});

describe('backup (importar/exportar)', () => {
  it('reconhece arquivo da versão 4 (registros.json)', () => {
    const r = interpretarBackup(JSON.stringify(LEGADO));
    expect(r.formato).toBe('v1');
    if (r.formato === 'v1') expect(r.resultado.entries).toHaveLength(8);
  });

  it('reconhece backup da versão nova e rejeita arquivo inválido', () => {
    const db = adicionarTurno(dbVazio(), '2026-09-01', '07:00', '19:00');
    const r = interpretarBackup(JSON.stringify(db));
    expect(r.formato).toBe('v2');
    expect(interpretarBackup('{"a":1}').formato).toBe('invalido');
    expect(interpretarBackup('nada').formato).toBe('invalido');
  });

  it('mesclar não duplica lançamentos', () => {
    const { entries } = migrarV1(LEGADO);
    const { entries: juntas, adicionadas } = mesclar(entries, migrarV1(LEGADO).entries);
    expect(adicionadas).toBe(0);
    expect(juntas).toHaveLength(entries.length);
  });
});

describe('próximo serviço (painel inicial)', () => {
  const t = (id: string, date: string, start: string, end: string): Turno => ({ id, kind: 'turno', date, start, end, minutes: 0 });
  const lista: Entry[] = [
    t('a', '2026-09-23', '19:00', '07:00'),
    t('b', '2026-09-25', '07:00', '19:00'),
    t('c', '2026-09-27', '07:00', '07:00'),
    { id: 'f', kind: 'ferias', date: '2026-09-24' },
  ];
  it('reconhece o turno noturno ainda em andamento na manhã seguinte', () => {
    expect(proximoTurno(lista, '2026-09-24T06:30')).toEqual({ turno: lista[0], emAndamento: true });
  });
  it('aponta o próximo turno depois que o atual termina', () => {
    expect(proximoTurno(lista, '2026-09-24T07:00')?.turno.id).toBe('b');
    expect(proximoTurno(lista, '2026-09-25T19:30')?.turno.id).toBe('c');
  });
  it('turno de 24h termina no dia seguinte; sem turnos futuros não há próximo', () => {
    expect(proximoTurno(lista, '2026-09-28T06:59')).toEqual({ turno: lista[2], emAndamento: true });
    expect(proximoTurno(lista, '2026-09-28T07:00')).toBeNull();
  });
});

describe('NI ADM 033.2: tipos de serviço e convalescença', () => {
  const cfg = configPadrao();
  const t = (id: string, date: string, start: string, end: string, minutes: number, extra: Partial<Turno> = {}): Turno => ({
    id,
    kind: 'turno',
    date,
    start,
    end,
    minutes,
    ...extra,
  });
  const cnv = (id: string, date: string): Entry => ({ id, kind: 'afastamento', date, motivo: 'convalescenca' });

  it('GSE soma à parte e não entra na carga ordinária', () => {
    const r = calcularResumo(
      [t('a', '2026-10-01', '07:00', '19:00', 720), t('b', '2026-10-03', '07:00', '19:00', 720, { servico: 'gse' })],
      '2026-10',
      cfg,
    );
    expect(r.trabalhado).toBe(720);
    expect(r.gse).toBe(720);
    expect(r.turnosGse).toBe(1);
    expect(r.turnos).toBe(2);
    expect(r.gseExcedido).toBe(false);
  });

  it('sobreaviso conta 1/3', () => {
    const r = calcularResumo([t('a', '2026-10-01', '07:00', '07:00', 1440, { servico: 'sobreaviso' })], '2026-10', cfg);
    expect(r.trabalhado).toBe(480);
    expect(r.sobreaviso).toBe(1440);
    expect(r.sobreavisoComputado).toBe(480);
    expect(minutosComputados(t('x', '2026-10-01', '07:00', '08:00', 100, { servico: 'sobreaviso' }))).toBe(33);
  });

  it('GSE acima de 40h acende o alerta', () => {
    const gse = [1, 2, 3, 4].map((d) => t(`g${d}`, `2026-10-0${d}`, '07:00', '19:00', 720, { servico: 'gse' }));
    const r = calcularResumo(gse, '2026-10', cfg);
    expect(r.gse).toBe(48 * 60);
    expect(GSE_LIMITE).toBe(40 * 60);
    expect(r.gseExcedido).toBe(true);
  });

  it('convalescença é afastamento e desconta igual', () => {
    const com = calcularResumo(
      [cnv('c1', '2026-10-10'), cnv('c2', '2026-10-11'), t('g', '2026-10-20', '07:00', '19:00', 720, { servico: 'gse' })],
      '2026-10',
      cfg,
    );
    const comum = calcularResumo(
      [
        { id: 'a1', kind: 'afastamento', date: '2026-10-10' },
        { id: 'a2', kind: 'afastamento', date: '2026-10-11' },
      ],
      '2026-10',
      cfg,
    );
    expect(com.diasAfastamento).toBe(2);
    expect(com.diasConvalescenca).toBe(2);
    expect(com.descontoAusencias).toBe(comum.descontoAusencias);
    expect(com.alertaConvalescencaGse).toBe(true);
    expect(comum.alertaConvalescencaGse).toBe(false);
  });

  it('um dia só de convalescença não dispara o aviso de GSE', () => {
    const r = calcularResumo([cnv('c1', '2026-10-10'), t('g', '2026-10-20', '07:00', '19:00', 720, { servico: 'gse' })], '2026-10', cfg);
    expect(r.alertaConvalescencaGse).toBe(false);
  });

  it('lançamentos antigos calculam igual à 5.1.2', () => {
    const { entries } = migrarV1(LEGADO);
    const r = calcularResumo(entries, '2025-08', cfg);
    expect(r.trabalhado).toBe(720 + 720 + 0 + 705);
    expect(r.gse).toBe(0);
    expect(r.sobreaviso).toBe(0);
    expect(r.meta).toBe(177 * 60 - Math.round((177 * 60 * 2) / 31) - 360);
  });

  it('campos novos e desconhecidos sobrevivem ao normalizarV2', () => {
    const db = dbVazio();
    db.entries = [
      t('a', '2026-10-01', '07:00', '19:00', 720, { servico: 'gse' }),
      t('b', '2026-10-02', '07:00', '19:00', 720, { servico: 'futuro' as never }),
      cnv('c', '2026-10-03'),
    ];
    const lido = normalizarV2(JSON.parse(JSON.stringify(db)))!;
    expect(lido.entries.map((e) => (e.kind === 'turno' ? e.servico : e.motivo))).toEqual(['gse', 'futuro', 'convalescenca']);
    expect(servicoDe(lido.entries[1] as Turno)).toBe('ordinario');
    expect(calcularResumo(lido.entries, '2026-10', cfg).trabalhado).toBe(720);
  });

  it('a validação da 5.1.2 aceita os lançamentos novos (nada se perde num aparelho antigo)', () => {
    // Cópia literal da entradaValida da versão 5.1.2 (src/features/escala/migrate.ts).
    const entradaValida512 = (e: unknown): boolean => {
      if (!e || typeof e !== 'object') return false;
      const x = e as Record<string, unknown>;
      if (typeof x.id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(String(x.date))) return false;
      if (x.kind === 'turno')
        return /^\d{2}:\d{2}$/.test(String(x.start)) && /^\d{2}:\d{2}$/.test(String(x.end)) && typeof x.minutes === 'number' && x.minutes >= 0;
      return x.kind === 'ferias' || x.kind === 'afastamento' || x.kind === 'edt';
    };
    const novos: Entry[] = [
      t('a', '2026-10-01', '07:00', '19:00', 720, { servico: 'gse' }),
      t('b', '2026-10-02', '07:00', '07:00', 1440, { servico: 'sobreaviso' }),
      cnv('c', '2026-10-03'),
      { id: 'd', kind: marcacaoDe('convalescenca').kind, date: '2026-10-04', motivo: marcacaoDe('convalescenca').motivo },
    ];
    expect(novos.every(entradaValida512)).toBe(true);
  });

  it('rótulos e conversões de indisponibilidade', () => {
    expect(indisponibilidadeDe(cnv('c', '2026-10-03') as never)).toBe('convalescenca');
    expect(indisponibilidadeDe({ id: 'e', kind: 'edt', date: '2026-10-03' })).toBe('edt');
    expect(marcacaoDe('ferias')).toEqual({ kind: 'ferias' });
    expect(ROTULO_INDISP.convalescenca.curto).toBe('CNV');
    expect(ROTULO_SERVICO.gse.curto).toBe('GSE');
    expect(ROTULO_SERVICO.sobreaviso.curto).toBe('SBV');
  });

  it('conflitos lista dias com turno e indisponibilidade', () => {
    const e: Entry[] = [
      t('a', '2026-10-01', '07:00', '19:00', 720),
      { id: 'b', kind: 'edt', date: '2026-10-01' },
      { id: 'c', kind: 'ferias', date: '2026-10-02' },
      t('d', '2026-10-03', '07:00', '19:00', 720),
    ];
    expect([...conflitos(e)]).toEqual(['2026-10-01']);
  });

  it('dados antigos com turno e EDT no mesmo dia ficam intactos', () => {
    const db = dbVazio();
    db.entries = [t('a', '2026-10-01', '07:00', '19:00', 720), { id: 'b', kind: 'edt', date: '2026-10-01' }];
    expect(normalizarV2(JSON.parse(JSON.stringify(db)))!.entries.map((x) => x.id).sort()).toEqual(['a', 'b']);
  });

  it('importar backup não junta turno ordinário com o mesmo horário em GSE', () => {
    const base = [t('a', '2026-10-01', '07:00', '19:00', 720)];
    expect(mesclar(base, [t('x', '2026-10-01', '07:00', '19:00', 720)]).adicionadas).toBe(0);
    expect(mesclar(base, [t('y', '2026-10-01', '07:00', '19:00', 720, { servico: 'gse' })]).adicionadas).toBe(1);
  });
});
