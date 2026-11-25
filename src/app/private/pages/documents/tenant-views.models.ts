/**
 * Vistas de comprobantes del portal (Docs/api-sunat-portal-clientes-diseno.md §5): `GET portal/tenants/{id}/{tipo}`, solo lectura.
 * - El sobre es el del portal (camelCase), pero `data` de los comprobantes es el recurso de `/api/v1` **tal cual, en snake_case**:
 *   aquí se lee con los ayudantes `obj` / `arr` / `str` / `num` (sin mapear a camelCase) y se arma lo que muestra la pantalla.
 * - Fechas de `/api/v1`: `fecha_emision` como `yyyy-MM-dd HH:mm:ss` (hora de Lima, se muestra sin pasar por `new Date()`) e
 *   instantes como `2026-11-23T15:04:05+00:00` (se muestran en hora de Lima con `isoToLima`).
 * - `archivos` trae URLs de `/api/v1` (piden las credenciales de la empresa): solo se mira si son `null`; se descarga con las
 *   rutas del portal.
 */
import { isoToLima, ymdToDisplay } from '@shared/functions/lima-dates';

export interface Option<T> {
  id: T;
  name: string;
}

// ---------------------------------------------------------------- Lectura de JSON sin tipo
export type Json = Record<string, unknown>;

/** El valor como objeto (vacío si no es un objeto: `cliente` sin datos llega como `[]`). */
export function obj(value: unknown): Json {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {};
}

/** El valor como lista de objetos. */
export function arr(value: unknown): Json[] {
  return Array.isArray(value) ? value.filter((v) => v != null && typeof v === 'object').map((v) => v as Json) : [];
}

/** El valor como texto ('' si no hay). */
export function str(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/** El valor como número (los montos de pagos de la suscripción llegan como texto). null si no hay o no es número. */
export function num(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function has(value: unknown): boolean {
  return value != null && value !== '' && !(Array.isArray(value) && value.length === 0);
}

// ---------------------------------------------------------------- Formatos
const MONEY = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const QTY = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 4 });

/** Monto con 2 decimales (con la moneda delante si se da). '' si no hay valor. */
export function money(value: unknown, currency?: string): string {
  const n = num(value);
  if (n == null) {
    return '';
  }
  return currency ? `${currency} ${MONEY.format(n)}` : MONEY.format(n);
}

/** Cantidad o conteo con separador de miles. */
export function qty(value: unknown): string {
  const n = num(value);
  return n == null ? '' : QTY.format(n);
}

export function percent(value: unknown): string {
  const n = num(value);
  return n == null ? '' : `${QTY.format(n)} %`;
}

export function yesNo(value: unknown): string {
  return value === true || value === 1 || value === '1' ? 'Sí' : value === false || value === 0 || value === '0' ? 'No' : str(value);
}

/**
 * Fecha de `/api/v1` que es un día o un día con hora de Lima: `yyyy-MM-dd`, `yyyy-MM-dd HH:mm(:ss)` o la fecha de Laravel
 * `yyyy-MM-ddT00:00:00.000000Z` (columnas de tipo fecha de las anulaciones). Se lee como texto, nunca con `new Date()`.
 */
export function dayText(value: unknown): string {
  const v = str(value);
  if (!/^\d{4}-\d{2}-\d{2}/.test(v)) {
    return v;
  }
  const day = ymdToDisplay(v.substring(0, 10));
  // Con espacio es hora de Lima; con "T…Z" es una columna de fecha de Laravel (medianoche UTC): solo el día.
  const time = /^\d{4}-\d{2}-\d{2} (\d{2}:\d{2})/.exec(v)?.[1];
  return time ? `${day} ${time}` : day;
}

/** Instante ISO-8601 (`+00:00` o `Z`, con o sin microsegundos) en hora de Lima. */
export function instantText(value: unknown): string {
  const v = str(value);
  if (!v) {
    return '';
  }
  return isoToLima(v.replace(/(\.\d{3})\d+/, '$1'));
}

// ---------------------------------------------------------------- Estados
export const SUNAT_STATUS_OPTIONS: Option<string>[] = [
  { id: 'pendiente', name: 'Pendiente' },
  { id: 'enviado', name: 'Enviado' },
  { id: 'aceptado', name: 'Aceptado' },
  { id: 'rechazado', name: 'Rechazado' },
  { id: 'anulado', name: 'Anulado' },
  { id: 'anulacion_en_proceso', name: 'Anulación en proceso' }
];

const SUNAT_BADGE: Record<string, string> = {
  pendiente: 'badge-light-warning',
  enviado: 'badge-light-info',
  aceptado: 'badge-light-success',
  rechazado: 'badge-light-danger',
  anulado: 'badge-light-secondary',
  anulacion_en_proceso: 'badge-light-warning',
  reversion_en_proceso: 'badge-light-warning',
  revertido: 'badge-light-secondary',
  observado: 'badge-light-warning',
  error: 'badge-light-danger'
};

