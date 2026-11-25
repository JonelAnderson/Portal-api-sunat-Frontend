/**
 * Armado de lo que se muestra de cada documento de las vistas de empresa (§9.2 y §9.3): columnas y celdas del listado y
 * detalle en modal. Lee el recurso de `/api/v1` tal cual (snake_case). Nunca se muestran las claves internas (`tenant_id`,
 * `xml_path`, `cdr_path`) ni las URLs de `archivos`.
 */
import { TableColumns } from '@shared/models/list-table.interface';
import { col } from '@shared/functions/list-helpers';
import {
  DocKind, Json, ViewBlock, ViewCol, ViewGroup, ViewItem, ViewRow, ViewTable, arr, c, cpeTypeName, dayText, docNumber, filled,
  has, identityTypeName, instantText, item, kindInfo, money, num, obj, paymentBadge, paymentStatusName, percent, qty, str,
  sunatBadge, sunatStatusName, table
} from './tenant-views.models';

/** Claves que nunca se muestran (internas de la API o URLs de `/api/v1`). */
const HIDDEN_KEYS = new Set(['tenant_id', 'xml_path', 'cdr_path', 'pdf_path', 'archivos']);

const LABELS: Record<string, string> = {
  gravadas: 'Op. gravadas', exoneradas: 'Op. exoneradas', inafectas: 'Op. inafectas', exportacion: 'Exportación',
  gratuitas: 'Op. gratuitas', igv: 'IGV', isc: 'ISC', icbper: 'ICBPER', ivap: 'IVAP', otros_tributos: 'Otros tributos',
  total_impuestos: 'Total impuestos', valor_venta: 'Valor de venta', sub_total: 'Subtotal', total: 'Total',
  descuentos: 'Descuentos', anticipos: 'Anticipos', redondeo: 'Redondeo', porcentaje_igv: '% IGV', base_renta: 'Base renta',
  porcentaje_renta: '% renta', retencion_renta: 'Retención de renta', neto_a_pagar: 'Neto a pagar', tipo_doc: 'Tipo de documento',
  num_doc: 'Número de documento', razon_social: 'Razón social', direccion: 'Dirección', ubigeo: 'Ubigeo', codigo: 'Código',
  descripcion: 'Descripción', unidad: 'Unidad', cantidad: 'Cantidad', monto: 'Monto', porcentaje: 'Porcentaje', placa: 'Placa',
  nombres: 'Nombres', apellidos: 'Apellidos', licencia: 'Licencia', nombre: 'Nombre', fecha_pago: 'Fecha de pago',
  serie: 'Serie', correlativo: 'Correlativo', tipo: 'Tipo', cod_tipo: 'Código', monto_base: 'Base', factor: 'Factor',
  num_mtc: 'Registro MTC', cuenta_banco: 'Cuenta', medio_pago: 'Medio de pago', cod_bien: 'Código de bien'
};

function label(key: string): string {
  if (LABELS[key]) {
    return LABELS[key];
  }
  const text = key.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isAmountKey(key: string): boolean {
  return /^(mto_|imp_|monto|total|valor|precio|igv|isc|icbper|descuento|sub_total|gravadas|exoneradas|inafectas|gratuitas|neto|renta|retencion|base)/.test(key);
}

function cell(key: string, value: unknown): string {
  if (value != null && typeof value === 'object') {
    return Array.isArray(value) ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : str(v))).join(', ') : JSON.stringify(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }
  if (typeof value === 'number' && isAmountKey(key)) {
    return money(value);
  }
  if (/^fecha|_en$|_at$/.test(key)) {
    return /[+Z]/.test(str(value).substring(10)) ? instantText(value) : dayText(value);
  }
  return str(value);
}

/** Un objeto cualquiera como grupo de datos (transportista, vehículo, detracción…). */
function genericGroup(title: string, icon: string, value: unknown): ViewGroup | null {
  const o = obj(value);
  const items = Object.entries(o).filter(([k, v]) => !HIDDEN_KEYS.has(k) && has(v)).map(([k, v]) => item(label(k), cell(k, v)));
  return items.length ? { title, icon, items } : null;
}

