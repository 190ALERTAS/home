import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Turno } from '../model';
import type { Instantaneo } from './merge';
import type { Usuario } from './nuvem';

const H = 3600_000;

/** Nuvem falsa em memória que conta leituras/gravações do Firestore (cada consulta ou transação lê 1 vez). */
function nuvemFalsa() {
  const n = {
    doc: null as Instantaneo | null,
    /** "atualizadoEm" do documento: muda a cada gravação (de qualquer aparelho ou versão). */
    carimbo: undefined as string | undefined,
    versao: 0,
    leituras: 0,
    gravacoes: 0,
    tentativas: 0,
    consultas: 0,
    chamadasConferir: 0,
    usuario: { uid: 'u1', email: 'a@b.com', nome: 'Ana' } as Usuario | null,
    erro: null as (Error & { code?: string }) | null,
    erroConsulta: null as (Error & { code?: string }) | null,
    /** Outro aparelho (inclusive um app 5.1.x, que só grava "atualizadoEm") grava direto na nuvem. */
    gravarDeFora(i: Instantaneo) {
      n.doc = structuredClone(i);
      n.carimbo = `c${++n.versao}`;
    },
  };
  vi.doMock('./nuvem', () => ({
    usuarioAtual: async () => n.usuario,
    entrar: async () => n.usuario,
    sair: async () => {},
    apagar: async () => {
      n.doc = null;
      n.carimbo = undefined;
      n.gravacoes++;
    },
    conferir: async (_uid: string, carimbo: string) => {
      n.chamadasConferir++;
      n.tentativas++;
      if (n.erroConsulta) throw n.erroConsulta;
      if (n.erro) throw n.erro;
      n.leituras++;
      n.consultas++;
      if (!n.doc || n.carimbo === carimbo) return { mudou: false };
      return { mudou: true, remoto: structuredClone(n.doc), carimbo: n.carimbo };
    },
    trocar: async (_uid: string, decidir: (r: Instantaneo | null) => { mesclado: Instantaneo; gravar: boolean }) => {
      n.tentativas++;
      if (n.erro) throw n.erro;
      n.leituras++;
      const existia = n.doc != null;
      const r = decidir(n.doc ? structuredClone(n.doc) : null);
      if (r.gravar) {
        n.doc = structuredClone(r.mesclado);
        n.carimbo = `c${++n.versao}`;
        n.gravacoes++;
      }
      return { mesclado: r.mesclado, gravou: r.gravar, existia, carimbo: n.carimbo };
    },
  }));
  return n;
}

/** document/window falsos que guardam os ouvintes, para disparar "visibilitychange" e "online". */
function alvoDeEventos<T extends object>(extra: T) {
  const ouvintes = new Map<string, Set<() => void>>();
  return Object.assign(extra, {
    addEventListener: (tipo: string, f: () => void) => void (ouvintes.get(tipo) ?? ouvintes.set(tipo, new Set()).get(tipo)!).add(f),
    removeEventListener: (tipo: string, f: () => void) => void ouvintes.get(tipo)?.delete(f),
    disparar: (tipo: string) => ouvintes.get(tipo)?.forEach((f) => f()),
  });
}

async function montar() {
  vi.resetModules();
  const mem = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
  const win = alvoDeEventos({});
  const doc = alvoDeEventos({ visibilityState: 'visible' as 'visible' | 'hidden' });
  const nav = { onLine: true } as { onLine: boolean; locks?: unknown };
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('navigator', nav);
  const nuvem = nuvemFalsa();
  const motor = await import('./motor');
  const auto = await import('./auto');
  const estado = await import('./estado');
  const store = await import('../store');
  const model = await import('../model');
  const ops = await import('../ops');
  const ocultar = () => {
    doc.visibilityState = 'hidden';
    doc.disparar('visibilitychange');
  };
  const mostrar = () => {
    doc.visibilityState = 'visible';
    doc.disparar('visibilitychange');
  };
  const internet = (on: boolean) => {
    nav.onLine = on;
    if (on) win.disparar('online');
  };
  return { nuvem, motor, auto, estado, store, model, ops, mem, ocultar, mostrar, internet };
}

