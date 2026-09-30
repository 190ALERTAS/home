import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  initializeAuth,
  signInWithPopup,
  signOut,
  type Auth,
} from 'firebase/auth';
// Versão "lite" do Firestore: só leitura/gravação pontual (sem conexão aberta, sem cache offline).
// É tudo o que uma sincronização a cada 12 h precisa e pesa bem menos.
import { deleteDoc, doc, getFirestore, runTransaction, type Firestore } from 'firebase/firestore/lite';
import { normalizarV2 } from '../migrate';
import type { Instantaneo } from './merge';

/**
 * Tudo que fala com o Firebase fica neste arquivo, carregado sob demanda (import dinâmico).
 * Quem nunca usa a sincronização não baixa nada do Firebase.
 *
 * A chave abaixo identifica o projeto no navegador; não é segredo. Quem protege os dados são
 * as regras do Firestore (cada conta só lê/grava em users/{uid}).
 */
const firebaseConfig = {
  apiKey: 'AIzaSyAQKquD6QXr9Pct094eTM2wheuPKP_hXTY',
  authDomain: 'alertas-190.firebaseapp.com',
  projectId: 'alertas-190',
  storageBucket: 'alertas-190.firebasestorage.app',
  messagingSenderId: '680292641574',
  appId: '1:680292641574:web:fb56fe4bd83f6dd76cefe7',
};

/** Versão do formato do documento na nuvem. Um app mais antigo não sobrescreve um formato mais novo. */
const ESQUEMA = 1;

export interface Usuario {
  uid: string;
  email?: string;
  nome?: string;
}

let cache: { auth: Auth; db: Firestore } | null = null;

function iniciar() {
  if (!cache) {
    const app = initializeApp(firebaseConfig);
    cache = {
      auth: initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      }),
      db: getFirestore(app),
    };
  }
  return cache;
}

const paraUsuario = (u: { uid: string; email: string | null; displayName: string | null }): Usuario => ({
  uid: u.uid,
  email: u.email ?? undefined,
  nome: u.displayName ?? undefined,
});

/** Quanto esperar o SDK restaurar a sessão. Passou disso é rede lenta/bloqueada, não "sem sessão". */
const ESPERA_SESSAO_MS = 20_000;

/**
 * Quem está conectado (a sessão é restaurada do armazenamento do navegador), ou null.
 *
 * Atenção: ao iniciar, o SDK recarrega o usuário na rede e, se isso falhar com qualquer erro que não
 * seja "sem rede" (ex.: 429, 5xx, resposta de proxy), ele apaga a sessão guardada. Quem chama não
 * tem como distinguir isso de uma sessão realmente encerrada — por isso o motor registra o motivo
 * e revalida (ver motor.ts). Se a restauração demorar demais, lança "auth-timeout" em vez de null.
 */
export async function usuarioAtual(): Promise<Usuario | null> {
  const { auth } = iniciar();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      auth.authStateReady(),
      new Promise<never>((_, rejeitar) => {
        timer = setTimeout(() => rejeitar(new Error('auth-timeout')), ESPERA_SESSAO_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  return auth.currentUser ? paraUsuario(auth.currentUser) : null;
}

export async function entrar(): Promise<Usuario> {
  const { auth } = iniciar();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return paraUsuario(cred.user);
}

export async function sair(): Promise<void> {
  await signOut(iniciar().auth);
}

const refDe = (db: Firestore, uid: string) => doc(db, 'users', uid, 'escala', 'dados');

function lerDocumento(data: Record<string, unknown>): Instantaneo {
  if (typeof data.esquema === 'number' && data.esquema > ESQUEMA) throw new Error('esquema-novo');
  const db = normalizarV2({ version: 2, entries: data.entries, modelos: data.modelos, config: data.config });
  if (!db) throw new Error('nuvem-invalida');
  return { entries: db.entries, modelos: db.modelos, config: db.config };
}

function paraDocumento(i: Instantaneo) {
  // O ciclo por JSON descarta campos "undefined", que o Firestore não aceita.
  return JSON.parse(
    JSON.stringify({ esquema: ESQUEMA, atualizadoEm: new Date().toISOString(), ...i }),
  ) as Record<string, unknown>;
}

/**
 * Uma leitura + (se houver diferença) uma gravação, numa transação: dois aparelhos
 * sincronizando ao mesmo tempo não se atropelam. `decidir` pode ser chamada de novo se a
 * transação for repetida — por isso deve ser uma função pura.
 */
export async function trocar(
  uid: string,
  decidir: (remoto: Instantaneo | null) => { mesclado: Instantaneo; gravar: boolean },
): Promise<{ mesclado: Instantaneo; gravou: boolean; existia: boolean }> {
  const { db } = iniciar();
  const ref = refDe(db, uid);
  return runTransaction(
    db,
    async (tx) => {
      const snap = await tx.get(ref);
      const remoto = snap.exists() ? lerDocumento(snap.data()) : null;
      const { mesclado, gravar } = decidir(remoto);
      if (gravar) tx.set(ref, paraDocumento(mesclado));
      return { mesclado, gravou: gravar, existia: remoto != null };
    },
    // Cada repetição da transação lê o documento de novo (e cobra outra leitura): no máximo 2 tentativas.
    { maxAttempts: 2 },
  );
}

export async function apagar(uid: string): Promise<void> {
  const { db } = iniciar();
  await deleteDoc(refDe(db, uid));
}
