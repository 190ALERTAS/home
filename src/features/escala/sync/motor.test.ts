import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Turno } from '../model';
import type { Instantaneo } from './merge';
import type { Usuario } from './nuvem';

const H = 3600_000;

/** Nuvem falsa em memória que conta leituras/gravações do Firestore. */
function nuvemFalsa() {
  const n = {
    doc: null as Instantaneo | null,
    leituras: 0,
    gravacoes: 0,
    tentativas: 0,
    usuario: { uid: 'u1', email: 'a@b.com', nome: 'Ana' } as Usuario | null,
    erro: null as (Error & { code?: string }) | null,
  };
  vi.doMock('./nuvem', () => ({
    usuarioAtual: async () => n.usuario,
    entrar: async () => n.usuario,
    sair: async () => {},
    apagar: async () => {
      n.doc = null;
      n.gravacoes++;
    },
    trocar: async (_uid: string, decidir: (r: Instantaneo | null) => { mesclado: Instantaneo; gravar: boolean }) => {
      n.tentativas++;
      if (n.erro) throw n.erro;
      n.leituras++;
      const existia = n.doc != null;
      const r = decidir(n.doc ? structuredClone(n.doc) : null);
      if (r.gravar) {
        n.doc = structuredClone(r.mesclado);
        n.gravacoes++;
      }
      return { mesclado: r.mesclado, gravou: r.gravar, existia };
    },
  }));
  return n;
}

