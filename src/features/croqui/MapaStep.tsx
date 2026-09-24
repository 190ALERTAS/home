import { useEffect, useRef, useState, type FormEvent } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Layers, LocateFixed, Minus, Plus, Search, X } from 'lucide-react';
import { toast } from '../../components/toast';
import { readJSON, writeJSON } from '../../lib/storage';
import { CAMADAS, buscarEndereco, capturarArea, metrosPorPixel, type Camada, type Captura, type ResultadoBusca } from './mapa';

const K_ULTIMO = '190a:croqui:ultimo-local';
const PADRAO = { lat: -30.0346, lng: -51.2177, zoom: 17, camada: 'satelite' as Camada };

export interface ResultadoMapa {
  captura: Captura;
  camada: Camada;
  lat: number;
  lng: number;
  zoom: number;
}

export function MapaStep({ onUsar, ocupado }: { onUsar: (r: ResultadoMapa) => Promise<void>; ocupado?: boolean }) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const camadaRef = useRef<L.TileLayer | null>(null);
  const gpsRef = useRef<L.CircleMarker | null>(null);
  const inicial = readJSON(K_ULTIMO, PADRAO);
  const [camada, setCamada] = useState<Camada>(inicial.camada === 'ruas' ? 'ruas' : 'satelite');
  const [zoom, setZoom] = useState(inicial.zoom);
  const [lat, setLat] = useState(inicial.lat);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);
  const camadaAtual = useRef(camada);

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
    mapRef.current = map;
    const salvar = () => {
      const c = map.getCenter();
      setZoom(map.getZoom());
      setLat(c.lat);
      writeJSON(K_ULTIMO, { lat: +c.lat.toFixed(5), lng: +c.lng.toFixed(5), zoom: map.getZoom(), camada: camadaAtual.current });
    };
    map.on('moveend zoomend', salvar);
    setTimeout(() => map.invalidateSize(), 60);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    camadaAtual.current = camada;
    const map = mapRef.current;
    if (!map) return;
    camadaRef.current?.remove();
    camadaRef.current = L.tileLayer(CAMADAS[camada].url, {
      maxZoom: 21,
      maxNativeZoom: CAMADAS[camada].maxNativo,
      attribution: CAMADAS[camada].atribuicao,
      crossOrigin: 'anonymous',
    }).addTo(map);
  }, [camada]);

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

  const usar = async () => {
    const map = mapRef.current;
    if (!map) return;
    const tamanho = map.getSize();
    const origem = map.getPixelBounds().min!;
    const c = map.getCenter();
    try {
      setProgresso({ feitos: 0, total: 1 });
      const captura = await capturarArea({
        camada,
        zoom: map.getZoom(),
        origem: { x: origem.x, y: origem.y },
        largura: tamanho.x,
        altura: tamanho.y,
        lat: c.lat,
        onProgresso: (feitos, total) => setProgresso({ feitos, total }),
      });
      if (captura.falhas > 0) {
        toast({
          title: `${captura.falhas} parte(s) do mapa não carregaram`,
          desc: 'Verifique a conexão; você pode refazer a captura depois.',
          kind: 'error',
        });
      }
      await onUsar({ captura, camada, lat: c.lat, lng: c.lng, zoom: map.getZoom() });
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
        <button type="button" aria-label={camada === 'ruas' ? 'Ver satélite' : 'Ver ruas'} onClick={() => setCamada(camada === 'ruas' ? 'satelite' : 'ruas')}>
          <Layers />
          <small>{camada === 'ruas' ? 'Satélite' : 'Ruas'}</small>
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
              <span className="spinner" /> Capturando {progresso.total > 1 ? `${Math.round((progresso.feitos / progresso.total) * 100)}%` : ''}
            </>
          ) : (
            'Usar esta área'
          )}
        </button>
      </div>
    </div>
  );
}