/** Una lista de objetos cualquiera como tabla con la unión de sus claves. */
function genericTable(title: string, icon: string, value: unknown): ViewTable | null {
  const list = arr(value);
  if (!list.length) {
    return null;
  }
  const keys: string[] = [];
  list.forEach((o) => Object.keys(o).forEach((k) => {
    if (!HIDDEN_KEYS.has(k) && !keys.includes(k)) {
      keys.push(k);
    }
  }));
  const columns = keys.map((k) => c(k, label(k), list.some((o) => typeof o[k] === 'number') ? 'end' : undefined));
  return table(columns, list.map((o) => ({ cells: Object.fromEntries(keys.map((k) => [k, cell(k, o[k])])) })), title, undefined, icon);
}

/** Objeto o lista: lo que corresponda. */
function generic(block: ViewBlock, title: string, icon: string, value: unknown): void {
  if (!has(value)) {
    return;
  }
  if (Array.isArray(value)) {
    const t = arr(value).length ? genericTable(title, icon, value) : null;
    if (t) {
      block.tables!.push(t);
    } else {
      block.groups!.push({ title, icon, items: [item('Valor', value.map(str).join(', '))] });
    }
    return;
  }
  if (typeof value === 'object') {
    const g = genericGroup(title, icon, value);
    if (g) {
      block.groups!.push(g);
    }
    return;
  }
  block.groups!.push({ title, icon, items: [item(title, str(value))] });
}

function party(value: unknown, nameKey = 'razon_social'): ViewItem[] {
  const p = obj(value);
  const doc = has(p['num_doc']) ? `${identityTypeName(p['tipo_doc'])} ${str(p['num_doc'])}`.trim() : '';
  return filled([
    item('Documento', doc), item('Nombre / razón social', p[nameKey] ?? p['razon_social'] ?? p['nombre']), item('Dirección', p['direccion']),
    item('Ubigeo', p['ubigeo']), item('Correo', p['email']), item('Teléfono', p['telefono'])
  ]);
}

/** Notas u observaciones de SUNAT (lista de textos u objetos, o texto). */
function sunatNotes(value: unknown): string[] {
  if (!has(value)) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((n) => {
      const o = obj(n);
      return Object.keys(o).length ? [str(o['codigo'] ?? o['code']), str(o['descripcion'] ?? o['description'] ?? o['mensaje'])].filter(Boolean).join(' – ') || JSON.stringify(n) : str(n);
    }).filter(Boolean).map((n) => `Observación de SUNAT: ${n}`);
  }
  return [`Observación de SUNAT: ${str(value)}`];
}

function totals(value: unknown, currency: string): ViewItem[] {
  return Object.entries(obj(value)).filter(([, v]) => v != null && v !== '').map(([k, v]) => {
    const isPercent = k.startsWith('porcentaje');
    return item(label(k), typeof v === 'number' ? (isPercent ? percent(v) : money(v, currency)) : cell(k, v));
  });
}

function paymentsTable(list: unknown, currency: string): ViewTable {
  return table(
    [c('creado_en', 'Fecha'), c('metodo', 'Método'), c('monto', 'Monto', 'end'), c('referencia', 'Referencia'), c('monto_recibido', 'Recibido', 'end'),
      c('vuelto', 'Vuelto', 'end'), c('notas', 'Notas')],
    arr(list).map((p) => ({ cells: {
      creado_en: instantText(p['creado_en']), metodo: str(p['metodo']), monto: money(p['monto'], currency), referencia: str(p['referencia']),
      monto_recibido: money(p['monto_recibido']), vuelto: money(p['vuelto']), notas: str(p['notas'])
    } })),
    'Pagos registrados', 'Sin pagos registrados.', 'icon-credit-card'
  );
}

function itemsTable(items: unknown, currency: string, totalLabel: string): ViewTable | null {
  const list = arr(items);
  if (!list.length) {
    return null;
  }
  const optional = ['descuento', 'isc', 'icbper'].filter((k) => list.some((i) => has(i[k])));
  const columns: ViewCol[] = [
    c('codigo', 'Código'), c('descripcion', 'Descripción'), c('unidad', 'Unidad'), c('cantidad', 'Cantidad', 'end'),
    c('valor_unitario', 'Valor unit.', 'end'), c('precio_unitario', 'Precio unit.', 'end'),
    ...optional.map((k) => c(k, label(k), 'end')), c('igv', 'IGV', 'end'), c('total', totalLabel, 'end')
  ];
  const rows: ViewRow[] = list.map((i) => ({ cells: {
    codigo: str(i['codigo']), descripcion: str(i['descripcion']), unidad: str(i['unidad']), cantidad: qty(i['cantidad']),
    valor_unitario: money(i['valor_unitario']), precio_unitario: money(i['precio_unitario']),
    ...Object.fromEntries(optional.map((k) => [k, money(i[k])])), igv: money(i['igv']), total: money(i['total'], currency)
  } }));
  return table(columns, rows, 'Ítems', undefined, 'icon-list');
}