/** Estados que solo trae la fila común de §10.3 (no son filtros de `/api/v1`). */
const EXTRA_STATUS_NAMES: Record<string, string> = {
  anulacionEnProceso: 'Anulación en proceso',
  reversion_en_proceso: 'Reversión en proceso',
  revertido: 'Revertido',
  observado: 'Aceptado con observaciones'
};

export function sunatStatusName(value: unknown): string {
  const v = str(value);
  return SUNAT_STATUS_OPTIONS.find((o) => o.id === v)?.name ?? EXTRA_STATUS_NAMES[v] ?? v;
}

export function sunatBadge(value: unknown): string {
  return SUNAT_BADGE[str(value)] ?? 'badge-light-secondary';
}

export const PAYMENT_STATUS_OPTIONS: Option<string>[] = [
  { id: 'pendiente', name: 'Pendiente' },
  { id: 'parcial', name: 'Parcial' },
  { id: 'pagado', name: 'Pagado' }
];

export function paymentStatusName(value: unknown): string {
  const v = str(value);
  return PAYMENT_STATUS_OPTIONS.find((o) => o.id === v)?.name ?? v;
}

export function paymentBadge(value: unknown): string {
  const v = str(value);
  return v === 'pagado' ? 'badge-light-success' : v === 'parcial' ? 'badge-light-warning' : v ? 'badge-light-danger' : 'badge-light-secondary';
}

export const CURRENCY_OPTIONS: Option<string>[] = [
  { id: 'PEN', name: 'Soles (PEN)' },
  { id: 'USD', name: 'Dólares (USD)' }
];

/** Catálogo 06 de SUNAT (tipo de documento de identidad). */
const IDENTITY_TYPES: Record<string, string> = {
  '0': 'Sin documento',
  '1': 'DNI',
  '4': 'Carné de extranjería',
  '6': 'RUC',
  '7': 'Pasaporte',
  A: 'Cédula diplomática'
};

export const IDENTITY_TYPE_OPTIONS: Option<string>[] = Object.entries(IDENTITY_TYPES).map(([id, name]) => ({ id, name }));

export function identityTypeName(value: unknown): string {
  const v = str(value);
  return IDENTITY_TYPES[v] ?? v;
}

/** Catálogo 01 de SUNAT (tipo de comprobante) para los documentos relacionados. */
const CPE_TYPES: Record<string, string> = {
  '01': 'Factura',
  '03': 'Boleta',
  '04': 'Liquidación de compra',
  '07': 'Nota de crédito',
  '08': 'Nota de débito',
  '09': 'Guía de remisión remitente',
  '20': 'Retención',
  '31': 'Guía de remisión transportista',
  '40': 'Percepción'
};

export function cpeTypeName(value: unknown): string {
  const v = str(value);
  return CPE_TYPES[v] ? `${CPE_TYPES[v]} (${v})` : v;
}

export const PDF_FORMATS: Option<string>[] = [
  { id: 'a4', name: 'A4' },
  { id: 'a5', name: 'A5' },
  { id: 'ticket-80', name: 'Ticket 80 mm' },
  { id: 'ticket-58', name: 'Ticket 58 mm' }
];

// ---------------------------------------------------------------- Tipos de documento de las vistas
/** Comprobantes de venta (§9.2): `{tipo}` de la ruta. */
export type SaleKind = 'facturas' | 'boletas' | 'notas-credito' | 'notas-debito';
/** Otros comprobantes (§9.3). */
export type OtherKind = 'guias-remision' | 'retenciones' | 'percepciones' | 'liquidaciones-compra' | 'resumenes' | 'anulaciones';
export type DocKind = SaleKind | OtherKind;

export interface KindInfo<K extends string> {
  id: K;
  name: string;
  singular: string;
  icon: string;
  /** Descarga de PDF (resúmenes y anulaciones no tienen). */
  pdf: boolean;
}

export const SALE_KINDS: (KindInfo<SaleKind> & { code: string; payments: boolean })[] = [
  { id: 'facturas', name: 'Facturas', singular: 'Factura', icon: 'icon-file-text', code: '01', payments: true, pdf: true },
  { id: 'boletas', name: 'Boletas', singular: 'Boleta', icon: 'icon-file', code: '03', payments: true, pdf: true },
  { id: 'notas-credito', name: 'Notas de crédito', singular: 'Nota de crédito', icon: 'icon-corner-up-left', code: '07', payments: false, pdf: true },
  { id: 'notas-debito', name: 'Notas de débito', singular: 'Nota de débito', icon: 'icon-corner-up-right', code: '08', payments: false, pdf: true }
];

export const OTHER_KINDS: KindInfo<OtherKind>[] = [
  { id: 'guias-remision', name: 'Guías de remisión', singular: 'Guía de remisión', icon: 'icon-truck', pdf: true },
  { id: 'retenciones', name: 'Retenciones', singular: 'Retención', icon: 'icon-minus-circle', pdf: true },
  { id: 'percepciones', name: 'Percepciones', singular: 'Percepción', icon: 'icon-plus-circle', pdf: true },
  { id: 'liquidaciones-compra', name: 'Liquidaciones de compra', singular: 'Liquidación de compra', icon: 'icon-shopping-bag', pdf: true },
  { id: 'resumenes', name: 'Resúmenes diarios', singular: 'Resumen diario', icon: 'icon-layers', pdf: false },
  { id: 'anulaciones', name: 'Anulaciones', singular: 'Comunicación de baja / reversión', icon: 'icon-slash', pdf: false }
];

