import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CircleAlert, CircleCheck, MessageSquarePlus, MessageSquareText, Send, WifiOff } from 'lucide-react';
import { AutoTextarea, Card, Field, PageHead, Seg, gap } from '../../components/ui';
import { usePersistentState } from '../../lib/storage';
import { useOnline } from '../../lib/pwa';
import { linkProps } from '../../lib/router';
import { track } from '../../lib/analytics';
import { APP_VERSION } from '../../app/nav';
import './sugestoes.css';

/*
 * Caixa de feedback: a mensagem vai por e-mail ao desenvolvedor pelo Web3Forms.
 * A chave de acesso é pública por natureza (só permite enviar para o e-mail
 * cadastrado nela), por isso pode ficar no código do site.
 */
const WEB3FORMS = 'https://api.web3forms.com/submit';
const ACCESS_KEY = '20dcc795-6f06-4c90-8465-2a95efccaf12';

const K_RASCUNHO = '190a:sugestoes:rascunho';
const TRINTA_DIAS = 30 * 24 * 60 * 60 * 1000;
const MAX_MENSAGEM = 4000;

const TIPOS = ['Sugestão', 'Problema', 'Elogio'] as const;
type Tipo = (typeof TIPOS)[number];

interface Rascunho {
  tipo: Tipo;
  nome: string;
  email: string;
  mensagem: string;
}

type Campo = 'nome' | 'email' | 'mensagem';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SEM_REDE = 'Sem conexão com a internet. A mensagem continua salva neste aparelho; envie quando a conexão voltar.';

function validar(r: Rascunho): Partial<Record<Campo, string>> {
  const erros: Partial<Record<Campo, string>> = {};
  if (!r.nome.trim()) erros.nome = 'Informe seu nome.';
  if (!r.email.trim()) erros.email = 'Informe seu e-mail para receber a resposta.';
  else if (!EMAIL.test(r.email.trim())) erros.email = 'Confira o e-mail: parece incompleto.';
  if (!r.mensagem.trim()) erros.mensagem = 'Escreva sua mensagem.';
  return erros;
}

const PLACEHOLDER: Record<Tipo, string> = {
  Sugestão: 'Conte sua ideia: um novo modelo de mensagem, um ajuste em alguma ferramenta…',
  Problema: 'O que aconteceu? Em qual tela? Se possível, diga o modelo do celular.',
  Elogio: 'Conte o que está funcionando bem para você.',
};