/** Lo que muestra el modal de detalle. */
export interface DocView {
  type: string;
  number: string;
  status?: { text: string; badge: string };
  total?: { label: string; value: string };
  block: ViewBlock;
  totals: ViewItem[];
}

function sunatGroup(s: Json): ViewGroup {
  return { title: 'SUNAT', icon: 'icon-send', items: filled([
    item('Estado', sunatStatusName(s['estado']), sunatBadge(s['estado'])), item('Código', s['codigo']), item('Descripción', s['descripcion']),
    item('Ticket', s['ticket']), item('Hash', s['hash_cpe']), item('Fecha del CDR', dayText(s['fecha_cdr']))
  ]) };
}

function saleView(kind: DocKind, d: Json): DocView {
  const currency = str(d['tipo_moneda']);
  const s = obj(d['sunat']);
  const isNote = kind === 'notas-credito' || kind === 'notas-debito';
  const block: ViewBlock = { groups: [], tables: [], notes: [] };
  block.groups!.push({ title: 'Comprobante', icon: 'icon-file-text', items: filled([
    item('Emisión', dayText(d['fecha_emision'])), item('Vencimiento', dayText(d['fecha_vencimiento'])), item('Moneda', currency),
    item('Tipo de operación', d['tipo_operacion']), item('Forma de pago', d['forma_pago']), item('Establecimiento', d['cod_local']),
    ...(has(d['estado_pago']) ? [item('Estado de pago', paymentStatusName(d['estado_pago']), paymentBadge(d['estado_pago'])),
      item('Monto pagado', money(d['monto_pagado'], currency))] : []),
    item('Enviado a SUNAT', instantText(d['enviado_en'])), item('Registrado', instantText(d['creado_en']))
  ]) });
  block.groups!.push({ title: 'Cliente', icon: 'icon-user', items: party(d['cliente']) });
  if (isNote && has(d['doc_afectado'])) {
    const a = obj(d['doc_afectado']);
    block.groups!.push({ title: 'Documento que modifica', icon: 'icon-link', items: filled([
      item('Tipo', cpeTypeName(a['tipo'])), item('Número', [str(a['serie']), str(a['correlativo'])].filter(Boolean).join('-')),
      item('Motivo', [str(a['motivo_codigo']), str(a['motivo_descripcion'])].filter(Boolean).join(' – '))
    ]) });
  }
  block.groups!.push(sunatGroup(s));
  const items = itemsTable(d['items'], currency, isNote ? 'Valor venta' : 'Total');
  if (items) {
    block.tables!.push(items);
  }
  generic(block, 'Cuotas', 'icon-calendar', d['cuotas']);
  generic(block, 'Detracción', 'icon-percent', d['detraccion']);
  generic(block, 'Percepción', 'icon-plus-circle', d['percepcion']);
  generic(block, 'Anticipos', 'icon-skip-back', d['anticipos']);
  generic(block, 'Descuentos globales', 'icon-tag', d['descuentos_globales']);
  generic(block, 'Guías relacionadas', 'icon-truck', d['guias']);
  generic(block, 'Datos adicionales', 'icon-plus-square', d['extras']);
  if (Array.isArray(d['pagos'])) {
    block.tables!.push(paymentsTable(d['pagos'], currency));
  }
  const extra = filled([item('Leyenda', d['leyenda']), item('Observación', d['observacion'])]);
  if (extra.length) {
    block.groups!.push({ title: 'Otros', icon: 'icon-align-left', items: extra });
  }
  block.notes = sunatNotes(s['notas']);
  return {
    type: kindInfo(kind).singular, number: docNumber(d), status: { text: sunatStatusName(s['estado']), badge: sunatBadge(s['estado']) },
    total: { label: 'Total', value: money(obj(d['totales'])['total'], currency) }, block, totals: totals(d['totales'], currency)
  };
}