async function montar() {
  vi.resetModules();
  const mem = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
  vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('navigator', { onLine: true });
  const nuvem = nuvemFalsa();
  const motor = await import('./motor');
  const auto = await import('./auto');
  const estado = await import('./estado');
  const store = await import('../store');
  const model = await import('../model');
  const ops = await import('../ops');
  return { nuvem, motor, auto, estado, store, model, ops, mem };
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

  it('traz a escala da nuvem ao conectar de novo, mesmo dentro da janela de 12 h', async () => {
    const t = await montar();
    t.store.atualizar((d) => ({ ...d, entries: [turno('a', '2026-09-01'), turno('b', '2026-09-02')] }));
    expect((await t.motor.conectar()).ok).toBe(true);
    expect(t.nuvem.doc?.entries).toHaveLength(2);

    await t.motor.desconectar();
    // "Apagar todos os registros"
    t.store.atualizar((d) => ({ ...d, entries: [] }));
    expect(t.store.getEscala().entries).toHaveLength(0);

    vi.setSystemTime(new Date(2026, 8, 28, 10, 30)); // 30 min depois, janela ainda "usada"
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

describe('consumo de leituras da nuvem (plano gratuito)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 10, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.doUnmock('./nuvem');
  });

  /** Deixa o relógio correr `ms`, com o app aberto e o automático ligado. */
  async function passar(t: Awaited<ReturnType<typeof montar>>, ms: number) {
    const parar = t.auto.iniciarSyncAutomatico();
    await vi.advanceTimersByTimeAsync(ms);
    parar();
  }

  it('app aberto por 7 dias, com edição diária: no máximo 2 leituras e 2 gravações por dia', async () => {
    const t = await montar();
    await t.motor.conectar(); // 1 leitura (+1 gravação) do login
    const parar = t.auto.iniciarSyncAutomatico();
    for (let dia = 0; dia < 7; dia++) {
      t.store.atualizar((d) => ({ ...d, entries: [...d.entries, turno(`t${dia}`, `2026-09-${String(dia + 1).padStart(2, '0')}`)] }));
      await vi.advanceTimersByTimeAsync(24 * H);
    }
    parar();
    expect(t.nuvem.leituras).toBeLessThanOrEqual(1 + 7 * 2);
    expect(t.nuvem.gravacoes).toBeLessThanOrEqual(1 + 7 * 2);
    expect(t.nuvem.doc?.entries).toHaveLength(7); // e a nuvem recebeu tudo
  });

  it('sem nenhuma alteração, 48 h de uso não geram gravações (só a leitura de conferência)', async () => {
    const t = await montar();
    t.store.atualizar((d) => ({ ...d, entries: [turno('a', '2026-09-01')] }));
    await t.motor.conectar();
    const g = t.nuvem.gravacoes;
    await passar(t, 48 * H);
    expect(t.nuvem.gravacoes).toBe(g);
    expect(t.nuvem.leituras).toBeLessThanOrEqual(1 + 4); // 12h, 24h, 36h, 48h
  });

  it('apertar "Sincronizar agora" várias vezes (ou duas vezes ao mesmo tempo) lê uma vez só', async () => {
    const t = await montar();
    await t.motor.conectar();
    const antes = t.nuvem.leituras;
    vi.setSystemTime(new Date(2026, 8, 29, 11, 0)); // janela aberta
    const rajada = await Promise.all(Array.from({ length: 10 }, () => t.motor.sincronizar('manual')));
    await t.motor.sincronizar('manual');
    await t.motor.sincronizar('manual');
    expect(rajada.every((r) => r.ok)).toBe(true);
    expect(t.nuvem.leituras - antes).toBe(1);
  });

  it('falha repetida recua (15 min, 1 h, 4 h, 12 h) e não vira uma leitura a cada poucos minutos', async () => {
    const t = await montar();
    await t.motor.conectar();
    vi.setSystemTime(new Date(2026, 8, 29, 11, 0)); // janela aberta
    t.nuvem.erro = Object.assign(new Error('indisponível'), { code: 'unavailable' });
    const antes = t.nuvem.tentativas;
    await passar(t, 48 * H);
    expect(t.nuvem.tentativas - antes).toBeLessThanOrEqual(7);
  });

  it('erro permanente (permissão negada, dados ilegíveis) não é repetido pelo automático', async () => {
    const t = await montar();
    await t.motor.conectar();
    vi.setSystemTime(new Date(2026, 8, 29, 11, 0));
    t.nuvem.erro = Object.assign(new Error('negado'), { code: 'permission-denied' });
    const antes = t.nuvem.tentativas;
    await passar(t, 72 * H);
    expect(t.nuvem.tentativas - antes).toBe(1);
    expect(t.estado.getSync().permanente).toBe(true);

    // o usuário corrige (ex.: entra de novo) e a sincronização volta ao normal
    t.nuvem.erro = null;
    expect((await t.motor.sincronizar('manual')).ok).toBe(true);
    expect(t.estado.getSync().permanente).toBeUndefined();
  });

  it('duas abas: a que perde a trava não lê, e a que ganha confere o que a outra já fez', async () => {
    const t = await montar();
    await t.motor.conectar();
    vi.setSystemTime(new Date(2026, 8, 29, 11, 0)); // janela aberta

    // outra aba está sincronizando: a trava não está disponível
    const original = (navigator as { locks?: unknown }).locks;
    vi.stubGlobal('navigator', { onLine: true, locks: { request: (_n: string, _o: unknown, cb: (l: unknown) => unknown) => cb(null) } });
    const antes = t.nuvem.leituras;
    const r = await t.motor.sincronizar('auto');
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toBe('ocupado');
    expect(t.nuvem.leituras).toBe(antes);

    // a outra aba terminou e gravou "ultima" no armazenamento: esta aba, ao pegar a trava, desiste
    t.mem.set('190a:escala:sync', JSON.stringify({ ...JSON.parse(t.mem.get('190a:escala:sync')!), ultima: Date.now() }));
    vi.stubGlobal('navigator', { onLine: true, locks: { request: (_n: string, _o: unknown, cb: (l: unknown) => unknown) => cb({}) } });
    const r2 = await t.motor.sincronizar('auto');
    expect(r2.ok === false && r2.motivo).toBe('janela');
    expect(t.nuvem.leituras).toBe(antes);
    void original;
  });

  it('sem internet o automático nem tenta (nenhuma leitura, nenhuma falha contada)', async () => {
    const t = await montar();
    await t.motor.conectar();
    vi.setSystemTime(new Date(2026, 8, 29, 11, 0));
    vi.stubGlobal('navigator', { onLine: false });
    const antes = t.nuvem.tentativas;
    await passar(t, 24 * H);
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

  /** Conecta e avança para a janela aberta, pronto para o próximo passo. */
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
    expect(t.auto.vencida()).toBe(false); // antes: ficava assim para sempre

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
