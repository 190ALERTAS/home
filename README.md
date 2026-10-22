# 190 ALERTAS — versão 5

Ferramentas de apoio operacional para a Brigada Militar (PMRS), feitas **de praça para praça**:

- **Minha escala** (produto principal): lançamento em duas seções, **Escala** (horários de serviço ordinário,
  extraordinário/GSE ou sobreaviso) e **Indisponibilidade** (férias, afastamento, convalescença, EDT/RSP), carga
  horária pela NI ADM 033.2, gerador de escala, relatório em PDF e sincronização opcional entre aparelhos;
- **Release** de ocorrência no padrão do batalhão (título com 🚔, 🦅 ou ⚡), pronto para o WhatsApp;
- **Calculadora TAF** (NI nº 3.3/EMBM/2023, Anexo “E”);
- **Croqui digital** com o traçado real das ruas do local (OpenStreetMap, em estilo plano) ou em branco, em escala real, com exportação em imagem;
- **Alerta de Veículo** (furto/roubo) em segundos.

No celular, a barra inferior traz, nessa ordem, Início, Release, Escala, TAF, Croqui, Alerta e Mais (Sugestões,
Termos, tema e notas de atualização).

Publicado em **https://190alertas.github.io/home/** como PWA (instalável e funciona sem internet).

Idealizado e criado por **Sd Ferrão — 32º BPM**.

---

## Tecnologia