const TRANSFER_MODES: Record<string, string> = { '01': 'Transporte público', '02': 'Transporte privado' };

function guideView(d: Json): DocView {
  const s = obj(d['sunat']);
  const e = obj(d['envio']);
  const dirs = obj(d['direcciones']);
  const block: ViewBlock = { groups: [], tables: [], notes: [] };
  block.groups!.push({ title: 'Guía', icon: 'icon-truck', items: filled([
    item('Tipo', cpeTypeName(d['tipo_documento'])), item('Emisión', dayText(d['fecha_emision'])), item('Bultos', qty(d['num_bultos'])),
    item('Observación', d['observacion']), item('Registrado', instantText(d['creado_en']))
  ]) });
  block.groups!.push({ title: 'Destinatario', icon: 'icon-user', items: party(d['destinatario']) });
  block.groups!.push({ title: 'Envío', icon: 'icon-package', items: filled([
    item('Motivo de traslado', e['cod_traslado']), item('Modalidad', TRANSFER_MODES[str(e['mod_traslado'])] ?? e['mod_traslado']),
    item('Fecha de traslado', dayText(e['fecha_traslado'])), item('Entrega al transportista', dayText(e['fecha_entrega_transportista'])),
    item('Peso total', [qty(e['peso_total']), str(e['und_peso_total'])].filter(Boolean).join(' '))
  ]) });
  ['partida', 'llegada'].forEach((k) => {
    const a = obj(dirs[k]);
    if (Object.keys(a).length) {
      block.groups!.push({ title: k === 'partida' ? 'Punto de partida' : 'Punto de llegada', icon: 'icon-map-pin',
        items: Object.entries(a).filter(([, v]) => has(v)).map(([key, v]) => item(label(key), cell(key, v))) });
    }
  });
  generic(block, 'Transportista', 'icon-briefcase', d['transportista']);
  generic(block, 'Vehículo', 'icon-truck', d['vehiculo']);
  generic(block, 'Conductor', 'icon-user-check', d['conductor']);
  block.groups!.push(sunatGroup(s));
  const items = genericTable('Bienes', 'icon-list', d['items']);
  if (items) {
    block.tables!.push(items);
  }
  block.notes = sunatNotes(s['notas']);
  return { type: kindInfo('guias-remision').singular, number: docNumber(d), status: { text: sunatStatusName(s['estado']), badge: sunatBadge(s['estado']) },
    block, totals: [] };
}

function retPerView(kind: 'retenciones' | 'percepciones', d: Json): DocView {
  const isRet = kind === 'retenciones';
  const block: ViewBlock = { groups: [], tables: [], notes: [] };
  block.groups!.push({ title: kindInfo(kind).singular, icon: 'icon-file-text', items: filled([
    item('Emisión', dayText(d['fecha_emision'])), item('Régimen', d['regimen']), item('Tasa', percent(d['tasa'])),
    item(isRet ? 'Importe retenido' : 'Importe percibido', money(d[isRet ? 'imp_retenido' : 'imp_percibido'])),
    item(isRet ? 'Importe pagado' : 'Importe cobrado', money(d[isRet ? 'imp_pagado' : 'imp_cobrado'])),
    item('Registrado', instantText(d['created_at']))
  ]) });
  block.groups!.push({ title: isRet ? 'Proveedor' : 'Cliente', icon: 'icon-user', items: party(d[isRet ? 'proveedor' : 'cliente']) });
  block.groups!.push({ title: 'SUNAT', icon: 'icon-send', items: filled([
    item('Estado', sunatStatusName(d['sunat_status']), sunatBadge(d['sunat_status'])), item('Código', d['sunat_code']),
    item('Descripción', d['sunat_description'])
  ]) });
  const docs = arr(d['documentos']);
  if (docs.length) {
    const dateKey = isRet ? 'fecha_retencion' : 'fecha_percepcion';
    const amountKey = isRet ? 'imp_retenido' : 'imp_percibido';
    const netKey = isRet ? 'imp_pagar' : 'imp_cobrar';
    block.tables!.push(table(
      [c('tipo_doc', 'Tipo'), c('num_doc', 'Número'), c('fecha_emision', 'Emisión'), c('imp_total', 'Importe total', 'end'), c('moneda', 'Moneda'),
        c(dateKey, isRet ? 'Fecha retención' : 'Fecha percepción'), c(amountKey, isRet ? 'Retenido' : 'Percibido', 'end'),
        c(netKey, isRet ? 'A pagar' : 'A cobrar', 'end')],
      docs.map((x) => ({ cells: {
        tipo_doc: cpeTypeName(x['tipo_doc']), num_doc: str(x['num_doc']), fecha_emision: dayText(x['fecha_emision']), imp_total: money(x['imp_total']),
        moneda: str(x['moneda']), [dateKey]: dayText(x[dateKey]), [amountKey]: money(x[amountKey]), [netKey]: money(x[netKey])
      } })), 'Documentos relacionados', undefined, 'icon-link'));
  }
  return { type: kindInfo(kind).singular, number: docNumber(d), status: { text: sunatStatusName(d['sunat_status']), badge: sunatBadge(d['sunat_status']) },
    total: { label: isRet ? 'Retenido' : 'Percibido', value: money(d[isRet ? 'imp_retenido' : 'imp_percibido']) }, block, totals: [] };
}

