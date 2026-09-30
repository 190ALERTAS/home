import { describe, expect, it } from 'vitest';
import { configPadrao, MODELOS_PADRAO, type Entry, type Turno } from '../model';
import { canonico, iguaisInst, mesclar3, type Instantaneo } from './merge';
import {
  formatarHa,
  formatarQuando,
  formatarRestante,
  INTERVALO_MS,
  janela,
  notaSessao,
  situacao,
  type SyncEstado,
} from './estado';

const turno = (id: string, date: string, start = '07:00', end = '19:00', extra: Partial<Turno> = {}): Turno => ({
  id,
  kind: 'turno',
  date,
  start,
  end,
  minutes: 720,
  ...extra,
});
const ferias = (id: string, date: string): Entry => ({ id, kind: 'ferias', date });

const inst = (entries: Entry[], extra: Partial<Instantaneo> = {}): Instantaneo => ({
  entries,
  modelos: MODELOS_PADRAO.map((m) => ({ ...m })),
  config: configPadrao(),
  ...extra,
});
const ids = (i: Instantaneo) => i.entries.map((e) => e.id).sort();

/** Aparelho + nuvem em memória, sincronizando como o motor faz (sem edição concorrente). */
interface Aparelho {
  db: Instantaneo;
  base: Instantaneo | null;
}
const aparelho = (db: Instantaneo): Aparelho => ({ db, base: null });
function sincronizar(a: Aparelho, nuvem: { v: Instantaneo | null }) {
  const m = nuvem.v ? mesclar3(a.base, a.db, nuvem.v) : a.db;
  nuvem.v = m;
  a.db = m;
  a.base = m;
}

