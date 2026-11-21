import { useEffect } from 'react';
import { ExternalLink, PencilRuler } from 'lucide-react';
import { PageHead } from '../../components/ui';
import { idbDel } from '../../lib/idb';
import { track } from '../../lib/analytics';
import './croqui.css';

export const QRV_MULTAS_URL = 'https://play.google.com/store/apps/details?id=qrv.multas';

const BENEFICIOS = [
  'Ruas reais do local em traçado plano, em escala real',
  'Setas, medidas, legenda e símbolos de veículos e sinalização',
  'Exportação em imagem para anexar ao registro',
  'Feito para quem atende ocorrências de trânsito',
];

/** O croqui digital saiu do 190 ALERTAS e agora é exclusivo do app QRV Multas. */
export default function CroquiPage() {
  useEffect(() => {
    // Libera o rascunho de croqui que versões antigas guardavam neste aparelho.
    void idbDel('croqui:atual');
  }, []);

  return (
    <div className="page croqui-qrv">
      <PageHead icon={PencilRuler} title="Croqui digital" subtitle="Agora exclusivo do app QRV Multas" />
      <section className="card pad croqui-qrv-card">
        <span className="croqui-qrv-selo">Novo endereço</span>
        <h2>O croqui digital agora é exclusivo do QRV Multas</h2>
        <p>
          A ferramenta saiu do 190 ALERTAS e passou a fazer parte do <b>QRV Multas</b>, aplicativo para Android pensado para o trabalho
          de trânsito.
        </p>
        <ul>
          {BENEFICIOS.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <a
          className="btn primary croqui-qrv-cta"
          href={QRV_MULTAS_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('croqui_qrv_clique')}
        >
          <ExternalLink /> Baixar o QRV Multas na Google Play
        </a>
        <p className="subtle">As demais ferramentas do 190 ALERTAS continuam como sempre: release, alerta de veículo, escala e TAF.</p>
      </section>
    </div>
  );
}