function settlementView(d: Json, payments: Json | null): DocView {
  const currency = str(d['tipo_moneda']);
  const s = obj(d['sunat']);
  const r = obj(d['reversion']);
  const block: ViewBlock = { groups: [], tables: [], notes: [] };
  block.groups!.push({ title: 'Liquidación', icon: 'icon-file-text', items: filled([
    item('Emisión', dayText(d['fecha_emision'])), item('Tipo de operación', d['tipo_operacion']), item('Moneda', currency),
    item('Productos agropecuarios', typeof d['productos_agropecuarios'] === 'boolean' ? (d['productos_agropecuarios'] ? 'Sí' : 'No') : d['productos_agropecuarios']),
    item('Placa del vehículo', d['placa_vehiculo']),
    ...(has(d['estado_pago']) ? [item('Estado de pago', paymentStatusName(d['estado_pago']), paymentBadge(d['estado_pago'])),
      item('Monto pagado', money(d['monto_pagado'], currency))] : []),
    item('Enviado a SUNAT', instantText(d['enviado_en'])), item('Registrado', instantText(d['creado_en']))
  ]) });
  block.groups!.push({ title: 'Vendedor', icon: 'icon-user', items: party(d['vendedor'], 'nombre') });
  generic(block, 'Lugar de la operación', 'icon-map-pin', d['lugar']);
  if (Object.keys(r).length) {
    block.groups!.push({ title: 'Reversión', icon: 'icon-rotate-ccw', items: filled([
      item('Plazo hasta', dayText(r['plazo_hasta'])), item('Disponible', typeof r['disponible'] === 'boolean' ? (r['disponible'] ? 'Sí' : 'No') : r['disponible'])
    ]) });
  }
  block.groups!.push(sunatGroup(s));
  const items = genericTable('Ítems', 'icon-list', d['items']);
  if (items) {
    block.tables!.push(items);
  }
  generic(block, 'Guías relacionadas', 'icon-truck', d['guias']);
  if (payments) {
    block.tables!.push(paymentsTable(payments['datos'], currency));
  }
  const extra = filled([item('Leyenda', d['leyenda']), item('Observación', d['observacion'])]);
  if (extra.length) {
    block.groups!.push({ title: 'Otros', icon: 'icon-align-left', items: extra });
  }
  block.notes = sunatNotes(s['notas']);
  return { type: kindInfo('liquidaciones-compra').singular, number: docNumber(d), status: { text: sunatStatusName(s['estado']), badge: sunatBadge(s['estado']) },
    total: { label: 'Neto a pagar', value: money(obj(d['totales'])['neto_a_pagar'], currency) }, block, totals: totals(d['totales'], currency) };
}

const SUMMARY_LINE_STATES: Record<string, string> = { '1': 'Adición', '2': 'Modificación', '3': 'Anulación' };

