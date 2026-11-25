/**
 * Fechas del panel. El contrato de la API manda dos formatos:
 * - días como `yyyy-MM-dd` (hora de Lima): nunca pasarlos por `new Date()` (corren un día por la zona horaria); se muestran
 *   con `ymdToDisplay`;
 * - instantes como ISO-8601 UTC (`2026-11-23T15:04:05Z`): se muestran en hora de Lima con `isoToLima`.
 */

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

/** yyyy-MM-dd → dd/MM/yyyy sin pasar por Date. */
export function ymdToDisplay(value?: string | null): string {
  if (!value) {
    return '';
  }
  const [y, m, d] = value.substring(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

/** Hoy en Lima (UTC−5, sin horario de verano) como yyyy-MM-dd. */
export function limaTodayYmd(): string {
  return new Date(Date.now() - LIMA_OFFSET_MS).toISOString().substring(0, 10);
}

/** Mes actual de Lima como yyyy-MM. */
export function limaMonthYm(): string {
  return limaTodayYmd().substring(0, 7);
}

/** Suma (o resta) días a un yyyy-MM-dd, con aritmética UTC para no depender de la zona del navegador. */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().substring(0, 10);
}

/** Días del rango `desde`–`hasta` (yyyy-MM-dd) contando los dos extremos; 0 si falta alguno o no se pueden leer. */
export function daysInRangeYmd(from: string, to: string): number {
  const toUtc = (ymd: string) => {
    const [y, m, d] = (ymd ?? '').split('-').map(Number);
    return y && m && d ? Date.UTC(y, m - 1, d) : NaN;
  };
  const diff = (toUtc(to) - toUtc(from)) / 86400000;
  return Number.isFinite(diff) ? diff + 1 : 0;
}

/** yyyy-MM → "noviembre de 2026". */
export function ymToDisplay(ym?: string | null): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) {
    return ym ?? '';
  }
  const [y, m] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
}

const LIMA_FORMAT = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

/** Instante ISO-8601 (UTC) → "23/11/2026 10:04" en hora de Lima. Vacío si no hay valor o no se puede leer. */
export function isoToLima(value?: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : LIMA_FORMAT.format(date).replace(',', '');
}

/** true si el instante ISO todavía no llegó (por ejemplo, un bloqueo vigente). */
export function isFutureInstant(value?: string | null): boolean {
  if (!value) {
    return false;
  }
  const time = new Date(value).getTime();
  return !Number.isNaN(time) && time > Date.now();
}
