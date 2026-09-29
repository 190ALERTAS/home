import { configPadrao, MODELOS_PADRAO, ordenar, type Config, type Entry, type EscalaDB, type ModeloTurno } from '../model';

/**
 * Mesclagem entre aparelhos (3 vias).
 *
 * Cada aparelho guarda a "base": a escala exatamente como ficou na última sincronização.
 * Comparando base × local × nuvem dá para saber quem apagou, quem criou e quem alterou,
 * sem precisar registrar lápides de exclusão nos dados. Na primeira sincronização (sem base)
 * o resultado é sempre a união — nada é apagado.
 */

export interface Instantaneo {
  entries: Entry[];
  modelos: ModeloTurno[];
  config: Config;
}

export function instantaneoDe(db: Pick<EscalaDB, 'entries' | 'modelos' | 'config'>): Instantaneo {
  return { entries: db.entries, modelos: db.modelos, config: db.config };
}

/** JSON com as chaves em ordem alfabética: o Firestore não preserva a ordem dos campos. */
export function canonico(v: unknown): string {
  return JSON.stringify(v, (_k, val: unknown) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : val,
  );
}

const iguais = (a: unknown, b: unknown) => canonico(a) === canonico(b);

/** Conteúdo do lançamento sem o id: identifica o "mesmo" lançamento criado em dois aparelhos. */
function conteudo(e: Entry): string {
  const { id: _id, ...resto } = e;
  return canonico(resto);
}

/** Igualdade entre duas escalas, ignorando a ordem dos lançamentos. */
export function iguaisInst(a: Instantaneo, b: Instantaneo): boolean {
  const porId = (l: Entry[]) => [...l].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  return (
    iguais(porId(a.entries), porId(b.entries)) && iguais(a.modelos, b.modelos) && iguais(a.config, b.config)
  );
}

function mesclarEntradas(base: Entry[] | null, local: Entry[], remoto: Entry[]): Entry[] {
  const B = new Map((base ?? []).map((e) => [e.id, e]));
  const L = new Set(local.map((e) => e.id));
  const R = new Map(remoto.map((e) => [e.id, e]));
  const mantidas: Entry[] = [];
  const criadasAqui = new Map<string, Entry[]>();

  for (const le of local) {
    const be = B.get(le.id);
    const re = R.get(le.id);
    if (re) {
      // Sem mudança aqui: vale o que está na nuvem. Alterada aqui: vence a versão local.
      mantidas.push(be && iguais(le, be) ? re : le);
    } else if (be) {
      // Sumiu da nuvem (apagada em outro aparelho): só fica se foi alterada aqui depois.
      if (!iguais(le, be)) mantidas.push(le);
    } else {
      mantidas.push(le);
      const k = conteudo(le);
      criadasAqui.set(k, [...(criadasAqui.get(k) ?? []), le]);
    }
  }

  for (const re of remoto) {
    if (L.has(re.id)) continue;
    const be = B.get(re.id);
    if (be) {
      // Apagada aqui: só volta se foi alterada em outro aparelho depois.
      if (!iguais(re, be)) mantidas.push(re);
      continue;
    }
    // Criada em outro aparelho. Se este também criou o mesmo lançamento (ex.: o mesmo backup
    // importado nos dois), não duplica.
    const par = criadasAqui.get(conteudo(re));
    if (par?.length) {
      par.pop();
      continue;
    }
    mantidas.push(re);
  }
  return ordenar(mantidas);
}

/** Valor único (configurações, turnos salvos): quem mudou depois da base vence; em empate, o local. */
function escolher<T>(base: T | undefined, local: T, remoto: T, padrao: T): T {
  if (iguais(local, remoto)) return local;
  // Primeira sincronização: uma escala ainda com os valores de fábrica cede à da nuvem.
  if (base === undefined) return iguais(local, padrao) ? remoto : local;
  return iguais(local, base) ? remoto : local;
}

export function mesclar3(base: Instantaneo | null, local: Instantaneo, remoto: Instantaneo): Instantaneo {
  return {
    entries: mesclarEntradas(base?.entries ?? null, local.entries, remoto.entries),
    modelos: escolher(base?.modelos, local.modelos, remoto.modelos, MODELOS_PADRAO),
    config: escolher(base?.config, local.config, remoto.config, configPadrao()),
  };
}
