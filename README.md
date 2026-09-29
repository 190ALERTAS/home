# 190 ALERTAS — versão 5

Ferramentas de apoio operacional para a Brigada Militar (PMRS), feitas **de praça para praça**:

- **Release** de ocorrência no padrão do batalhão (título com 🚔, 🦅 ou ⚡), pronto para o WhatsApp;
- **Alerta de Veículo** (furto/roubo) em segundos;
- **Minha Escala**: turnos, horas, extras, férias, EDT/RSP, gerador de escala e relatório em PDF;
- **Croqui digital** com o traçado real das ruas do local (OpenStreetMap, em estilo plano) ou em branco, em escala real, com exportação em imagem;
- **Calculadora TAF** (NI nº 3.3/EMBM/2023, Anexo “E”).

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

## Sincronização da escala (opcional)

*Minha escala → ⚙ Configurações → Conexão e sincronização.* O usuário entra com o Google e a escala (lançamentos, turnos salvos, carga horária e identificação do PDF) é mantida igual em todos os aparelhos.

- **Uma sincronização por janela de 12 h**, manual ou automática (ao abrir o app). Cada sincronização faz **1 leitura e, só se houver diferença, 1 gravação**, numa transação do Firestore. Falhas não gastam a janela. O indicador no topo da escala mostra se está em dia e quanto falta para a próxima.
- **Mesclagem em 3 vias**: cada aparelho guarda a última versão sincronizada (`190a:escala:sync-base`). Comparando *base × local × nuvem* dá para propagar exclusões e edições sem apagar nada por engano; na primeira sincronização o resultado é sempre a união dos dois lados. Lógica pura em `src/features/escala/sync/merge.ts` (com testes).
- **Firebase sob demanda**: o SDK (Auth + Firestore *lite*) só é baixado quando a pessoa entra ou sincroniza (`sync/nuvem.ts`); quem não usa não paga o peso.
- **Dados na nuvem**: um único documento por conta em `users/{uid}/escala/dados`. Regras do Firestore:

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

- Cada aparelho faz **no máximo 2 sincronizações por dia** → até 2 leituras e 2 gravações (a gravação só acontece se algo mudou). Entrar na conta faz 1 sincronização a mais, sempre iniciada pelo usuário.
- Travas: janela de 12 h (manual e automática); só uma aba sincroniza por vez (Web Locks); cliques repetidos compartilham a mesma execução; falhas recuam (15 min → 1 h → 4 h → 12 h); erros permanentes (permissão, dados ilegíveis, app desatualizado) não são repetidos sozinhos; sem internet nem tenta; a transação tem no máximo 2 tentativas.
- Ordem de grandeza no pior caso (todos com 2 aparelhos, editando nos dois todo dia): o teto de **gravações** comporta ~5 mil pessoas e o de **leituras** ~12 mil. Em uso real o teto sobe, porque só grava quem mudou algo. Se um dia chegar perto, comprimir o documento (reduz armazenamento e saída de dados) ou migrar para o plano Blaze com orçamento e alertas são os próximos passos.
- `sync/motor.test.ts` simula dias de uso contínuo, cliques repetidos, duas abas e falhas, e confere esses limites.

Configuração necessária no console do Firebase (projeto `alertas-190`): **Authentication → Método de login → Google** ativado e **Authentication → Configurações → Domínios autorizados** com `190alertas.github.io` (e `localhost` para desenvolvimento). Mantenha o projeto no plano **Spark** (sem faturamento) para que o uso nunca gere cobrança.

## Dados da Escala (migração da versão 4)

A versão 4 guardava a escala na chave `registros` do `localStorage`. Na primeira abertura da versão 5:

1. os registros são convertidos para o novo modelo (`190a:escala:v2`), **mantendo exatamente as horas registradas**;
2. uma cópia intacta dos dados antigos é guardada em `190a:escala:backup-v1`;
3. a chave `registros` continua existindo e passa a ser atualizada no formato antigo (se um dia for preciso
   voltar à versão anterior, nada se perde; lançamentos feitos na versão antiga são incorporados de volta).

O arquivo `registros.json` exportado pela versão 4 também pode ser importado em *Minha Escala → ⋯ → Importar backup*.

Carga horária padrão: **177h em meses de 31 dias** e **170h em meses de 30 dias** (fevereiro: 160h/165h,
configurável). Férias e afastamentos descontam a carga proporcionalmente; cada EDT/RSP desconta 6h
(configurável). O turno conta no mês em que começa.

## Privacidade

Nada do que é digitado nas ferramentas é enviado a servidores do projeto. Rascunhos, escala e croquis ficam somente no
aparelho. A página Sugestões envia a mensagem (nome, e-mail, tipo e texto) por e-mail ao desenvolvedor via Web3Forms. O croqui usa o mapa e o traçado das ruas do OpenStreetMap (Overpass API); a busca de endereços usa o Nominatim.
Estatísticas anônimas de uso via Google Analytics. Veja os Termos de Uso no próprio app (`/home/termos`).
