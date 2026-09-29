import { track } from '../../../lib/analytics';
import { getEscala, substituirDaNuvem } from '../store';
import { iguaisInst, instantaneoDe, mesclar3 } from './merge';
import {
  definirSync,
  formatarRestante,
  getSync,
  janela,
  lerBase,
  limparBase,
  recarregarSync,
  salvarBase,
} from './estado';
import type { Usuario } from './nuvem';

/**
 * Orquestra conectar / sincronizar / sair. O Firebase só é carregado aqui, sob demanda.
 */

/** "conexao": primeira sincronização logo após entrar — não depende da janela de 12 h. */
export type Origem = 'manual' | 'auto' | 'conexao';

export type Resultado =
  | { ok: true; enviou: boolean; recebeu: boolean }
  | { ok: false; motivo: 'janela' | 'offline' | 'sessao' | 'cancelado' | 'ocupado' | 'erro'; mensagem: string };

const falha = (motivo: Extract<Resultado, { ok: false }>['motivo'], mensagem: string): Resultado => ({
  ok: false,
  motivo,
  mensagem,
});

const carregarNuvem = () => import('./nuvem');

/** null = o usuário só fechou a janela de login (não é erro). */
export function mensagemDeErro(e: unknown): string | null {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  const msg = e instanceof Error ? e.message : '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
  if (code === 'auth/popup-blocked') return 'O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.';
  if (code === 'auth/unauthorized-domain') return 'Este endereço ainda não está autorizado no Firebase (Authentication → Configurações → Domínios autorizados).';
  if (code === 'auth/operation-not-allowed') return 'O login com Google não está ativado no Firebase (Authentication → Método de login).';
  if (code === 'auth/network-request-failed' || code === 'unavailable') return 'Sem conexão com a internet. Tente de novo quando a rede voltar.';
  if (code === 'permission-denied') return 'A nuvem recusou o acesso. Saia e entre de novo com a sua conta Google.';
  if (code === 'resource-exhausted') return 'O limite gratuito diário da nuvem foi atingido. Tente de novo amanhã.';
  if (code === 'aborted' || code === 'failed-precondition') return 'Outro aparelho sincronizou ao mesmo tempo. Tente de novo em instantes.';
  if (msg === 'esquema-novo') return 'A nuvem tem dados de uma versão mais nova do app. Atualize o app e tente de novo.';
  if (msg === 'nuvem-invalida') return 'Os dados na nuvem estão ilegíveis. Nada foi alterado; use “Apagar cópia na nuvem” para recomeçar.';
  if (!navigator.onLine) return 'Sem conexão com a internet.';
  return 'Não foi possível sincronizar agora. Tente de novo mais tarde.';
}

/** Erros que não se resolvem sozinhos: o automático para de insistir até o usuário agir. */
function erroPermanente(e: unknown): boolean {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  const msg = e instanceof Error ? e.message : '';
  return (
    code === 'permission-denied' ||
    code === 'auth/unauthorized-domain' ||
    code === 'auth/operation-not-allowed' ||
    msg === 'esquema-novo' ||
    msg === 'nuvem-invalida'
  );
}

/**
 * Só uma aba/janela do app sincroniza por vez (Web Locks). Sem isso, duas abas abertas quando a
 * janela libera fariam duas leituras. Sem suporte ao recurso, segue sem trava.
 */
function comTrava(fn: () => Promise<Resultado>): Promise<Resultado> {
  const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  if (!locks?.request) return fn();
  return locks.request('190a:escala:sync', { ifAvailable: true }, (lock) =>
    lock ? fn() : Promise.resolve(falha('ocupado', 'Outra janela do app já está sincronizando.')),
  );
}

let emAndamento: Promise<Resultado> | null = null;

/**
 * Uma sincronização por janela de 12 h (manual ou automática). Falhas não gastam a janela.
 * Chamadas simultâneas (nesta ou em outra aba) compartilham a mesma execução.
 */
export function sincronizar(origem: Origem): Promise<Resultado> {
  if (!emAndamento) {
    emAndamento = comTrava(() => executar(origem)).finally(() => {
      emAndamento = null;
    });
  }
  return emAndamento;
}