/** Uma segunda aba do mesmo navegador: módulos novos, mesmo armazenamento e mesma nuvem. */
async function outraAba() {
  vi.resetModules();
  return { motor: await import('./motor'), store: await import('../store') };
}

const turno = (id: string, date: string): Turno => ({ id, kind: 'turno', date, start: '07:00', end: '19:00', minutes: 720 });

describe('reconectar depois de apagar os dados locais', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 10, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.doUnmock('./nuvem');
  });

  it('traz a escala da nuvem ao conectar de novo, logo depois de sair', async () => {
    const t = await montar();
    t.store.atualizar((d) => ({ ...d, entries: [turno('a', '2026-09-01'), turno('b', '2026-09-02')] }));
    expect((await t.motor.conectar()).ok).toBe(true);
    expect(t.nuvem.doc?.entries).toHaveLength(2);

    await t.motor.desconectar();
    // "Apagar todos os registros"
    t.store.atualizar((d) => ({ ...d, entries: [] }));
    expect(t.store.getEscala().entries).toHaveLength(0);

    vi.setSystemTime(new Date(2026, 8, 28, 10, 30));
    const r = await t.motor.conectar();
    expect(r.ok).toBe(true);
    expect(t.store.getEscala().entries.map((e) => e.id).sort()).toEqual(['a', 'b']);
    expect(t.nuvem.doc?.entries).toHaveLength(2); // a nuvem não foi esvaziada
  });

  it('apagar tudo enquanto está desconectado nunca esvazia a nuvem, mesmo passadas 12 h', async () => {
    const t = await montar();
    t.store.atualizar((d) => ({ ...d, entries: [turno('a', '2026-09-01')] }));
    await t.motor.conectar();
    await t.motor.desconectar();
    t.store.atualizar((d) => ({ ...d, entries: [] }));

    vi.setSystemTime(new Date(2026, 8, 29, 12, 0)); // +26 h
    await t.motor.conectar();
    expect(t.nuvem.doc?.entries).toHaveLength(1);
    expect(t.store.getEscala().entries).toHaveLength(1);
  });

  it('apagar tudo ESTANDO conectado continua propagando (é o que o aviso da tela promete)', async () => {
    const t = await montar();
    t.store.atualizar((d) => ({ ...d, entries: [turno('a', '2026-09-01')] }));
    await t.motor.conectar();
    t.store.atualizar((d) => ({ ...d, entries: [] }));
    vi.setSystemTime(new Date(2026, 8, 29, 12, 0));
    expect((await t.motor.sincronizar('manual')).ok).toBe(true);
    expect(t.nuvem.doc?.entries).toHaveLength(0);
  });
});

const MIN = 60_000;