- [TypeScript](https://www.typescriptlang.org/) + [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
- PWA com [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox): cache offline e aviso de nova versão
- [Leaflet](https://leafletjs.com/) (mapa do croqui), [jsPDF](https://github.com/parallax/jsPDF) (PDF da escala), [Lucide](https://lucide.dev/) (ícones)
- Fontes [IBM Plex Sans e IBM Plex Mono](https://www.ibm.com/plex/) (empacotadas com o app, funcionam offline)
- Testes com [Vitest](https://vitest.dev/)

Não há servidor próprio: tudo roda no navegador e os dados ficam no aparelho do usuário. A única exceção é a **sincronização opcional da Minha escala** (login com Google + Firestore, plano gratuito) — veja a seção “Sincronização da escala”.

## Desenvolvimento

Requer Node.js 22 ou mais novo.

```bash
npm install
npm run dev        # http://localhost:5173/home/
npm test           # testes unitários
npm run build      # gera o site em dist/ (typecheck + build + páginas das rotas)
npm run preview    # serve o build localmente
```

Estrutura principal:

```
src/
  app/            casco do app (navegação, tema, atualização do PWA)
  components/     componentes de interface reutilizáveis
  features/
    release/      formatador do release (format.ts), modelo de referência (Formato.txt) + tela
    veiculo/      alerta de veículo
    escala/       modelo, cálculo, migração, gerador, PDF e telas da escala
    croqui/       editor vetorial, símbolos, captura do mapa e exportação
    taf/          tabela e cálculo do TAF
    inicio/, institucional/
  lib/            utilitários (datas, armazenamento, roteador, compartilhamento)
  styles/         design tokens (cores dos temas escuro/claro) e estilos globais
scripts/          pós-build (páginas .html para os links diretos)
public/           ícones, imagem de compartilhamento e o sw.js antigo (desativador)
```

## Identidade visual

- Visual sóbrio e técnico: grafite azulado, vermelho institucional, tipografia IBM Plex (texto) e
  IBM Plex Mono (datas, horas, números e rótulos).
- Emblema: escudo geométrico com o número 190, desenhado em vetor em `src/components/Emblema.tsx`.
  Os ícones do PWA, o `favicon.ico`, `public/icons/emblema.svg` e a imagem de compartilhamento
  (`public/og.jpg`) são gerados a partir dele. O emblema também aparece no PDF da escala e na imagem do croqui.
- As cores ficam em `src/styles/tokens.css` (tema escuro e claro).
- Datas e horas usam seletores próprios (`src/components/pickers.tsx`), que abrem numa folha/janela
  sempre inteira na tela — os seletores nativos do navegador podiam abrir fora da tela.

## Padrão do release

O texto gerado segue **exatamente** o modelo `src/features/release/Formato.txt` (rótulos em negrito do
WhatsApp, linhas em branco nas mesmas posições e todos os campos sempre presentes). Um teste automatizado
compara a saída com esse arquivo, caractere por caractere.

## Publicação (GitHub Pages)

O deploy é feito pelo GitHub Actions (`.github/workflows/deploy.yml`) a cada push na branch `main`:
testes → build → publicação.

**Configuração necessária (uma única vez):** em *Settings → Pages → Build and deployment → Source*,
selecione **GitHub Actions**. Sem isso o GitHub Pages continuaria servindo os arquivos-fonte da branch.

Detalhes importantes da publicação:

- O site continua em `https://190alertas.github.io/home/` e os endereços antigos continuam funcionando
  (`/home/escala`, `/home/release`, `/home/veiculos`, `/home/croqui`, `/home/taf`, `/home/termos`;
  `/home/feedback` → Sugestões; `/home/assuntos` → Início).
- O manifesto mantém o mesmo `id` (`190ALERTAS`): quem já instalou o app recebe a versão nova, sem duplicar.
- O service worker antigo (`/home/js/sw.js`) foi substituído por um desativador que apaga o cache antigo.

## Minha escala e a NI ADM 033.2

A Nota de Instrução Administrativa nº 033.2 (EMBM) regula as escalas de serviço. O app segue estes pontos:

- **Um dia é escala ou indisponibilidade, nunca os dois.** Lançar um turno num dia com indisponibilidade (ou o
  contrário) pede confirmação e substitui. Dias antigos que já tinham os dois juntos não são alterados; a folha do
  dia só mostra um aviso.
- **Nada é gravado antes do "Lançar"**: atalhos de horário e tipos de indisponibilidade só selecionam.
- **Carga horária**: 160h/165h/171h/177h para meses de 28/29/30/31 dias (item 3.d.1). Férias e afastamentos
  descontam proporcionalmente, cerca de 5h42 por dia (o fator 5,7 do item 3.e.1.a). Cada EDT/RSP desconta 6h
  (configurável).
- **Serviço extraordinário (GSE)**: contado à parte da carga ordinária, com aviso acima de 40h no mês (item 3.f.1.b).
- **Sobreaviso**: conta 1/3 das horas (item 3.d.3).
- **Convalescença** (dispensa médica domiciliar): desconta como afastamento. Com mais de 1 dia no mês e GSE lançado,
  aparece o aviso do item 3.e.2.c.
- **Gerador**: inclui o padrão 6x18 (1:3), o preferencial da NI, além de 12x36, 12x24/12x48, 24x72, 24x48 e dias da semana.

**Compatibilidade dos dados.** O formato não mudou de versão (`version: 2` no aparelho e `esquema: 1` na nuvem). O
tipo de serviço é um campo opcional do turno (`servico: 'gse' | 'sobreaviso'`; sem ele, o turno é ordinário, como
todos os lançados até a 5.1). A convalescença é um afastamento com `motivo: 'convalescenca'`, e não um tipo novo: a
versão 5.1 descarta tipos desconhecidos e, ao sincronizar, apagaria o lançamento nos outros aparelhos. Os campos novos
são preservados por aparelhos ainda na 5.1, que só não aplicam as regras novas.

## Sincronização da escala (opcional)

*Minha escala → ⚙ Configurações → Conexão e sincronização.* O usuário entra com o Google e a escala (lançamentos, turnos salvos, carga horária e identificação do PDF) é mantida igual em todos os aparelhos.

- **Conferir é barato**: uma consulta `where('atualizadoEm', '!=', carimbo)` na coleção `users/{uid}/escala`, em que o
  carimbo é o `atualizadoEm` da última sincronização (guardado na base do aparelho). Custa **1 leitura** e não baixa
  nada quando o documento não mudou; se mudou, a própria consulta já traz o documento. Toda gravação troca
  `atualizadoEm`, inclusive as feitas por aparelhos ainda na versão 5.1.
- **Quando confere** (automático ligado): ao abrir o app, ao voltar para ele (se a última conferência tem 3 min ou
  mais), ao abrir a tela da escala, de hora em hora com o app visível e quando a internet volta. É o que faz o celular
  mostrar, ao abrir, o que acabou de ser lançado no computador.
- **Quando envia**: 10 s depois da última alteração (uma rajada de lançamentos vira uma gravação só) e na hora em que o
  app vai para segundo plano. Enviar é uma transação do Firestore (1 leitura + 1 gravação, só se houver diferença).
  Com o automático desligado, nada sai sozinho, e por isso "Apagar cópia na nuvem" não recria a cópia.
- **"Sincronizar agora"** fica sempre liberado. Cliques repetidos e outras abas abertas compartilham a mesma execução.
- **Mesclagem em 3 vias**: cada aparelho guarda a última versão sincronizada (`190a:escala:sync-base`, agora com o
  carimbo). Comparando *base × local × nuvem* dá para propagar exclusões e edições sem apagar nada por engano; na
  primeira sincronização o resultado é sempre a união dos dois lados. Lógica pura em
  `src/features/escala/sync/merge.ts` (com testes). Bases gravadas pela 5.1 (sem carimbo) passam uma vez pela transação.
- **Plano B**: se a consulta for recusada por falta de índice ou por regras que só permitam ler o documento, e a
  transação funcionar, o aparelho passa a sincronizar só pela transação (`consultaOff`), como na versão 5.1.
- **Firebase sob demanda**: o SDK (Auth + Firestore *lite*) só é baixado quando a pessoa entra ou sincroniza (`sync/nuvem.ts`); quem não usa não paga o peso.
- **Dados na nuvem**: um único documento por conta em `users/{uid}/escala/dados`. Regras do Firestore (o `read` cobre
  a leitura do documento e a consulta na coleção):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Consumo no plano gratuito** (Spark: 50 mil leituras, 20 mil gravações e 20 mil exclusões por dia; 1 GiB armazenado; 10 GiB/mês de saída):

- Celular típico (5 a 10 aberturas por dia, algumas sessões de lançamento): **até ~20 leituras por dia**. Grava só
  quando algo mudou. O teste `sync/motor.test.ts` simula um dia assim e confere o teto.
- A saída de dados cai em relação à 5.1: conferir sem mudança não baixa o documento, que só trafega quando mudou.
- Ordem de grandeza: o teto de leituras comporta ~2,5 mil pessoas usando todo dia. As gravações dependem de quantas
  sessões de lançamento cada um faz. Perto do teto, os próximos passos são espaçar a conferência ao voltar ao app
  (`INTERVALO_CHECAGEM_MS`) ou migrar para o plano Blaze com orçamento e alertas.
- Travas: só uma aba sincroniza por vez (Web Locks); falhas recuam (15 min → 1 h → 4 h → 12 h) no automático; erros
  permanentes (permissão, dados ilegíveis, app desatualizado) não são repetidos sozinhos; sem internet nem tenta; a
  transação tem no máximo 2 tentativas.

**Sessão do Google ("Sessão expirada")**. Ao iniciar, o SDK do Firebase recarrega o usuário na rede e, se isso falhar com qualquer erro que não seja "sem rede" (ex.: 429, 5xx, resposta de proxy/firewall), **apaga a sessão guardada** — e o app não tem como distinguir isso de um logout real (`nuvem.ts → usuarioAtual`). Por isso:

- o motor registra **quando e por quê** (`precisaEntrarEm`, `motivoSessao`: `sem-sessao` ou o código do erro) e o painel mostra uma nota explicando, com o motivo técnico para diagnóstico;
- erros de token recusado (`auth/user-token-expired`, `auth/user-disabled`, `unauthenticated`…) contam como sessão perdida, não como "falha";
- o aviso **se cura sozinho**: ao abrir o painel e no ciclo do automático (`revalidarSessao`, sem ler a nuvem) a sessão é conferida de novo, e só é pedido novo login se ela realmente não voltou (nunca com outra conta Google);
- a leitura da sessão tem limite de 20 s: rede lenta/bloqueada vira falha transitória (com recuo), não "sessão expirada".

Configuração necessária no console do Firebase (projeto `alertas-190`): **Authentication → Método de login → Google** ativado e **Authentication → Configurações → Domínios autorizados** com `190alertas.github.io` (e `localhost` para desenvolvimento). Mantenha o projeto no plano **Spark** (sem faturamento) para que o uso nunca gere cobrança.

## Dados da Escala (migração da versão 4)

A versão 4 guardava a escala na chave `registros` do `localStorage`. Na primeira abertura da versão 5:

1. os registros são convertidos para o novo modelo (`190a:escala:v2`), **mantendo exatamente as horas registradas**;
2. uma cópia intacta dos dados antigos é guardada em `190a:escala:backup-v1`;
3. a chave `registros` continua existindo e passa a ser atualizada no formato antigo (se um dia for preciso
   voltar à versão anterior, nada se perde; lançamentos feitos na versão antiga são incorporados de volta).

O arquivo `registros.json` exportado pela versão 4 também pode ser importado em *Minha Escala → ⋯ → Importar backup*.

Carga horária padrão: **177h em meses de 31 dias** e **171h em meses de 30 dias** (fevereiro: 160h/165h,
configurável). Férias e afastamentos descontam a carga proporcionalmente; cada EDT/RSP desconta 6h
(configurável). O turno conta no mês em que começa. Veja também "Minha escala e a NI ADM 033.2".

Até a versão 5.1.0 o mês de 30 dias era 170h. Como o valor fica gravado no aparelho (e na nuvem), quem nunca o
alterou é levado para 171h automaticamente, **uma única vez**: a configuração carrega o carimbo `padraoRev`
(`model.ts` → `atualizarPadrao`, aplicado em `normalizarV2`, portanto igual na leitura local, da nuvem e da base de
sincronização — a migração nunca aparece como "alteração" a mesclar). Valores personalizados são mantidos.

## Privacidade

Nada do que é digitado nas ferramentas é enviado a servidores do projeto. Rascunhos, escala e croquis ficam somente no
aparelho. A página Sugestões envia a mensagem (nome, e-mail, tipo e texto) por e-mail ao desenvolvedor via Web3Forms. O croqui usa o mapa e o traçado das ruas do OpenStreetMap (Overpass API); a busca de endereços usa o Nominatim.
Estatísticas anônimas de uso via Google Analytics. Veja os Termos de Uso no próprio app (`/home/termos`).