function summaryView(d: Json): DocView {
  const block: ViewBlock = { groups: [], tables: [], notes: [] };
  block.groups!.push({ title: 'Resumen diario', icon: 'icon-layers', items: filled([
    item('Tipo', d['tipo'] === 'anulacion' ? 'Anulación' : d['tipo'] === 'envio' ? 'Envío' : d['tipo']), item('Fecha de referencia', dayText(d['fecha_referencia'])),
    item('Fecha de envío', dayText(d['fecha_envio'])), item('Documentos', qty(d['total_documentos'])), item('Ticket', d['ticket']),
    item('Registrado', instantText(d['creado_en']))
  ]) });
  block.groups!.push({ title: 'SUNAT', icon: 'icon-send', items: filled([
    item('Estado', sunatStatusName(d['estado_sunat']), sunatBadge(d['estado_sunat'])), item('Código', d['codigo_sunat']),
    item('Descripción', d['descripcion_sunat'])
  ]) });
  const docs = arr(d['documentos']);
  if (docs.length) {
    block.tables!.push(table(
      [c('tipo', 'Tipo'), c('numero', 'Número'), c('estado', 'Operación'), c('cliente', 'Cliente'), c('gravadas', 'Gravadas', 'end'),
        c('exoneradas', 'Exoneradas', 'end'), c('inafectas', 'Inafectas', 'end'), c('gratuitas', 'Gratuitas', 'end'), c('igv', 'IGV', 'end'),
        c('total', 'Total', 'end'), c('sunat', 'SUNAT', undefined, true)],
      docs.map((x) => {
        const cl = obj(x['cliente']);
        return { cells: {
          tipo: cpeTypeName(x['tipo_documento']), numero: str(x['serie_nro']), estado: SUMMARY_LINE_STATES[str(x['estado'])] ?? str(x['estado']),
          cliente: has(cl['num_doc']) ? `${identityTypeName(cl['tipo_doc'])} ${str(cl['num_doc'])}` : '', gravadas: money(x['mto_oper_gravadas']),
          exoneradas: money(x['mto_oper_exoneradas']), inafectas: money(x['mto_oper_inafectas']), gratuitas: money(x['mto_oper_gratuitas']),
          igv: money(x['mto_igv']), total: money(x['total']), sunat: sunatStatusName(x['estado_sunat'])
        }, badges: { sunat: sunatBadge(x['estado_sunat']) } };
      }), 'Boletas del resumen', undefined, 'icon-list'));
  }
  block.notes = sunatNotes(d['notas_sunat']);
  return { type: kindInfo('resumenes').singular, number: str(d['identifier']),
    status: { text: sunatStatusName(d['estado_sunat']), badge: sunatBadge(d['estado_sunat']) }, block, totals: [] };
}

function voidedView(d: Json): DocView {
  const status = d['estado_sunat'] ?? d['sunat_status'];
  const block: ViewBlock = { groups: [], tables: [], notes: [] };
  const identifier = str(d['identifier']);
  block.groups!.push({ title: identifier.startsWith('RR-') ? 'Reversión' : 'Comunicación de baja', icon: 'icon-slash', items: filled([
    item('Correlativo', d['correlativo']), item('Fecha de generación', dayText(d['fecha_generacion'])),
    item('Fecha de comunicación', dayText(d['fecha_comunicacion'])), item('Documentos', qty(d['total_documentos'])), item('Ticket', d['ticket']),
    item('Motivo', d['motivo']), item('Registrado', instantText(d['creado_en'] ?? d['created_at'])),
    item('Actualizado', instantText(d['actualizado_en'] ?? d['updated_at']))
  ]) });
  block.groups!.push({ title: 'SUNAT', icon: 'icon-send', items: filled([
    item('Estado', sunatStatusName(status), sunatBadge(status)), item('Código', d['codigo_sunat'] ?? d['sunat_code']),
    item('Descripción', d['descripcion_sunat'] ?? d['sunat_description'])
  ]) });
  const lines = arr(d['detalles']);
  if (lines.length) {
    block.tables!.push(table([c('tipo', 'Tipo'), c('numero', 'Número'), c('motivo', 'Motivo')],
      lines.map((x) => ({ cells: {
        tipo: cpeTypeName(x['tipo_documento']), numero: [str(x['serie']), str(x['correlativo'])].filter(Boolean).join('-'), motivo: str(x['motivo'])
      } })), 'Documentos dados de baja', undefined, 'icon-list'));
  }
  block.notes = sunatNotes(d['notas_sunat'] ?? d['sunat_notes']);
  return { type: identifier.startsWith('RR-') ? 'Reversión' : 'Comunicación de baja', number: identifier,
    status: { text: sunatStatusName(status), badge: sunatBadge(status) }, block, totals: [] };
}