export function kindInfo(kind: DocKind): KindInfo<DocKind> {
  return (SALE_KINDS.find((k) => k.id === kind) ?? OTHER_KINDS.find((k) => k.id === kind)) as KindInfo<DocKind>;
}

export function isSaleKind(value: unknown): value is SaleKind {
  return SALE_KINDS.some((k) => k.id === value);
}

/** Archivo descargable (§9.6). */
export type DocFile = 'xml' | 'cdr' | 'pdf';

/**
 * ¿Hay archivo? Si el recurso trae `archivos`, se habilita solo lo que no es `null`; si no lo trae (retenciones,
 * percepciones, resúmenes), se ofrece y la API responde 404 con el motivo ("XML no disponible"…). En anulaciones se mira
 * `xml_path` / `cdr_path` (rutas internas que nunca se muestran). El PDF se genera al vuelo: se ofrece siempre que la vista
 * tenga PDF.
 */
export function fileAvailable(kind: DocKind, row: Json, file: DocFile): boolean {
  if (file === 'pdf') {
    return kindInfo(kind).pdf;
  }
  if (kind === 'anulaciones') {
    const path = row[file === 'xml' ? 'xml_path' : 'cdr_path'];
    return path === undefined || has(path);
  }
  if ('archivos' in row) {
    return has(obj(row['archivos'])[file]);
  }
  return true;
}

/** Nombre del archivo si la respuesta no trae `Content-Disposition`: `{serie}-{correlativo}.{ext}` (CDR con `R-`). */
export function fallbackFileName(row: Json, file: DocFile): string {
  const base = str(row['numero_completo'] || row['numero'] || row['identifier'])
    || [str(row['serie']), str(row['correlativo'])].filter(Boolean).join('-')
    || `documento-${str(row['id'] ?? row['id_resumen'] ?? row['id_anulacion'])}`;
  return file === 'xml' ? `${base}.xml` : file === 'cdr' ? `R-${base}.zip` : `${base}.pdf`;
}

/** Número que se muestra de un documento de cualquier vista. */
export function docNumber(row: Json): string {
  return str(row['numero_completo'] || row['numero'] || row['identifier'] || row['serie_nro'])
    || [str(row['serie']), str(row['correlativo'])].filter(Boolean).join('-');
}

/** Id del documento en su vista (resúmenes y anulaciones usan `id` en la fila y `id_resumen` / `id_anulacion` en el detalle). */
export function docId(row: Json): number | null {
  return num(row['id'] ?? row['id_resumen'] ?? row['id_anulacion']);
}

// ---------------------------------------------------------------- Bloques de presentación
export interface ViewCol {
  key: string;
  label: string;
  align?: 'end' | 'center';
  /** La celda se muestra como badge con la clase de `row.badges[key]`. */
  badge?: boolean;
}

export interface ViewRow {
  cells: Record<string, string>;
  badges?: Record<string, string>;
  /** Barras horizontales (0–100) por columna: gráfico simple sin librerías. */
  bars?: Record<string, number>;
  /** Documento que abre la fila (documentos recientes). */
  ref?: { kind: DocKind; id: number };
  /** Acciones de la fila (fase C: editar, eliminar…); `app-view-block` emite `rowAction` con `data`. */
  actions?: ViewRowAction[];
  /** El registro original (snake_case) que reciben las acciones. */
  data?: Json;
}

export interface ViewRowAction {
  id: string;
  label: string;
  icon: string;
  danger?: boolean;
}

export interface ViewTable {
  title?: string;
  icon?: string;
  columns: ViewCol[];
  rows: ViewRow[];
  total?: ViewRow;
  empty?: string;
}

export interface ViewItem {
  label: string;
  value: string;
  badge?: string;
}

export interface ViewGroup {
  title?: string;
  icon?: string;
  items: ViewItem[];
}

/** Tarjeta de indicador. */
export interface ViewStat {
  label: string;
  value: string;
  hint?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
}

/** Lo que muestra una sección (panel, configuración, reporte o detalle de documento). */
export interface ViewBlock {
  stats?: ViewStat[];
  groups?: ViewGroup[];
  tables?: ViewTable[];
  notes?: string[];
}

export function item(label: string, value: unknown, badge?: string): ViewItem {
  return { label, value: str(value), badge };
}

/** Quita los ítems sin valor. */
export function filled(items: ViewItem[]): ViewItem[] {
  return items.filter((i) => i.value !== '');
}

export function table(columns: ViewCol[], rows: ViewRow[], title?: string, empty?: string, icon?: string): ViewTable {
  return { columns, rows, title, empty, icon };
}

export function c(key: string, label: string, align?: 'end' | 'center', badge?: boolean): ViewCol {
  return { key, label, align, badge };
}
