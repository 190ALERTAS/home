# 190 🚨 ALERTAS — versão 5

Ferramentas de apoio operacional para a Brigada Militar (PMRS), feitas **de praça para praça**:

- **Release** de ocorrência no padrão (título com 🚔, 🦅 ou ⚡), pronto para o WhatsApp;
- **Alerta de Veículo** (furto/roubo) em segundos;
- **Minha Escala**: turnos, horas, extras, férias, EDT/RSP, gerador de escala e relatório em PDF;
- **Croqui digital** sobre mapa/satélite em escala real ou em branco, com exportação em imagem;
- **Calculadora TAF** (NI nº 3.3/EMBM/2023, Anexo “E”).

Publicado em **https://190alertas.github.io/home/** como PWA (instalável e funciona sem internet).

Idealizado e criado por **Sd Ferrão — 32º BPM**.

---

## Tecnologia

- [TypeScript](https://www.typescriptlang.org/) + [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
- PWA com [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox): cache offline e aviso de nova versão
- [Leaflet](https://leafletjs.com/) (mapa do croqui), [jsPDF](https://github.com/parallax/jsPDF) (PDF da escala), [Lucide](https://lucide.dev/) (ícones), fontes Barlow
- Testes com [Vitest](https://vitest.dev/)

Não há servidor nem banco de dados: tudo roda no navegador e os dados ficam no aparelho do usuário.

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
    release/      formatador do release (format.ts) + tela
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

As cores ficam em `src/styles/tokens.css` (tema escuro e claro).

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

Nada do que é digitado é enviado a servidores do projeto. Rascunhos, escala e croquis ficam somente no
aparelho. O croqui usa mapas do OpenStreetMap e imagens da Esri; a busca de endereços usa o Nominatim.
Estatísticas anônimas de uso via Google Analytics. Veja os Termos de Uso no próprio app (`/home/termos`).