/** Detalle de cualquier documento. `row` (la fila del listado) completa lo que el detalle no trae (resúmenes, anulaciones). */
export function buildDocView(kind: DocKind, detail: Json, row: Json | null, payments: Json | null): DocView {
  const d: Json = { ...(row ?? {}), ...detail };
  switch (kind) {
    case 'guias-remision':
      return guideView(d);
    case 'retenciones':
    case 'percepciones':
      return retPerView(kind, d);
    case 'liquidaciones-compra':
      return settlementView(d, payments);
    case 'resumenes':
      return summaryView(d);
    case 'anulaciones':
      return voidedView(d);
    default:
      return saleView(kind, d);
  }
}

// ---------------------------------------------------------------- Listados (app-list-table)
/** Fila del listado con los campos "para la tabla" (prefijo `_`). `badgeColor` / `badgeColorTwo` los lee app-list-table. */
export function decorateRow(kind: DocKind): (row: Json) => void {
  return (r: Json) => {
    const set = (k: string, v: unknown) => (r[k] = v);
    const sunat = obj(r['sunat']);
    switch (kind) {
      case 'guias-remision': {
        const p = obj(r['destinatario']);
        set('_numero', docNumber(r));
        set('_fecha', dayText(r['fecha_emision']));
        set('_tercero', str(p['razon_social']));
        set('_terceroDoc', has(p['num_doc']) ? `${identityTypeName(p['tipo_doc'])} ${str(p['num_doc'])}` : '');
        set('_tipo', str(r['tipo_documento']) === '31' ? 'Transportista' : 'Remitente');
        set('_traslado', dayText(obj(r['envio'])['fecha_traslado']));
        set('_estado', sunatStatusName(sunat['estado']));
        set('badgeColor', sunatBadge(sunat['estado']));
        break;
      }
      case 'retenciones':
      case 'percepciones': {
        const isRet = kind === 'retenciones';
        const p = obj(r[isRet ? 'proveedor' : 'cliente']);
        set('_numero', docNumber(r));
        set('_fecha', dayText(r['fecha_emision']));
        set('_tercero', str(p['razon_social']));
        set('_terceroDoc', has(p['num_doc']) ? `${identityTypeName(p['tipo_doc'])} ${str(p['num_doc'])}` : '');
        set('_monto', money(r[isRet ? 'imp_retenido' : 'imp_percibido']));
        set('_tasa', percent(r['tasa']));
        set('_estado', sunatStatusName(r['sunat_status']));
        set('badgeColor', sunatBadge(r['sunat_status']));
        break;
      }
      case 'liquidaciones-compra': {
        const p = obj(r['vendedor']);
        set('_numero', docNumber(r));
        set('_fecha', dayText(r['fecha_emision']));
        set('_tercero', str(p['nombre']));
        set('_terceroDoc', has(p['num_doc']) ? `${identityTypeName(p['tipo_doc'])} ${str(p['num_doc'])}` : '');
        set('_total', money(obj(r['totales'])['neto_a_pagar'], str(r['tipo_moneda'])));
        set('_estado', sunatStatusName(sunat['estado']));
        set('badgeColor', sunatBadge(sunat['estado']));
        set('_pago', paymentStatusName(r['estado_pago']));
        set('badgeColorTwo', paymentBadge(r['estado_pago']));
        break;
      }
      case 'resumenes':
        set('_numero', str(r['identifier']));
        set('_tipo', r['tipo'] === 'anulacion' ? 'Anulación' : r['tipo'] === 'envio' ? 'Envío' : str(r['tipo']));
        set('_fechaRef', dayText(r['fecha_referencia']));
        set('_fechaEnvio', dayText(r['fecha_envio']));
        set('_docs', qty(r['total_documentos']));
        set('_estado', sunatStatusName(r['estado_sunat']));
        set('badgeColor', sunatBadge(r['estado_sunat']));
        set('_sunatText', str(r['descripcion_sunat']));
        break;
      case 'anulaciones':
        set('_numero', str(r['identifier']));
        set('_tipo', str(r['identifier']).startsWith('RR-') ? 'Reversión' : 'Baja');
        set('_fecha', dayText(r['fecha_comunicacion']));
        set('_docs', qty(r['total_documentos']));
        set('_motivo', str(r['motivo']));
        set('_estado', sunatStatusName(r['sunat_status']));
        set('badgeColor', sunatBadge(r['sunat_status']));
        set('_sunatText', str(r['sunat_description']));
        break;
      default: {
        const p = obj(r['cliente']);
        const a = obj(r['doc_afectado']);
        set('_numero', docNumber(r));
        set('_fecha', dayText(r['fecha_emision']));
        set('_tercero', str(p['razon_social']));
        set('_terceroDoc', has(p['num_doc']) ? `${identityTypeName(p['tipo_doc'])} ${str(p['num_doc'])}` : '');
        set('_total', money(obj(r['totales'])['total'], str(r['tipo_moneda'])));
        set('_estado', sunatStatusName(sunat['estado']));
        set('badgeColor', sunatBadge(sunat['estado']));
        set('_sunatText', [str(sunat['codigo']), str(sunat['descripcion'])].filter(Boolean).join(' – '));
        set('_pago', paymentStatusName(r['estado_pago']));
        set('badgeColorTwo', paymentBadge(r['estado_pago']));
        set('_afectado', Object.keys(a).length ? [str(a['serie']), str(a['correlativo'])].filter(Boolean).join('-') : '');
        set('_motivo', str(a['motivo_descripcion']));
      }
    }
  };
}

