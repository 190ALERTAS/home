import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Sheet } from './Sheet';
import {
  DIAS_SEMANA,
  MESES,
  addDays,
  daysInMonth,
  formatDateBR,
  isHM,
  isISODate,
  monthKey,
  monthKeyOf,
  monthLabel,
  nowHM,
  pad2,
  parseMonthKey,
  shiftMonth,
  todayISO,
  weekdayOf,
} from '../lib/date';

/*
 * Seletores de data e hora próprios do app. Substituem os controles nativos do
 * navegador, cujas janelas às vezes abriam fora da tela. Aqui tudo abre numa folha
 * (celular) ou numa janela central (computador), sempre inteira na tela.
 */

/* ======================================================================
   Hora
   ====================================================================== */

const HORAS = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTOS = Array.from({ length: 60 }, (_, i) => pad2(i));
/** Altura de cada linha da roda, em px (igual ao CSS `.roda`). */
const LINHA = 44;

const limitar = (n: number, max: number) => Math.min(max, Math.max(0, n));

/** Roda de seleção (estilo relógio digital): rola com o dedo, clica, usa setas ou digita. */
function Roda({
  valores,
  valor,
  onChange,
  rotulo,
  unidade,
}: {
  valores: readonly string[];
  valor: number;
  onChange: (i: number) => void;
  rotulo: string;
  unidade: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(valor);
  const atual = useRef({ valor, onChange });
  atual.current = { valor, onChange };
  const espera = useRef(0);
  const posicionado = useRef(false);
  const digitado = useRef({ texto: '', ate: 0 });
  const max = valores.length - 1;

  // Posiciona a roda assim que ela ganha tamanho (a folha acabou de abrir) e em giros.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.clientHeight === 0) return;
      el.scrollTop = atual.current.valor * LINHA;
      posicionado.current = true;
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.clearTimeout(espera.current);
    };
  }, []);

  // Valor mudou por fora (toque num item, teclado, "Agora"): leva a roda até ele.
  useLayoutEffect(() => {
    setAtivo(valor);
    const el = ref.current;
    if (!el || !posicionado.current) return;
    const alvo = valor * LINHA;
    if (Math.abs(el.scrollTop - alvo) > 1) el.scrollTo({ top: alvo, behavior: 'smooth' });
  }, [valor]);

  // Roda do mouse: um item por "clique" da roda (o padrão pularia vários).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let acumulado = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      acumulado += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (Math.abs(acumulado) < 30) return;
      const passo = Math.sign(acumulado);
      acumulado = 0;
      const { valor: v, onChange: mudar } = atual.current;
      mudar(limitar(v + passo, max));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [max]);

  const aoRolar = () => {
    const el = ref.current;
    if (!el || !posicionado.current) return;
    const i = limitar(Math.round(el.scrollTop / LINHA), max);
    setAtivo(i);
    window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => {
      if (i !== atual.current.valor) atual.current.onChange(i);
    }, 110);
  };

  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    // Semântica de "spinbutton": seta para cima aumenta o valor.
    const passos: Record<string, number> = { ArrowUp: 1, ArrowDown: -1, PageUp: 5, PageDown: -5 };
    if (e.key in passos) {
      e.preventDefault();
      onChange(limitar(valor + passos[e.key], max));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      onChange(e.key === 'Home' ? 0 : max);
    } else if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const agora = Date.now();
      const d = digitado.current;
      d.texto = agora < d.ate && d.texto.length < 2 ? d.texto + e.key : e.key;
      d.ate = agora + 1200;
      const n = Number(d.texto);
      if (n <= max) onChange(n);
      else onChange(Number(e.key));
    }
  };

  return (
    <div className="roda">
      <div className="roda-rotulo" aria-hidden>
        {rotulo}
      </div>
      <div className="roda-janela">
        <div
          ref={ref}
          className="roda-lista"
          role="spinbutton"
          tabIndex={0}
          aria-label={rotulo}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={valor}
          aria-valuetext={`${valor} ${unidade}`}
          onScroll={aoRolar}
          onKeyDown={aoTeclar}
        >
          {valores.map((v, i) => (
            <div
              key={v}
              className={`roda-item${i === ativo ? ' on' : ''}`}
              aria-hidden
              onClick={() => onChange(i)}
            >
              {v}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Folha com duas rodas (hora e minuto). */
export function SeletorHora({
  open,
  value,
  titulo = 'Hora',
  onClose,
  onPick,
}: {
  open: boolean;
  value: string;
  titulo?: string;
  onClose: () => void;
  onPick: (hm: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [h, setH] = useState(0);
  const [m, setM] = useState(0);

  // Ao abrir, parte do valor atual (ou da hora de agora).
  if (open !== aberto) {
    setAberto(open);
    if (open) {
      const [hh, mm] = (isHM(value) ? value : nowHM()).split(':').map(Number);
      setH(hh);
      setM(mm);
    }
  }

  const confirmar = () => onPick(`${pad2(h)}:${pad2(m)}`);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={titulo}
      size="sm"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" onClick={confirmar}>
            Definir {pad2(h)}:{pad2(m)}
          </button>
        </>
      }
    >
      <div
        className="seletor-hora"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
            e.preventDefault();
            confirmar();
          }
        }}
      >
        <div className="rodas">
          <Roda valores={HORAS} valor={h} onChange={setH} rotulo="Hora" unidade="horas" />
          <span className="rodas-sep" aria-hidden>
            :
          </span>
          <Roda valores={MINUTOS} valor={m} onChange={setM} rotulo="Minuto" unidade="minutos" />
        </div>
        <div className="chips seletor-atalhos">
          <button
            type="button"
            className="chip"
            onClick={() => {
              const [hh, mm] = nowHM().split(':').map(Number);
              setH(hh);
              setM(mm);
            }}
          >
            <Clock /> Agora
          </button>
          {[0, 15, 30, 45].map((q) => (
            <button key={q} type="button" className="chip mono" aria-pressed={m === q} onClick={() => setM(q)}>
              :{pad2(q)}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/** Campo de hora "HH:MM" que abre o seletor próprio. */
export function CampoHora({
  value,
  onChange,
  rotulo,
  id,
  titulo,
}: {
  value: string;
  onChange: (hm: string) => void;
  /** Nome do campo, lido por leitores de tela (ex.: "Hora", "Início"). */
  rotulo: string;
  id?: string;
  titulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const valido = isHM(value);
  return (
    <>
      <button
        id={id}
        type="button"
        className="input campo-picker"
        aria-haspopup="dialog"
        aria-label={`${rotulo}: ${valido ? value : 'não definida'}`}
        onClick={() => setAberto(true)}
      >
        <span className={valido ? 'valor mono' : 'valor vazio'}>{valido ? value : '--:--'}</span>
        <Clock aria-hidden />
      </button>
      <SeletorHora
        open={aberto}
        value={value}
        titulo={titulo ?? rotulo}
        onClose={() => setAberto(false)}
        onPick={(hm) => {
          onChange(hm);
          setAberto(false);
        }}
      />
    </>
  );
}

/* ======================================================================
   Data
   ====================================================================== */

const INICIAIS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function nomeCompleto(iso: string): string {
  const [y, mo, d] = iso.split('-').map(Number);
  return `${DIAS_SEMANA[weekdayOf(iso)]}, ${d} de ${MESES[mo - 1]} de ${y}`;
}

/** Calendário mensal em folha. Tocar num dia já confirma. */
export function SeletorData({
  open,
  value,
  min,
  max,
  titulo = 'Data',
  atalhos = true,
  onClose,
  onPick,
}: {
  open: boolean;
  value: string;
  min?: string;
  max?: string;
  titulo?: string;
  /** Mostra "Hoje" e "Ontem". */
  atalhos?: boolean;
  onClose: () => void;
  onPick: (iso: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [mes, setMes] = useState(() => monthKeyOf(todayISO()));
  const [foco, setFoco] = useState(() => todayISO());
  const grade = useRef<HTMLDivElement>(null);
  const moverFoco = useRef(false);

  if (open !== aberto) {
    setAberto(open);
    if (open) {
      const base = isISODate(value) ? value : todayISO();
      setMes(monthKeyOf(base));
      setFoco(base);
    }
  }

  useEffect(() => {
    if (!moverFoco.current) return;
    moverFoco.current = false;
    grade.current?.querySelector<HTMLButtonElement>(`[data-dia="${foco}"]`)?.focus();
  }, [foco, mes]);

  const hoje = todayISO();
  const { year, month } = parseMonthKey(mes);
  const primeiro = `${mes}-01`;
  const inicio = addDays(primeiro, -weekdayOf(primeiro));
  const dias = Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  const foraDoLimite = (iso: string) => (!!min && iso < min) || (!!max && iso > max);
  // Dia que recebe o Tab dentro da grade (sempre um dia do mês exibido).
  const focavel = monthKeyOf(foco) === mes ? foco : monthKeyOf(value) === mes ? value : primeiro;

  const irPara = (iso: string) => {
    if (foraDoLimite(iso)) return;
    moverFoco.current = true;
    setFoco(iso);
    setMes(monthKeyOf(iso));
  };

  const aoTeclar = (e: KeyboardEvent<HTMLButtonElement>, iso: string) => {
    const [y, mo, d] = iso.split('-').map(Number);
    const mesmoDiaEm = (delta: number) => {
      const k = shiftMonth(monthKey(y, mo), delta);
      const { year: yy, month: mm } = parseMonthKey(k);
      return `${k}-${pad2(Math.min(d, daysInMonth(yy, mm)))}`;
    };
    const destinos: Record<string, () => string> = {
      ArrowLeft: () => addDays(iso, -1),
      ArrowRight: () => addDays(iso, 1),
      ArrowUp: () => addDays(iso, -7),
      ArrowDown: () => addDays(iso, 7),
      Home: () => addDays(iso, -weekdayOf(iso)),
      End: () => addDays(iso, 6 - weekdayOf(iso)),
      PageUp: () => mesmoDiaEm(-1),
      PageDown: () => mesmoDiaEm(1),
    };
    const destino = destinos[e.key];
    if (!destino) return;
    e.preventDefault();
    irPara(destino());
  };

  const escolher = (iso: string) => {
    if (!foraDoLimite(iso)) onPick(iso);
  };

  return (
    <Sheet open={open} onClose={onClose} title={titulo} size="sm">
      <div className="seletor-data">
        <div className="cal-topo">
          <button type="button" className="icon-btn" aria-label="Mês anterior" onClick={() => setMes(shiftMonth(mes, -1))}>
            <ChevronLeft />
          </button>
          <strong className="cal-mes" aria-live="polite">
            {monthLabel(mes)}
          </strong>
          <button type="button" className="icon-btn" aria-label="Próximo mês" onClick={() => setMes(shiftMonth(mes, 1))}>
            <ChevronRight />
          </button>
        </div>
        <div className="cal-semana" aria-hidden>
          {INICIAIS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="cal-grade" ref={grade} role="group" aria-label={`${MESES[month - 1]} de ${year}`}>
          {dias.map((iso) => {
            const fora = monthKeyOf(iso) !== mes;
            const bloqueado = foraDoLimite(iso);
            return (
              <button
                key={iso}
                type="button"
                data-dia={iso}
                className={`cal-dia${fora ? ' fora' : ''}${iso === hoje ? ' hoje' : ''}`}
                aria-pressed={iso === value}
                aria-current={iso === hoje ? 'date' : undefined}
                aria-label={nomeCompleto(iso)}
                disabled={bloqueado}
                tabIndex={iso === focavel ? 0 : -1}
                onClick={() => escolher(iso)}
                onKeyDown={(e) => aoTeclar(e, iso)}
              >
                {Number(iso.slice(8))}
              </button>
            );
          })}
        </div>
        {atalhos && (
          <div className="chips seletor-atalhos">
            <button type="button" className="chip" disabled={foraDoLimite(hoje)} onClick={() => escolher(hoje)}>
              <CalendarDays /> Hoje
            </button>
            <button type="button" className="chip" disabled={foraDoLimite(addDays(hoje, -1))} onClick={() => escolher(addDays(hoje, -1))}>
              Ontem
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** Campo de data "DD/MM/AAAA" que abre o calendário próprio. */
export function CampoData({
  value,
  onChange,
  rotulo,
  id,
  min,
  max,
  titulo,
  atalhos,
}: {
  value: string;
  onChange: (iso: string) => void;
  rotulo: string;
  id?: string;
  min?: string;
  max?: string;
  titulo?: string;
  atalhos?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const valido = isISODate(value);
  const semana = valido ? DIAS_SEMANA[weekdayOf(value)].slice(0, 3) : '';
  return (
    <>
      <button
        id={id}
        type="button"
        className="input campo-picker"
        aria-haspopup="dialog"
        aria-label={`${rotulo}: ${valido ? `${formatDateBR(value)} ${semana}` : 'não definida'}`}
        onClick={() => setAberto(true)}
      >
        <span className={valido ? 'valor mono' : 'valor vazio'}>{valido ? formatDateBR(value) : 'dd/mm/aaaa'}</span>{' '}
        {valido && <span className="dica">{semana}</span>}
        <CalendarDays aria-hidden />
      </button>
      <SeletorData
        open={aberto}
        value={value}
        min={min}
        max={max}
        titulo={titulo ?? rotulo}
        atalhos={atalhos}
        onClose={() => setAberto(false)}
        onPick={(iso) => {
          onChange(iso);
          setAberto(false);
        }}
      />
    </>
  );
}
