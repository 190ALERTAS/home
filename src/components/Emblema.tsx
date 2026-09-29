/*
 * Emblema do 190 ALERTAS: escudo geométrico com o número 190.
 * Os mesmos traços geram os ícones do app, o favicon e a imagem de compartilhamento.
 */

export const EMBLEMA_ESCUDO =
  'M32 3.2L54.4 9.2Q56 9.6 56 11.3V35.2Q56 37 54.8 38.3L34 59.2Q32 61.2 30 59.2L9.2 38.3Q8 37 8 35.2V11.3Q8 9.6 9.6 9.2Z';
export const EMBLEMA_ARO = 'M32 7L52.6 12.5V35L32 55.8L11.4 35V12.5Z';
export const EMBLEMA_190 =
  'M25.17 36.99L15.94 36.99L15.94 34.42L19.27 34.42L19.27 24.2L19.08 24.2L16.99 27.16L14.95 25.79L17.62 22.01L22.27 22.01L22.27 34.42L25.17 34.42L25.17 36.99ZM37.07 27.68Q37.07 29.31 36.63 30.73Q36.19 32.16 35.5 33.34Q34.81 34.52 33.93 35.45Q33.05 36.37 32.19 36.99L27.96 36.99Q29.23 36.05 30.23 35.18Q31.23 34.31 31.97 33.42Q32.71 32.53 33.18 31.56Q33.65 30.59 33.85 29.48L33.5 29.48Q33.2 30.38 32.52 31Q31.83 31.63 30.6 31.63Q28.8 31.63 27.76 30.41Q26.72 29.2 26.72 26.92Q26.72 24.48 28.04 23.11Q29.36 21.75 31.89 21.75Q34.51 21.75 35.79 23.27Q37.07 24.8 37.07 27.68ZM31.89 29.16Q32.88 29.16 33.36 28.61Q33.85 28.06 33.85 27.03L33.85 26.34Q33.85 25.31 33.36 24.77Q32.88 24.22 31.89 24.22Q30.91 24.22 30.42 24.77Q29.94 25.31 29.94 26.34L29.94 27.03Q29.94 28.06 30.42 28.61Q30.91 29.16 31.89 29.16ZM43.89 37.25Q42.54 37.25 41.57 36.81Q40.61 36.37 39.98 35.44Q39.34 34.5 39.04 33.03Q38.74 31.56 38.74 29.5Q38.74 27.44 39.04 25.97Q39.34 24.5 39.98 23.56Q40.61 22.63 41.57 22.19Q42.54 21.75 43.89 21.75Q45.25 21.75 46.21 22.19Q47.18 22.63 47.81 23.56Q48.44 24.5 48.75 25.97Q49.05 27.44 49.05 29.5Q49.05 31.56 48.75 33.03Q48.44 34.5 47.81 35.44Q47.18 36.37 46.21 36.81Q45.25 37.25 43.89 37.25ZM43.89 34.67Q44.43 34.67 44.8 34.51Q45.16 34.35 45.37 34Q45.59 33.64 45.69 33.06Q45.78 32.48 45.78 31.63L45.78 27.37Q45.78 25.68 45.37 25Q44.97 24.33 43.89 24.33Q42.82 24.33 42.41 25Q42 25.68 42 27.37L42 31.63Q42 32.48 42.1 33.06Q42.2 33.64 42.41 34Q42.63 34.35 42.99 34.51Q43.36 34.67 43.89 34.67Z';

/** Desenha o emblema num canvas, com o canto superior esquerdo em (x, y). */
export function desenharEmblema(ctx: CanvasRenderingContext2D, x: number, y: number, tamanho: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(tamanho / 64, tamanho / 64);
  ctx.fillStyle = '#c8192f';
  ctx.fill(new Path2D(EMBLEMA_ESCUDO));
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1.1;
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(EMBLEMA_ARO));
  ctx.fillStyle = '#ffffff';
  ctx.fill(new Path2D(EMBLEMA_190));
  ctx.restore();
}

/** Emblema como PNG (data URL), para relatórios em PDF. */
export function emblemaPNG(tamanho = 128): string {
  const c = document.createElement('canvas');
  c.width = tamanho;
  c.height = tamanho;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  desenharEmblema(ctx, 0, 0, tamanho);
  return c.toDataURL('image/png');
}

export function Emblema({ size = 32, className, title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path d={EMBLEMA_ESCUDO} fill="var(--emblema, #C8192F)" />
      <path d={EMBLEMA_ARO} fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={1.1} strokeLinejoin="round" />
      <path d={EMBLEMA_190} fill="#fff" />
    </svg>
  );
}