async function executar(origem: Origem): Promise<Resultado> {
  // Outra aba pode ter sincronizado enquanto esta esperava a trava: confere o estado mais recente.
  recarregarSync();
  const s = getSync();
  if (!s.ativo) return falha('erro', 'Conecte uma conta Google primeiro.');
  const agora = Date.now();
  const j = janela(s.ultima, agora);
  if (origem !== 'conexao' && !j.aberta) {
    return falha('janela', `Nova sincronização disponível em ${formatarRestante(j.restanteMs)}.`);
  }
  if (!navigator.onLine) return falha('offline', 'Sem conexão com a internet.');

  definirSync({ ocupado: true });
  try {
    const nuvem = await carregarNuvem();
    const usuario = await nuvem.usuarioAtual();
    if (!usuario) {
      definirSync({ precisaEntrar: true, erro: undefined, tentativa: agora });
      return falha('sessao', 'Sua sessão do Google expirou. Entre novamente.');
    }
    const r = await rodar(nuvem, usuario);
    track('escala_sync', { origem });
    return r;
  } catch (e) {
    const mensagem = mensagemDeErro(e) ?? 'Não foi possível sincronizar agora.';
    definirSync({
      erro: mensagem,
      tentativa: Date.now(),
      falhas: (getSync().falhas ?? 0) + 1,
      permanente: erroPermanente(e) ? true : undefined,
    });
    return falha('erro', mensagem);
  } finally {
    definirSync({ ocupado: false });
  }
}

async function rodar(nuvem: typeof import('./nuvem'), usuario: Usuario): Promise<Resultado> {
  const base = lerBase(usuario.uid);
  const local0 = instantaneoDe(getEscala());

  const { mesclado, gravou } = await nuvem.trocar(usuario.uid, (remoto) => {
    const m = remoto ? mesclar3(base, local0, remoto) : local0;
    return { mesclado: m, gravar: !remoto || !iguaisInst(m, remoto) };
  });

  // O usuário pode ter editado durante a sincronização: refaz a mesclagem com o que há agora.
  const final = mesclar3(local0, instantaneoDe(getEscala()), mesclado);
  const recebeu = substituirDaNuvem(final);
  salvarBase(usuario.uid, mesclado);

  definirSync({
    uid: usuario.uid,
    email: usuario.email,
    nome: usuario.nome,
    ultima: Date.now(),
    tentativa: undefined,
    falhas: undefined,
    permanente: undefined,
    erro: undefined,
    precisaEntrar: undefined,
  });
  return { ok: true, enviou: gravou, recebeu };
}

/** Abre o login do Google e, conectado, faz a primeira sincronização. */
export async function conectar(): Promise<Resultado> {
  if (!navigator.onLine) return falha('offline', 'Sem conexão com a internet.');
  definirSync({ ocupado: true, erro: undefined });
  try {
    const nuvem = await carregarNuvem();
    const u = await nuvem.entrar();
    const anterior = getSync();
    const mesma = anterior.uid === u.uid;
    // Entrar de novo (ou com outra conta) começa sem "base": a primeira sincronização só junta os
    // dois lados e nunca apaga nada. Só se mantém a base quando é a mesma conta que continuava
    // conectada e apenas a sessão expirou.
    if (!anterior.ativo || !mesma) limparBase();
    definirSync({
      ativo: true,
      auto: mesma ? anterior.auto : true,
      uid: u.uid,
      email: u.email,
      nome: u.nome,
      ultima: undefined,
      tentativa: undefined,
      falhas: undefined,
      permanente: undefined,
      erro: undefined,
      precisaEntrar: undefined,
    });
  } catch (e) {
    const mensagem = mensagemDeErro(e);
    if (mensagem == null) return falha('cancelado', '');
    definirSync({ erro: mensagem });
    return falha('erro', mensagem);
  } finally {
    definirSync({ ocupado: false });
  }
  return sincronizar('conexao');
}

/** Desconecta a conta neste aparelho. A escala local e a cópia na nuvem ficam como estão. */
export async function desconectar(): Promise<void> {
  try {
    await (await carregarNuvem()).sair();
  } catch {
    /* sem rede: o app deixa de sincronizar do mesmo jeito */
  }
  // Sem conta não há base: o que for apagado ou mudado enquanto está desconectado não pode ser
  // interpretado, ao entrar de novo, como exclusão a propagar para a nuvem.
  limparBase();
  definirSync({
    ativo: false,
    email: undefined,
    nome: undefined,
    ultima: undefined,
    erro: undefined,
    precisaEntrar: undefined,
    tentativa: undefined,
    falhas: undefined,
    permanente: undefined,
  });
}

/** Remove a cópia da nuvem (a escala deste aparelho não é tocada). */
export async function apagarNuvem(): Promise<Resultado> {
  const uid = getSync().uid;
  if (!uid) return falha('erro', 'Conecte uma conta Google primeiro.');
  if (!navigator.onLine) return falha('offline', 'Sem conexão com a internet.');
  definirSync({ ocupado: true });
  try {
    await (await carregarNuvem()).apagar(uid);
    limparBase();
    // Sem cópia na nuvem, o automático fica desligado para não recriá-la sem você pedir.
    definirSync({ auto: false, ultima: undefined, erro: undefined });
    return { ok: true, enviou: false, recebeu: false };
  } catch (e) {
    const mensagem = mensagemDeErro(e) ?? 'Não foi possível apagar agora.';
    definirSync({ erro: mensagem });
    return falha('erro', mensagem);
  } finally {
    definirSync({ ocupado: false });
  }
}
