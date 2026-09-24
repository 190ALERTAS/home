import { ScrollText } from 'lucide-react';
import { PageHead } from '../../components/ui';
import { linkProps } from '../../lib/router';
import './termos.css';

export default function TermosPage() {
  return (
    <div className="page termos">
      <PageHead icon={ScrollText} title="Termos de uso" subtitle="Termos de Uso e Política de Privacidade do 190 ALERTAS" />
      <article className="card pad">
        <p className="subtle">
          <em>Última atualização: 24 de setembro de 2026 (versão 5)</em>
        </p>

        <h2>Termos de Uso</h2>
        <ol>
          <li>
            <strong>Aceitação dos termos:</strong> ao acessar ou utilizar o 190 ALERTAS, você concorda com estes Termos de Uso e com a
            Política de Privacidade descritos aqui.
          </li>
          <li>
            <strong>Uso autorizado:</strong> a plataforma destina-se a integrantes das forças de segurança pública, especialmente praças,
            como apoio na formatação de mensagens (release e alerta de veículo), na elaboração de croquis, no controle pessoal da escala
            e no cálculo do TAF.
          </li>
          <li>
            <strong>Ferramenta de apoio:</strong> os textos, croquis, cálculos e relatórios gerados não substituem documentos, sistemas ou
            procedimentos oficiais. Confira sempre as informações antes de divulgá-las.
          </li>
          <li>
            <strong>Uso responsável:</strong> os usuários são responsáveis pelo conteúdo que produzem e compartilham e devem observar as leis
            e normas aplicáveis, inclusive quanto ao sigilo e à proteção de dados de terceiros. O uso inadequado ou ilegal da plataforma é
            estritamente proibido.
          </li>
          <li>
            <strong>Alterações nos termos:</strong> estes termos podem ser atualizados a qualquer momento. As mudanças serão comunicadas na
            plataforma.
          </li>
          <li>
            <strong>Conta:</strong> não há cadastro, login ou qualquer vinculação de conta do usuário.
          </li>
        </ol>

        <h2>Política de Privacidade</h2>
        <ol>
          <li>
            <strong>Sem servidor de dados:</strong> o 190 ALERTAS não possui banco de dados nem servidor próprio. Nada do que você digita
            é enviado para os responsáveis pela plataforma.
          </li>
          <li>
            <strong>Dados salvos no aparelho:</strong> para você não perder o trabalho, ficam salvos apenas no armazenamento local deste
            aparelho/navegador: os rascunhos do release e do alerta (apagados automaticamente após 24 e 12 horas), a sua escala e o
            croqui em andamento. Você pode apagá-los a qualquer momento pelos botões de limpar/apagar do próprio app ou limpando os dados
            do navegador. Os dados da escala não são sincronizados entre aparelhos: faça backups pelo menu da escala.
          </li>
          <li>
            <strong>Serviços de terceiros:</strong> no Croqui, o mapa e o traçado das ruas vêm do OpenStreetMap (servidores de mapas e
            Overpass) e a busca de endereços usa o Nominatim (OpenStreetMap); esses serviços recebem a área do mapa exibida e o texto
            pesquisado. O
            botão “WhatsApp” abre o WhatsApp com o texto gerado, e o formulário de Sugestões é hospedado no Google Forms.
          </li>
          <li>
            <strong>Estatísticas de uso:</strong> utilizamos o Google Analytics para contar acessos e o uso das funções de forma anônima
            (por exemplo, “release copiado”). Nenhum conteúdo digitado é enviado. O Google Analytics pode utilizar cookies.
          </li>
          <li>
            <strong>Segurança:</strong> como as informações ficam no aparelho, mantenha-o protegido por senha ou biometria.
          </li>
          <li>
            <strong>Links externos:</strong> a plataforma pode conter links para sites externos. Não somos responsáveis pelas práticas de
            privacidade desses sites.
          </li>
          <li>
            <strong>Contato:</strong> dúvidas ou preocupações sobre estes termos podem ser enviadas pela aba{' '}
            <a {...linkProps('sugestoes')}>Sugestões</a>.
          </li>
        </ol>

        <p>
          Ao utilizar o 190 ALERTAS, você concorda com os Termos de Uso e a Política de Privacidade aqui estabelecidos. Se não concordar,
          por favor, não utilize a plataforma.
        </p>
        <p>
          Agradecemos por confiar no 190 ALERTAS. Estamos comprometidos em oferecer uma ferramenta segura e eficiente para as forças de
          segurança pública.
        </p>

        <div className="assinatura">
          <p>
            <strong>Atenciosamente,</strong>
          </p>
          <p>Sd Ferrão — 32º BPM</p>
          <p>190 ALERTAS</p>
        </div>
      </article>
    </div>
  );
}