export default function SugestoesPage() {
  const online = useOnline();
  const ids = { nome: useId(), email: useId(), mensagem: useId() };
  const idErro = (c: Campo) => `${ids[c]}-erro`;
  const tituloOk = useRef<HTMLHeadingElement>(null);
  const [rascunho, setRascunho] = usePersistentState<Rascunho>(
    K_RASCUNHO,
    { tipo: 'Sugestão', nome: '', email: '', mensagem: '' },
    { ttlMs: TRINTA_DIAS },
  );
  const [tentou, setTentou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState('');
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);
  const [robo, setRobo] = useState(false);

  const erros = tentou ? validar(rascunho) : {};
  const descricao = (c: Campo) => (erros[c] ? idErro(c) : undefined);

  // A conexão voltou: o aviso de "sem internet" do último envio não vale mais.
  useEffect(() => {
    if (online) setFalha((f) => (f === SEM_REDE ? '' : f));
  }, [online]);

  // Enviada: leva o foco (e o leitor de tela) para a confirmação.
  useEffect(() => {
    if (enviadoPara) tituloOk.current?.focus();
  }, [enviadoPara]);

  const set = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) => setRascunho((r) => ({ ...r, [k]: v }));

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setTentou(true);
    const invalidos = validar(rascunho);
    const primeiro = (['nome', 'email', 'mensagem'] as const).find((c) => invalidos[c]);
    if (primeiro) {
      document.getElementById(ids[primeiro])?.focus();
      return;
    }
    if (!navigator.onLine) {
      setFalha(SEM_REDE);
      return;
    }

    const nome = rascunho.nome.trim();
    const email = rascunho.email.trim();
    setFalha('');
    setEnviando(true);
    try {
      // Campo-isca marcado: é robô. Finge que enviou e não gasta a cota do serviço.
      if (!robo) {
        const ctrl = new AbortController();
        const prazo = window.setTimeout(() => ctrl.abort(), 20_000);
        try {
          const resp = await fetch(WEB3FORMS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              access_key: ACCESS_KEY,
              subject: `190 ALERTAS · ${rascunho.tipo} de ${nome}`,
              from_name: '190 ALERTAS',
              name: nome,
              email,
              message: rascunho.mensagem.trim(),
              tipo: rascunho.tipo,
              app: `190 ALERTAS v${APP_VERSION}`,
            }),
            signal: ctrl.signal,
          });
          const json = (await resp.json().catch(() => null)) as { success?: boolean; message?: string } | null;
          if (!resp.ok || !json?.success) {
            throw new Error(
              resp.status === 429
                ? 'Muitas mensagens em pouco tempo. Aguarde alguns minutos e tente de novo.'
                : `O serviço de envio recusou a mensagem${json?.message ? ` (${json.message})` : ''}. Tente de novo mais tarde.`,
            );
          }
        } finally {
          window.clearTimeout(prazo);
        }
      }
      track('sugestao_enviada', { tipo: rascunho.tipo });
      setEnviadoPara(email);
      setTentou(false);
      // Mantém nome e e-mail para a próxima mensagem; a mensagem enviada sai do rascunho.
      setRascunho((r) => ({ ...r, tipo: 'Sugestão', mensagem: '' }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg =
        err instanceof Error && !(err instanceof TypeError) && err.name !== 'AbortError'
          ? err.message
          : 'Não foi possível falar com o serviço de envio. Verifique a conexão e tente de novo.';
      setFalha(`${msg} O texto continua salvo aqui.`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="page sugestoes">
      <PageHead icon={MessageSquareText} title="Sugestões" subtitle="Ideias, correções e novos modelos de mensagem são bem-vindos." />

      {enviadoPara ? (
        <section className="card pad sugestoes-ok" role="status">
          <span className="sugestoes-ok-icone" aria-hidden>
            <CircleCheck />
          </span>
          <h2 ref={tituloOk} tabIndex={-1}>
            Mensagem enviada
          </h2>
          <p>
            Obrigado pela contribuição! Se for preciso, a resposta chega em <b>{enviadoPara}</b>.
          </p>
          <button type="button" className="btn" onClick={() => setEnviadoPara(null)}>
            <MessageSquarePlus /> Enviar outra mensagem
          </button>
        </section>
      ) : (
        <Card title="Caixa de feedback">
          <form className="stack sugestoes-form" style={gap(16)} onSubmit={enviar} noValidate aria-label="Caixa de feedback">
            {!online && (
              <div className="callout amber">
                <WifiOff aria-hidden />
                <div>Sem conexão. Pode escrever agora: a mensagem fica salva neste aparelho até você enviar.</div>
              </div>
            )}

            <Field label="Tipo">
              <Seg<Tipo>
                className="sugestoes-tipo"
                ariaLabel="Tipo da mensagem"
                value={rascunho.tipo}
                onChange={(tipo) => set('tipo', tipo)}
                options={TIPOS.map((t) => ({ value: t, label: t }))}
              />
            </Field>

            <div className="sugestoes-contato">
              <Field label="Nome" required htmlFor={ids.nome} invalid={!!erros.nome} hint={erros.nome} hintId={idErro('nome')}>
                <input
                  id={ids.nome}
                  name="name"
                  className="input"
                  value={rascunho.nome}
                  placeholder="Sd Fulano de Tal"
                  autoComplete="name"
                  autoCapitalize="words"
                  maxLength={120}
                  required
                  aria-invalid={!!erros.nome}
                  aria-describedby={descricao('nome')}
                  onChange={(e) => set('nome', e.target.value)}
                />
              </Field>
              <Field label="E-mail" required htmlFor={ids.email} invalid={!!erros.email} hint={erros.email} hintId={idErro('email')}>
                <input
                  id={ids.email}
                  name="email"
                  type="email"
                  className="input"
                  value={rascunho.email}
                  placeholder="nome@exemplo.com"
                  autoComplete="email"
                  autoCapitalize="off"
                  spellCheck={false}
                  inputMode="email"
                  maxLength={160}
                  required
                  aria-invalid={!!erros.email}
                  aria-describedby={descricao('email')}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
            </div>

            <Field
              label="Mensagem"
              required
              htmlFor={ids.mensagem}
              invalid={!!erros.mensagem}
              hint={erros.mensagem}
              hintId={idErro('mensagem')}
              aside={
                <span className="counter">
                  {rascunho.mensagem.length}/{MAX_MENSAGEM}
                </span>
              }
            >
              <AutoTextarea
                id={ids.mensagem}
                name="message"
                value={rascunho.mensagem}
                minRows={5}
                maxLength={MAX_MENSAGEM}
                placeholder={PLACEHOLDER[rascunho.tipo]}
                required
                aria-invalid={!!erros.mensagem}
                aria-describedby={descricao('mensagem')}
                onChange={(e) => set('mensagem', e.target.value)}
              />
            </Field>

            {/* Campo-isca contra robôs (Web3Forms): pessoas não veem nem alcançam pelo teclado. */}
            <input
              type="checkbox"
              name="botcheck"
              className="sugestoes-isca"
              tabIndex={-1}
              aria-hidden
              autoComplete="off"
              checked={robo}
              onChange={(e) => setRobo(e.target.checked)}
            />

            {falha && (
              <div className="callout red" role="alert">
                <CircleAlert aria-hidden />
                <div>{falha}</div>
              </div>
            )}

            <button type="submit" className="btn primary block lg" disabled={enviando} aria-busy={enviando}>
              {enviando ? (
                <>
                  <span className="spinner" aria-hidden /> Enviando…
                </>
              ) : (
                <>
                  <Send aria-hidden /> Enviar mensagem
                </>
              )}
            </button>

            <p className="subtle sugestoes-nota">
              A mensagem vai por e-mail ao desenvolvedor do 190 ALERTAS. Seu nome e e-mail servem só para a resposta.{' '}
              <a {...linkProps('termos')}>Privacidade</a>
            </p>
          </form>
        </Card>
      )}
    </div>
  );
}