describe('mesclagem entre aparelhos', () => {
  it('primeira sincronização com a nuvem vazia envia tudo', () => {
    const nuvem = { v: null as Instantaneo | null };
    const a = aparelho(inst([turno('a1', '2026-09-01'), ferias('a2', '2026-09-10')]));
    sincronizar(a, nuvem);
    expect(ids(nuvem.v!)).toEqual(['a1', 'a2']);
  });

  it('sem base, junta os dois lados sem apagar nada', () => {
    const nuvem = { v: inst([turno('n1', '2026-09-02')]) as Instantaneo | null };
    const a = aparelho(inst([turno('a1', '2026-09-01')]));
    sincronizar(a, nuvem);
    expect(ids(a.db)).toEqual(['a1', 'n1']);
    expect(ids(nuvem.v!)).toEqual(['a1', 'n1']);
  });

  it('não duplica o mesmo lançamento criado em dois aparelhos (ids diferentes)', () => {
    const nuvem = { v: null as Instantaneo | null };
    const a = aparelho(inst([turno('a1', '2026-09-01')]));
    const b = aparelho(inst([turno('b1', '2026-09-01')]));
    sincronizar(a, nuvem);
    sincronizar(b, nuvem);
    sincronizar(a, nuvem);
    expect(a.db.entries).toHaveLength(1);
    expect(b.db.entries).toHaveLength(1);
    expect(ids(a.db)).toEqual(ids(b.db));
  });

  it('mantém lançamentos repetidos de propósito quando os dois lados já tinham a mesma quantidade', () => {
    const nuvem = { v: inst([turno('n1', '2026-09-01'), turno('n2', '2026-09-01')]) as Instantaneo | null };
    const a = aparelho(inst([turno('a1', '2026-09-01'), turno('a2', '2026-09-01')]));
    sincronizar(a, nuvem);
    expect(a.db.entries).toHaveLength(2);
  });

  it('propaga exclusões nos dois sentidos', () => {
    const nuvem = { v: null as Instantaneo | null };
    const a = aparelho(inst([turno('x', '2026-09-01'), turno('y', '2026-09-02')]));
    const b = aparelho(inst([]));
    sincronizar(a, nuvem);
    sincronizar(b, nuvem);
    expect(ids(b.db)).toEqual(['x', 'y']);

    a.db = inst(a.db.entries.filter((e) => e.id !== 'x'));
    sincronizar(a, nuvem);
    sincronizar(b, nuvem);
    expect(ids(b.db)).toEqual(['y']);

    b.db = inst([]);
    sincronizar(b, nuvem);
    sincronizar(a, nuvem);
    expect(a.db.entries).toHaveLength(0);
  });

  it('propaga edições; em conflito vence a versão do aparelho que sincroniza', () => {
    const nuvem = { v: null as Instantaneo | null };
    const a = aparelho(inst([turno('t', '2026-09-01')]));
    const b = aparelho(inst([]));
    sincronizar(a, nuvem);
    sincronizar(b, nuvem);

    a.db = inst([turno('t', '2026-09-01', '08:00', '20:00')]);
    sincronizar(a, nuvem);
    sincronizar(b, nuvem);
    expect((b.db.entries[0] as Turno).start).toBe('08:00');

    // edição concorrente: A muda para 09:00 e sincroniza; B mudou para 10:00 e sincroniza depois
    a.db = inst([turno('t', '2026-09-01', '09:00', '21:00')]);
    b.db = inst([turno('t', '2026-09-01', '10:00', '22:00')]);
    sincronizar(a, nuvem);
    sincronizar(b, nuvem);
    expect((b.db.entries[0] as Turno).start).toBe('10:00');
    sincronizar(a, nuvem);
    expect((a.db.entries[0] as Turno).start).toBe('10:00');
  });

  it('entre apagar aqui e editar lá, a edição é preservada', () => {
    const nuvem = { v: null as Instantaneo | null };
    const a = aparelho(inst([turno('t', '2026-09-01')]));
    const b = aparelho(inst([]));
    sincronizar(a, nuvem);
    sincronizar(b, nuvem);

    a.db = inst([]); // A apaga
    b.db = inst([turno('t', '2026-09-01', '08:00', '20:00')]); // B edita
    sincronizar(a, nuvem);
    sincronizar(b, nuvem);
    expect(ids(b.db)).toEqual(['t']);
    sincronizar(a, nuvem);
    expect(ids(a.db)).toEqual(['t']);
  });

  it('converge quando um aparelho troca ids equivalentes (sem perder o lançamento)', () => {
    // A e B criaram o mesmo turno; B sincroniza por último e "vence" o id
    const nuvem = { v: null as Instantaneo | null };
    const a = aparelho(inst([turno('a1', '2026-09-01')]));
    const b = aparelho(inst([turno('b1', '2026-09-01')]));
    sincronizar(a, nuvem);
    sincronizar(b, nuvem);
    sincronizar(a, nuvem);
    sincronizar(b, nuvem);
    expect(a.db.entries).toHaveLength(1);
    expect(iguaisInst(a.db, b.db)).toBe(true);
    expect(iguaisInst(a.db, nuvem.v!)).toBe(true);
  });

  it('edições feitas durante a sincronização não se perdem nem são desfeitas', () => {
    const local0 = inst([turno('a', '2026-09-01'), turno('b', '2026-09-02')]);
    const base = inst([turno('a', '2026-09-01'), turno('b', '2026-09-02')]);
    const mesclado = inst([turno('a', '2026-09-01'), turno('b', '2026-09-02'), turno('n', '2026-09-03')]);
    // durante a sincronização o usuário apagou "a" e criou "c"
    const agora = inst([turno('b', '2026-09-02'), turno('c', '2026-09-04')]);
    const final = mesclar3(local0, agora, mesclado);
    expect(ids(final)).toEqual(['b', 'c', 'n']);
    // e, na sincronização seguinte (base = mesclado), essas mudanças seguem para a nuvem
    const proxima = mesclar3(mesclado, final, mesclado);
    expect(ids(proxima)).toEqual(['b', 'c', 'n']);
    void base;
  });

  it('configurações e turnos salvos: aparelho de fábrica adota a nuvem; personalizado vence', () => {
    const custom = { ...configPadrao(), edtMinutos: 300 };
    const nuvem = inst([], { config: custom, modelos: [{ id: 'm', nome: 'Meu', start: '06:00', end: '18:00' }] });
    const novo = mesclar3(null, inst([]), nuvem);
    expect(novo.config.edtMinutos).toBe(300);
    expect(novo.modelos.map((m) => m.nome)).toEqual(['Meu']);

    const meu = inst([], { config: { ...configPadrao(), edtMinutos: 120 } });
    expect(mesclar3(null, meu, nuvem).config.edtMinutos).toBe(120);
  });

  it('configurações com base: quem mudou depois da última sincronização vence', () => {
    const base = inst([]);
    const remoto = inst([], { config: { ...configPadrao(), edtMinutos: 300 } });
    // local não mexeu → vale a nuvem
    expect(mesclar3(base, base, remoto).config.edtMinutos).toBe(300);
    // local mexeu → vale o local
    const local = inst([], { config: { ...configPadrao(), edtMinutos: 90 } });
    expect(mesclar3(base, local, remoto).config.edtMinutos).toBe(90);
    // nuvem não mexeu → mantém o local
    expect(mesclar3(base, local, base).config.edtMinutos).toBe(90);
  });

  it('a ordem das chaves e dos lançamentos não conta como diferença', () => {
    const e1 = turno('1', '2026-09-01');
    const e2 = turno('2', '2026-09-02', '19:00', '07:00', { note: 'x' });
    const reordenado = { note: 'x', minutes: 720, end: '07:00', start: '19:00', date: '2026-09-02', kind: 'turno', id: '2' } as Turno;
    expect(iguaisInst(inst([e1, e2]), inst([reordenado, e1]))).toBe(true);
    expect(canonico({ b: 1, a: { d: 1, c: undefined } })).toBe('{"a":{"d":1},"b":1}');
    expect(iguaisInst(inst([e1]), inst([{ ...e1, minutes: 60 }]))).toBe(false);
  });
});