describe('sincronização sem janela: confere barato e envia logo depois de lançar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 22, 10, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.doUnmock('./nuvem');
  });

  const mais = (t: Awaited<ReturnType<typeof montar>>, id: string, date = '2026-10-10') =>
    t.store.atualizar((d) => ({ ...d, entries: [...d.entries, turno(id, date)] }));

  it('abrir o app traz o que o outro aparelho lançou, mesmo minutos depois da última sincronização', async () => {
    const t = await montar(); // o celular
    await t.motor.conectar(); // sincronizou às 10:00
    // 10:05: o computador lança um turno e sincroniza
    vi.setSystemTime(new Date(2026, 9, 22, 10, 5));
    t.nuvem.gravarDeFora({ ...t.nuvem.doc!, entries: [...t.nuvem.doc!.entries, turno('pc', '2026-10-25')] });
    // 10:06: abre o app no celular
    vi.setSystemTime(new Date(2026, 9, 22, 10, 6));
    const g = t.nuvem.gravacoes;
    const parar = t.auto.iniciarSyncAutomatico();
    await vi.advanceTimersByTimeAsync(2000);
    parar();
    expect(t.store.getEscala().entries.map((e) => e.id)).toContain('pc');
    expect(t.nuvem.gravacoes).toBe(g); // só leu, não precisou gravar
  });

  it('voltar ao app confere de novo depois de 3 min, e não antes', async () => {
    const t = await montar();
    await t.motor.conectar();
    const parar = t.auto.iniciarSyncAutomatico();
    await vi.advanceTimersByTimeAsync(2000);
    const c = t.nuvem.consultas;
    t.ocultar();
    await vi.advanceTimersByTimeAsync(1 * MIN);
    t.mostrar();
    await vi.advanceTimersByTimeAsync(1000);
    expect(t.nuvem.consultas).toBe(c);
    t.nuvem.gravarDeFora({ ...t.nuvem.doc!, entries: [turno('pc', '2026-10-25')] });
    t.ocultar();
    await vi.advanceTimersByTimeAsync(3 * MIN);
    t.mostrar();
    await vi.advanceTimersByTimeAsync(1000);
    parar();
    expect(t.nuvem.consultas).toBe(c + 1);
    expect(t.store.getEscala().entries.map((e) => e.id)).toEqual(['pc']);
  });

  it('conferir sem mudança custa 1 consulta e nenhuma gravação', async () => {
    const t = await montar();
    mais(t, 'a');
    await t.motor.conectar();
    vi.setSystemTime(new Date(2026, 9, 22, 10, 30));
    const { leituras, gravacoes } = t.nuvem;
    const r = await t.motor.sincronizar('auto');
    expect(r).toEqual({ ok: true, enviou: false, recebeu: false });
    expect(t.nuvem.leituras - leituras).toBe(1);
    expect(t.nuvem.consultas).toBe(1);
    expect(t.nuvem.gravacoes).toBe(gravacoes);
  });

  it('alteração local sobe 10 s depois, numa gravação só (rajada de lançamentos)', async () => {
    const t = await montar();
    await t.motor.conectar();
    const parar = t.auto.iniciarSyncAutomatico();
    await vi.advanceTimersByTimeAsync(2000);
    const g = t.nuvem.gravacoes;
    for (let i = 1; i <= 5; i++) {
      mais(t, `x${i}`, `2026-10-0${i}`);
      await vi.advanceTimersByTimeAsync(2000);
    }
    expect(t.nuvem.gravacoes).toBe(g);
    await vi.advanceTimersByTimeAsync(10_000);
    parar();
    expect(t.nuvem.gravacoes - g).toBe(1);
    expect(t.nuvem.doc!.entries).toHaveLength(5);
    expect(t.motor.pendenteLocal()).toBe(false);
  });

  it('ocultar o app envia na hora o que está pendente', async () => {
    const t = await montar();
    await t.motor.conectar();
    const parar = t.auto.iniciarSyncAutomatico();
    await vi.advanceTimersByTimeAsync(2000);
    mais(t, 'a');
    t.ocultar();
    await vi.advanceTimersByTimeAsync(100);
    parar();
    expect(t.nuvem.doc!.entries.map((e) => e.id)).toEqual(['a']);
  });

  it('app fechado antes do envio: sobe na próxima abertura', async () => {
    const t = await montar();
    await t.motor.conectar();
    mais(t, 'a'); // lançou e fechou o app em seguida (sem automático rodando)
    vi.setSystemTime(new Date(2026, 9, 22, 18, 0));
    const parar = t.auto.iniciarSyncAutomatico();
    await vi.advanceTimersByTimeAsync(2000);
    parar();
    expect(t.nuvem.doc!.entries.map((e) => e.id)).toEqual(['a']);
  });

  it('sem internet espera o online para enviar', async () => {
    const t = await montar();
    await t.motor.conectar();
    const parar = t.auto.iniciarSyncAutomatico();
    await vi.advanceTimersByTimeAsync(2000);
    t.internet(false);
    const tentativas = t.nuvem.tentativas;
    mais(t, 'a');
    await vi.advanceTimersByTimeAsync(30 * MIN);
    expect(t.nuvem.tentativas).toBe(tentativas);
    t.internet(true);
    await vi.advanceTimersByTimeAsync(1000);
    parar();
    expect(t.nuvem.doc!.entries.map((e) => e.id)).toEqual(['a']);
    expect(t.estado.getSync().falhas).toBeUndefined();
  });

  it('base da 5.1.x (sem carimbo): a primeira conferência usa a transação e guarda o carimbo', async () => {
    const t = await montar();
    mais(t, 'a');
    await t.motor.conectar();
    const base = JSON.parse(t.mem.get('190a:escala:sync-base')!);
    delete base.carimbo; // como a 5.1.x gravava
    t.mem.set('190a:escala:sync-base', JSON.stringify(base));
    vi.setSystemTime(new Date(2026, 9, 22, 11, 0));
    const consultas = t.nuvem.consultas;
    expect((await t.motor.sincronizar('auto')).ok).toBe(true);
    expect(t.nuvem.consultas).toBe(consultas); // foi direto para a transação
    expect(t.estado.lerBase('u1')?.carimbo).toBe(t.nuvem.carimbo);
    vi.setSystemTime(new Date(2026, 9, 22, 12, 0));
    await t.motor.sincronizar('auto');
    expect(t.nuvem.consultas).toBe(consultas + 1); // daqui em diante, a consulta barata
  });

  it('gravação feita por um aparelho 5.1.x (só atualizadoEm) é detectada', async () => {
    const t = await montar();
    mais(t, 'a');
    await t.motor.conectar();
    t.nuvem.gravarDeFora({ ...t.nuvem.doc!, entries: [...t.nuvem.doc!.entries, turno('velho', '2026-10-12')] });
    vi.setSystemTime(new Date(2026, 9, 22, 10, 20));
    const r = await t.motor.sincronizar('auto');
    expect(r).toEqual({ ok: true, enviou: false, recebeu: true });
    expect(t.store.getEscala().entries.map((e) => e.id).sort()).toEqual(['a', 'velho']);
  });

  it('alteração local junto com mudança na nuvem: mescla os dois e grava uma vez', async () => {
    const t = await montar();
    await t.motor.conectar();
    t.nuvem.gravarDeFora({ ...t.nuvem.doc!, entries: [turno('pc', '2026-10-25')] });
    mais(t, 'cel', '2026-10-26');
    vi.setSystemTime(new Date(2026, 9, 22, 10, 20));
    const g = t.nuvem.gravacoes;
    const r = await t.motor.sincronizar('auto');
    expect(r).toEqual({ ok: true, enviou: true, recebeu: true });
    expect(t.nuvem.gravacoes - g).toBe(1);
    expect(t.nuvem.doc!.entries.map((e) => e.id).sort()).toEqual(['cel', 'pc']);
  });

  it('duas abas com a mesma alteração gravam uma vez', async () => {
    const t = await montar();
    await t.motor.conectar();
    mais(t, 'a');
    const b = await outraAba(); // abriu depois do lançamento: já carrega a escala com "a"
    expect(b.store.getEscala().entries.map((e) => e.id)).toEqual(['a']);
    const g = t.nuvem.gravacoes;
    expect((await t.motor.sincronizar('envio')).ok).toBe(true);
    expect((await b.motor.sincronizar('envio')).ok).toBe(true);
    expect(t.nuvem.gravacoes - g).toBe(1);
  });

  it('consulta recusada (índice, permissão) cai na transação e não é tentada de novo', async () => {
    const t = await montar();
    mais(t, 'a');
    await t.motor.conectar();
    t.nuvem.erroConsulta = Object.assign(new Error('precisa de índice'), { code: 'failed-precondition' });
    vi.setSystemTime(new Date(2026, 9, 22, 10, 30));
    expect((await t.motor.sincronizar('auto')).ok).toBe(true);
    expect(t.estado.getSync().consultaOff).toBe(true);
    expect(t.estado.getSync().erro).toBeUndefined();
    vi.setSystemTime(new Date(2026, 9, 22, 11, 0));
    expect((await t.motor.sincronizar('auto')).ok).toBe(true);
    expect(t.nuvem.chamadasConferir).toBe(1);
  });

  it('automático desligado não envia nem confere sozinho', async () => {
    const t = await montar();
    await t.motor.conectar();
    t.estado.definirSync({ auto: false });
    const { leituras, gravacoes } = t.nuvem;
    const parar = t.auto.iniciarSyncAutomatico();
    mais(t, 'a');
    t.ocultar();
    await vi.advanceTimersByTimeAsync(2 * 60 * MIN);
    t.mostrar();
    await vi.advanceTimersByTimeAsync(2 * 60 * MIN);
    parar();
    expect(t.nuvem.leituras).toBe(leituras);
    expect(t.nuvem.gravacoes).toBe(gravacoes);
  });

  it('apagar a cópia na nuvem não a recria sozinha', async () => {
    const t = await montar();
    mais(t, 'a');
    await t.motor.conectar();
    const parar = t.auto.iniciarSyncAutomatico();
    await vi.advanceTimersByTimeAsync(2000);
    await t.motor.apagarNuvem();
    mais(t, 'b');
    await vi.advanceTimersByTimeAsync(3 * 60 * MIN);
    parar();
    expect(t.nuvem.doc).toBeNull();
  });

  it('"Sincronizar agora" sempre funciona e cliques repetidos leem uma vez', async () => {
    const t = await montar();
    await t.motor.conectar();
    vi.setSystemTime(new Date(2026, 9, 22, 10, 1)); // 1 min depois: antes, a janela de 12 h bloqueava
    const antes = t.nuvem.leituras;
    const rajada = await Promise.all(Array.from({ length: 10 }, () => t.motor.sincronizar('manual')));
    await t.motor.sincronizar('manual');
    await t.motor.sincronizar('manual');
    expect(rajada.every((r) => r.ok)).toBe(true);
    expect(t.nuvem.leituras - antes).toBe(1);
    vi.setSystemTime(new Date(2026, 9, 22, 10, 2));
    await t.motor.sincronizar('manual');
    expect(t.nuvem.leituras - antes).toBe(2);
  });

  it('um dia de uso típico: até 20 leituras, e só grava quando muda', async () => {
    const t = await montar();
    vi.setSystemTime(new Date(2026, 9, 22, 7, 0));
    await t.motor.conectar();
    const { leituras, gravacoes } = t.nuvem;
    const parar = t.auto.iniciarSyncAutomatico();
    await vi.advanceTimersByTimeAsync(2000);
    for (let i = 0; i < 8; i++) {
      if (i % 3 === 0) mais(t, `t${i}`, `2026-10-${10 + i}`);
      await vi.advanceTimersByTimeAsync(20_000);
      t.ocultar();
      await vi.advanceTimersByTimeAsync(90 * MIN);
      t.mostrar();
      await vi.advanceTimersByTimeAsync(MIN);
    }
    parar();
    expect(t.nuvem.leituras - leituras).toBeLessThanOrEqual(20);
    expect(t.nuvem.gravacoes - gravacoes).toBe(3);
    expect(t.nuvem.doc!.entries).toHaveLength(3);
  });

  it('falha repetida recua (15 min, 1 h, 4 h, 12 h) e não vira uma leitura a cada poucos minutos', async () => {
    const t = await montar();
    await t.motor.conectar();
    t.nuvem.erro = Object.assign(new Error('indisponível'), { code: 'unavailable' });
    const antes = t.nuvem.tentativas;
    const parar = t.auto.iniciarSyncAutomatico();
    await vi.advanceTimersByTimeAsync(48 * H);
    parar();
    expect(t.nuvem.tentativas - antes).toBeLessThanOrEqual(8);
  });

  it('erro permanente (permissão negada, dados ilegíveis) não é repetido pelo automático', async () => {
    const t = await montar();
    await t.motor.conectar();
    vi.setSystemTime(new Date(2026, 9, 22, 11, 0));
    t.nuvem.erro = Object.assign(new Error('negado'), { code: 'permission-denied' });
    const antes = t.nuvem.tentativas;
    const parar = t.auto.iniciarSyncAutomatico();
    await vi.advanceTimersByTimeAsync(72 * H);
    parar();
    // a consulta recusada cai na transação, que também é recusada: um erro só, e o automático para
    expect(t.nuvem.tentativas - antes).toBe(2);
    expect(t.estado.getSync().permanente).toBe(true);
    // a recusa veio da conta (as duas formas falharam): a consulta barata continua valendo depois
    expect(t.estado.getSync().consultaOff).toBeUndefined();

    t.nuvem.erro = null;
    expect((await t.motor.sincronizar('manual')).ok).toBe(true);
    expect(t.estado.getSync().permanente).toBeUndefined();
  });

  it('duas abas: a que perde a trava não lê, e a que ganha confere o que a outra acabou de fazer', async () => {
    const t = await montar();
    await t.motor.conectar();
    vi.setSystemTime(new Date(2026, 9, 22, 11, 0));

    vi.stubGlobal('navigator', { onLine: true, locks: { request: (_n: string, _o: unknown, cb: (l: unknown) => unknown) => cb(null) } });
    const antes = t.nuvem.leituras;
    const r = await t.motor.sincronizar('auto');
    expect(r.ok === false && r.motivo).toBe('ocupado');
    expect(t.nuvem.leituras).toBe(antes);

    // a outra aba terminou e gravou "checado" no armazenamento: esta aba, ao pegar a trava, não lê de novo
    t.mem.set('190a:escala:sync', JSON.stringify({ ...JSON.parse(t.mem.get('190a:escala:sync')!), checado: Date.now() }));
    vi.stubGlobal('navigator', { onLine: true, locks: { request: (_n: string, _o: unknown, cb: (l: unknown) => unknown) => cb({}) } });
    const r2 = await t.motor.sincronizar('auto');
    expect(r2.ok).toBe(true);
    expect(t.nuvem.leituras).toBe(antes);
  });

  it('sem internet o automático nem tenta (nenhuma leitura, nenhuma falha contada)', async () => {
    const t = await montar();
    await t.motor.conectar();
    t.internet(false);
    const antes = t.nuvem.tentativas;
    const parar = t.auto.iniciarSyncAutomatico();
    mais(t, 'a');
    await vi.advanceTimersByTimeAsync(24 * H);
    parar();
    expect(t.nuvem.tentativas).toBe(antes);
    expect(t.estado.getSync().falhas).toBeUndefined();
  });
});