type Col = TableColumns<Json>;
const sub = (column: Col, subProperty: string): Col => ({ ...column, subProperty });
const tip = (column: Col, tooltip: string): Col => ({ ...column, tooltip });

/** Columnas del listado de cada tipo (sin la de acciones). */
export function listColumns(kind: DocKind): Col[] {
  const number = sub(col<Json>('NÚMERO', '_numero'), '_fecha');
  const state = tip(col<Json>('SUNAT', '_estado', 'badge'), '_sunatText');
  switch (kind) {
    case 'facturas':
    case 'boletas':
      return [number, sub(col<Json>('CLIENTE', '_tercero'), '_terceroDoc'), col('TOTAL', '_total'), state, col('PAGO', '_pago', 'badge-two')];
    case 'notas-credito':
    case 'notas-debito':
      return [number, sub(col<Json>('CLIENTE', '_tercero'), '_terceroDoc'), sub(col<Json>('MODIFICA', '_afectado'), '_motivo'), col('TOTAL', '_total'), state];
    case 'guias-remision':
      return [number, col('TIPO', '_tipo'), sub(col<Json>('DESTINATARIO', '_tercero'), '_terceroDoc'), col('TRASLADO', '_traslado'), col('SUNAT', '_estado', 'badge')];
    case 'retenciones':
    case 'percepciones':
      return [number, sub(col<Json>(kind === 'retenciones' ? 'PROVEEDOR' : 'CLIENTE', '_tercero'), '_terceroDoc'), col('TASA', '_tasa'),
        col(kind === 'retenciones' ? 'RETENIDO' : 'PERCIBIDO', '_monto'), col('SUNAT', '_estado', 'badge')];
    case 'liquidaciones-compra':
      return [number, sub(col<Json>('VENDEDOR', '_tercero'), '_terceroDoc'), col('NETO A PAGAR', '_total'), col('SUNAT', '_estado', 'badge'),
        col('PAGO', '_pago', 'badge-two')];
    case 'resumenes':
      return [sub(col<Json>('RESUMEN', '_numero'), '_tipo'), col('REFERENCIA', '_fechaRef'), col('ENVÍO', '_fechaEnvio'), col('DOCUMENTOS', '_docs'),
        tip(col<Json>('SUNAT', '_estado', 'badge'), '_sunatText')];
    case 'anulaciones':
      return [sub(col<Json>('IDENTIFICADOR', '_numero'), '_tipo'), col('COMUNICACIÓN', '_fecha'), col('DOCUMENTOS', '_docs'), col('MOTIVO', '_motivo'),
        tip(col<Json>('SUNAT', '_estado', 'badge'), '_sunatText')];
  }
}

/** ¿El id de la fila sirve para abrir el detalle? */
export function rowId(row: Json): number | null {
  return num(row['id']);
}