describe('janela de 12 horas', () => {
  const H = 60 * 60 * 1000;

  it('sem sincronização anterior está aberta', () => {
    expect(janela(undefined, 1000)).toEqual({ aberta: true, restanteMs: 0, progresso: 1 });
  });

  it('gasta a janela ao sincronizar e libera após 12 h', () => {
    const t0 = 1_000_000;
    expect(janela(t0, t0).aberta).toBe(false);
    expect(janela(t0, t0).progresso).toBe(0);
    const meio = janela(t0, t0 + 3 * H);
    expect(meio.aberta).toBe(false);
    expect(meio.restanteMs).toBe(9 * H);
    expect(meio.progresso).toBeCloseTo(0.25);
    expect(janela(t0, t0 + INTERVALO_MS).aberta).toBe(true);
  });

  it('relógio que voltou no tempo espera no máximo uma janela', () => {
    expect(janela(10 * H, 0).restanteMs).toBe(INTERVALO_MS);
  });

  it('formata tempos em português', () => {
    expect(formatarRestante(9 * H + 20 * 60_000)).toBe('9h 20min');
    expect(formatarRestante(2 * H)).toBe('2h');
    expect(formatarRestante(35 * 60_000)).toBe('35 min');
    expect(formatarRestante(1)).toBe('1 min');
    expect(formatarRestante(0)).toBe('agora');
    expect(formatarHa(20_000)).toBe('agora há pouco');
    expect(formatarHa(35 * 60_000)).toBe('há 35 min');
    expect(formatarHa(3 * H)).toBe('há 3 h');
    expect(formatarHa(25 * H)).toBe('há 1 dia');
    expect(formatarHa(72 * H)).toBe('há 3 dias');
  });

  it('descreve quando foi a última sincronização', () => {
    const agora = new Date(2026, 8, 28, 15, 0).getTime();
    expect(formatarQuando(new Date(2026, 8, 28, 9, 5).getTime(), agora)).toMatch(/^hoje, 09:05$/);
    expect(formatarQuando(new Date(2026, 8, 27, 22, 30).getTime(), agora)).toMatch(/^ontem, 22:30$/);
    expect(formatarQuando(new Date(2026, 8, 20, 8, 0).getTime(), agora)).toMatch(/^20\/09, 08:00$/);
  });
});

describe('situação exibida', () => {
  const base: SyncEstado = { ativo: true, auto: true, ocupado: false };
  it('prioriza ocupado, sessão expirada e erro sobre pendências', () => {
    expect(situacao({ ...base, ocupado: true, erro: 'x' }, true)).toBe('ocupado');
    expect(situacao({ ...base, precisaEntrar: true, erro: 'x' }, true)).toBe('sessao');
    expect(situacao({ ...base, erro: 'x' }, true)).toBe('erro');
    expect(situacao(base, true)).toBe('pendente');
    expect(situacao(base, false)).toBe('ok');
  });
});

describe('nota da sessão perdida', () => {
  const agora = new Date(2026, 8, 28, 15, 0).getTime();
  const base: SyncEstado = { ativo: true, auto: true, ocupado: false, precisaEntrar: true };

  it('sem sessão no navegador: diz desde quando, tranquiliza e mostra o motivo técnico', () => {
    const n = notaSessao({ ...base, precisaEntrarEm: new Date(2026, 8, 28, 9, 5).getTime(), motivoSessao: 'sem-sessao' }, agora);
    expect(n.titulo).toBe('Sessão do Google encerrada · hoje, 09:05');
    expect(n.texto).toMatch(/dados do site são limpos/);
    expect(n.texto).toMatch(/intacta/);
    expect(n.codigo).toBe('sem-sessao');
  });

  it('login recusado pelo Google: explica a causa e mantém o código do erro', () => {
    const n = notaSessao({ ...base, precisaEntrarEm: agora, motivoSessao: 'auth/user-token-expired' }, agora);
    expect(n.texto).toMatch(/recusou renovar/);
    expect(n.codigo).toBe('auth/user-token-expired');
  });

  it('aviso gravado por versão anterior (sem horário nem motivo) continua legível', () => {
    const n = notaSessao(base, agora);
    expect(n.titulo).toBe('Sessão do Google encerrada');
    expect(n.codigo).toBeUndefined();
    expect(n.texto).toMatch(/não tinha mais o seu login/);
  });
});