describe('sessão do Google', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 10, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.doUnmock('./nuvem');
  });

  const ana: Usuario = { uid: 'u1', email: 'a@b.com', nome: 'Ana' };

  /** Conecta e avança um dia, pronto para o próximo passo. */
  async function conectado() {
    const t = await montar();
    await t.motor.conectar();
    vi.setSystemTime(new Date(2026, 8, 29, 11, 0));
    return t;
  }

  it('sem sessão no navegador: registra quando e por quê, sem contar como falha', async () => {
    const t = await conectado();
    t.nuvem.usuario = null;
    const r = await t.motor.sincronizar('manual');
    expect(r.ok === false && r.motivo).toBe('sessao');
    const s = t.estado.getSync();
    expect(s.precisaEntrar).toBe(true);
    expect(s.motivoSessao).toBe('sem-sessao');
    expect(s.precisaEntrarEm).toBe(Date.now());
    expect(s.falhas).toBeUndefined();
    expect(s.erro).toBeUndefined();
  });

  it('guarda o horário da primeira perda, não o da última tentativa', async () => {
    const t = await conectado();
    t.nuvem.usuario = null;
    await t.motor.sincronizar('manual');
    const primeira = t.estado.getSync().precisaEntrarEm;
    vi.setSystemTime(new Date(2026, 8, 29, 18, 0));
    await t.motor.sincronizar('manual');
    expect(t.estado.getSync().precisaEntrarEm).toBe(primeira);
  });

  it('erro de token (o Google recusou renovar o login) também é sessão perdida, não "falha"', async () => {
    const t = await conectado();
    t.nuvem.erro = Object.assign(new Error('expirou'), { code: 'auth/user-token-expired' });
    const r = await t.motor.sincronizar('manual');
    expect(r.ok === false && r.motivo).toBe('sessao');
    const s = t.estado.getSync();
    expect(s.precisaEntrar).toBe(true);
    expect(s.motivoSessao).toBe('auth/user-token-expired');
    expect(s.erro).toBeUndefined();
    expect(s.falhas).toBeUndefined();
  });

  it('a sessão que volta cura o aviso sozinha e o automático retoma a sincronização', async () => {
    const t = await conectado();
    t.nuvem.usuario = null;
    await t.motor.sincronizar('manual');
    expect(t.estado.getSync().precisaEntrar).toBe(true);
    expect(t.auto.deveConferir()).toBe(false); // antes: ficava assim para sempre

    t.nuvem.usuario = ana; // ex.: outra aba entrou de novo
    const antes = t.nuvem.leituras;
    const parar = t.auto.iniciarSyncAutomatico();
    await vi.advanceTimersByTimeAsync(10_000);
    parar();
    const s = t.estado.getSync();
    expect(s.precisaEntrar).toBeUndefined();
    expect(s.precisaEntrarEm).toBeUndefined();
    expect(s.motivoSessao).toBeUndefined();
    expect(t.nuvem.leituras - antes).toBe(1);
  });

  it('enquanto a sessão não volta, o automático não lê a nuvem nem insiste em sincronizar', async () => {
    const t = await conectado();
    t.nuvem.usuario = null;
    await t.motor.sincronizar('manual');
    const antes = t.nuvem.tentativas;
    const parar = t.auto.iniciarSyncAutomatico();
    await vi.advanceTimersByTimeAsync(24 * H);
    parar();
    expect(t.nuvem.tentativas).toBe(antes);
    expect(t.estado.getSync().precisaEntrar).toBe(true);
  });

  it('outra conta Google no mesmo navegador não cura o aviso (não mistura escalas)', async () => {
    const t = await conectado();
    t.nuvem.usuario = null;
    await t.motor.sincronizar('manual');
    t.nuvem.usuario = { uid: 'u2', email: 'outra@b.com' };
    expect(await t.motor.revalidarSessao()).toBe(false);
    expect(t.estado.getSync().precisaEntrar).toBe(true);
  });

  it('sem internet não revalida', async () => {
    const t = await conectado();
    t.nuvem.usuario = null;
    await t.motor.sincronizar('manual');
    t.nuvem.usuario = ana;
    vi.stubGlobal('navigator', { onLine: false });
    expect(await t.motor.revalidarSessao()).toBe(false);
    expect(t.estado.getSync().precisaEntrar).toBe(true);
  });

  it('revalidar sem aviso de sessão não faz nada', async () => {
    const t = await conectado();
    expect(await t.motor.revalidarSessao()).toBe(false);
  });

  it('sair da conta zera a nota da sessão', async () => {
    const t = await conectado();
    t.nuvem.usuario = null;
    await t.motor.sincronizar('manual');
    await t.motor.desconectar();
    const s = t.estado.getSync();
    expect(s.precisaEntrar).toBeUndefined();
    expect(s.precisaEntrarEm).toBeUndefined();
    expect(s.motivoSessao).toBeUndefined();
  });

  it('entrar de novo (mesma conta) zera a nota e volta a sincronizar', async () => {
    const t = await conectado();
    t.nuvem.usuario = null;
    await t.motor.sincronizar('manual');
    t.nuvem.usuario = ana;
    const r = await t.motor.conectar();
    expect(r.ok).toBe(true);
    const s = t.estado.getSync();
    expect(s.precisaEntrar).toBeUndefined();
    expect(s.motivoSessao).toBeUndefined();
  });
});
