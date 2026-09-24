import { describe, expect, it } from 'vitest';
import { calcularResumo, duplicados, proximoTurno, turnosFrequentes } from './calc';
import { interpretarBackup, mesclar, migrarV1, paraV1, parseHorasV1 } from './migrate';
import { configPadrao, dbVazio, type Entry, type Turno } from './model';
import { adicionarTurno, aplicarTurno, editarTurno, limparDias, marcar, removerMes } from './ops';
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

  it('usa 177h em meses de 31 dias e 170h em meses de 30 dias', () => {
    expect(calcularResumo([], '2026-10', cfg).meta).toBe(177 * 60);
    expect(calcularResumo([], '2026-09', cfg).meta).toBe(170 * 60);
    expect(calcularResumo([], '2026-02', cfg).meta).toBe(160 * 60);
    expect(calcularResumo([], '2028-02', cfg).meta).toBe(165 * 60);
  });

  it('calcula trabalhadas, normais, extras e saldo', () => {
    let db = dbVazio();
    for (let d = 1; d <= 15; d++) db = adicionarTurno(db, `2026-09-${String(d * 2 - 1).padStart(2, '0')}`, '07:00', '19:00');
    const r = calcularResumo(db.entries, '2026-09', cfg);
    expect(r.turnos).toBe(15);
    expect(r.trabalhado).toBe(180 * 60);
    expect(r.normais).toBe(170 * 60);
    expect(r.extras).toBe(10 * 60);
    expect(r.saldo).toBe(10 * 60);
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
  const opc = { inicio: '2026-10-01', fim: '2026-10-31', pularAusencias: true, substituir: false };
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
