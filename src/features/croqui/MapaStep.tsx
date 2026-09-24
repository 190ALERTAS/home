import { useEffect, useRef, useState, type FormEvent } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, LocateFixed, Minus, Plus, Search, X } from 'lucide-react';
import { toast } from '../../components/toast';
import { confirmDialog } from '../../components/dialogs';
import { readJSON, writeJSON } from '../../lib/storage';
import { CAMADAS, buscarEndereco, capturarArea, metrosPorPixel, type Captura, type ResultadoBusca } from './mapa';
import { buscarVias, caixaDaArea, montarTracado, type Area } from './tracado';

const K_ULTIMO = '190a:croqui:ultimo-local';
const PADRAO = { lat: -30.0346, lng: -51.2177, zoom: 17 };

export type ResultadoMapa =
  /** Traçado plano das ruas (padrão) */
  | { tipo: 'tracado'; area: Area; tracado: ReturnType<typeof montarTracado>; lat: number; lng: number; zoom: number }
  /** Imagem do mapa de ruas (reserva, se o serviço do traçado não responder) */
  | { tipo: 'imagem'; captura: Captura; lat: number; lng: number; zoom: number };

export function MapaStep({ onUsar, ocupado }: { onUsar: (r: ResultadoMapa) => Promise<void>; ocupado?: boolean }) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const gpsRef = useRef<L.CircleMarker | null>(null);
  const inicial = readJSON(K_ULTIMO, PADRAO);
  const [zoom, setZoom] = useState(inicial.zoom);
  const [lat, setLat] = useState(inicial.lat);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [progresso, setProgresso] = useState<{ texto: string } | null>(null);

  useEffect(() => {
    if (!divRef.current) return;
    const map = L.map(divRef.current, {
      center: [inicial.lat, inicial.lng],
      zoom: inicial.zoom,
      minZoom: 5,
      maxZoom: 21,
      zoomControl: false,
      attributionControl: true,
      zoomSnap: 1,
      doubleClickZoom: true,
    });
    map.attributionControl.setPrefix(false);
    // Mapa de ruas só para localizar o ponto; o croqui recebe o traçado plano das vias.
    L.tileLayer(CAMADAS.ruas.url, {
      maxZoom: 21,
      maxNativeZoom: CAMADAS.ruas.maxNativo,
      attribution: CAMADAS.ruas.atribuicao,
      crossOrigin: 'anonymous',
    }).addTo(map);
    mapRef.current = map;
    const salvar = () => {
      const c = map.getCenter();
      setZoom(map.getZoom());
      setLat(c.lat);
      writeJSON(K_ULTIMO, { lat: +c.lat.toFixed(5), lng: +c.lng.toFixed(5), zoom: map.getZoom() });
    };
    map.on('moveend zoomend', salvar);
    setTimeout(() => map.invalidateSize(), 60);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const localizar = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Localização indisponível neste aparelho', kind: 'error' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current;
        if (!map) return;
        const ll: L.LatLngExpression = [pos.coords.latitude, pos.coords.longitude];
        map.setView(ll, Math.max(map.getZoom(), 19));
        gpsRef.current?.remove();
        gpsRef.current = L.circleMarker(ll, { radius: 8, color: '#ffffff', weight: 3, fillColor: '#1e5bff', fillOpacity: 1 }).addTo(map);
      },
      (err) =>
        toast({
          title: 'Não foi possível obter a localização',
          desc: err.code === err.PERMISSION_DENIED ? 'Permita o acesso à localização no navegador.' : 'Tente novamente em local aberto.',
          kind: 'error',
        }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const buscar = async (e?: FormEvent) => {
    e?.preventDefault();
    const termo = q.trim();
    if (termo.length < 3) return;
    setBuscando(true);
    try {
      const c = mapRef.current?.getCenter();
      const r = await buscarEndereco(termo, c ? { lat: c.lat, lng: c.lng } : undefined);
      setResultados(r);
      if (r.length === 0) toast({ title: 'Endereço não encontrado', desc: 'Tente incluir a cidade.', kind: 'error' });
    } catch {
      toast({ title: 'Busca indisponível', desc: 'Verifique a conexão com a internet.', kind: 'error' });
    } finally {
      setBuscando(false);
    }
  };

  const irPara = (r: ResultadoBusca) => {
    mapRef.current?.setView([r.lat, r.lng], 19);
    setResultados(null);
  };

  /** Reserva: imagem do mapa de ruas da área (como nas versões anteriores). */
  const usarImagem = async (area: Area, c: L.LatLng) => {
    setProgresso({ texto: 'Capturando o mapa' });
    const captura = await capturarArea({
      camada: 'ruas',
      zoom: area.zoom,
      origem: area.origem,
      largura: area.largura,
      altura: area.altura,
      lat: c.lat,
      onProgresso: (feitos, total) => setProgresso({ texto: `Capturando o mapa ${Math.round((feitos / total) * 100)}%` }),
    });
    if (captura.falhas > 0) {
      toast({ title: `${captura.falhas} parte(s) do mapa não carregaram`, desc: 'Verifique a conexão e tente de novo.', kind: 'error' });
    }
    await onUsar({ tipo: 'imagem', captura, lat: c.lat, lng: c.lng, zoom: area.zoom });
  };

  const usar = async () => {
    const map = mapRef.current;
    if (!map) return;
    const tamanho = map.getSize();
    const origem = map.getPixelBounds().min!;
    const c = map.getCenter();
    const z = map.getZoom();
    const area: Area = { zoom: z, origem: { x: origem.x, y: origem.y }, largura: tamanho.x, altura: tamanho.y, mpu: metrosPorPixel(c.lat, z) };
    let motivo = 'O serviço de mapas do OpenStreetMap não respondeu.';
    try {
      setProgresso({ texto: 'Desenhando as ruas' });
      const tracado = montarTracado(await buscarVias(caixaDaArea(area)), area);
      if (tracado.vias.length > 0) {
        await onUsar({ tipo: 'tracado', area, tracado, lat: c.lat, lng: c.lng, zoom: z });
        return;
      }
      motivo = 'Não há ruas mapeadas no OpenStreetMap nesta área.';
    } catch {
      /* segue para a reserva */
    } finally {
      setProgresso(null);
    }
    const ok = await confirmDialog({
      title: 'Traçado das ruas indisponível',
      message: `${motivo} Você pode usar a imagem do mapa de ruas desta área, ou tentar de novo em instantes.`,
      confirmLabel: 'Usar imagem do mapa',
      cancelLabel: 'Tentar depois',
    });
    if (!ok) return;
    try {
      await usarImagem(area, c);
    } catch {
      toast({ title: 'Falha ao capturar o mapa', desc: 'Verifique a conexão e tente de novo.', kind: 'error' });
    } finally {
      setProgresso(null);
    }
  };

  const mpp = metrosPorPixel(lat, zoom);
  const carroPx = 4.5 / mpp;

  return (
    <div className="cro-mapa">
      <div ref={divRef} className="cro-leaflet" />
      <div className="cro-mira" aria-hidden>
        <Crosshair />
      </div>

      <form className="cro-busca" onSubmit={buscar} role="search">
        <Search size={18} className="subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar endereço (rua, número, cidade)"
          aria-label="Buscar endereço"
          enterKeyHint="search"
        />
        {q && (
          <button type="button" className="icon-btn" aria-label="Limpar busca" onClick={() => { setQ(''); setResultados(null); }}>
            <X size={18} />
          </button>
        )}
        <button type="submit" className="btn sm primary" disabled={buscando || q.trim().length < 3}>
          {buscando ? <span className="spinner" /> : 'Buscar'}
        </button>
      </form>

      {resultados && resultados.length > 0 && (
        <div className="cro-resultados" role="listbox">
          {resultados.map((r, i) => (
            <button key={i} type="button" role="option" aria-selected={false} onClick={() => irPara(r)}>
              {r.nome}
            </button>
          ))}
        </div>
      )}

      <div className="cro-mapa-ctrl">
        <button type="button" aria-label="Aproximar" onClick={() => mapRef.current?.zoomIn()}>
          <Plus />
        </button>
        <button type="button" aria-label="Afastar" onClick={() => mapRef.current?.zoomOut()}>
          <Minus />
        </button>
        <button type="button" aria-label="Minha localização" onClick={localizar}>
          <LocateFixed />
        </button>
      </div>

      <div className="cro-mapa-rodape">
        <div className="cro-dica">
          {zoom < 18 ? (
            <>Aproxime até a rua ocupar a tela (zoom {zoom}/21).</>
          ) : (
            <>
              Escala real: um carro terá ~{Math.max(1, Math.round(carroPx))} px. Zoom {zoom}/21.
            </>
          )}
        </div>
        <button type="button" className="btn primary lg block" onClick={usar} disabled={!!progresso || ocupado}>
          {progresso ? (
            <>
              <span className="spinner" /> {progresso.texto}…
            </>
          ) : (
            'Usar esta área'
          )}
        </button>
      </div>
    </div>
  );
}
