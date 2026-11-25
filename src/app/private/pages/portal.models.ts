/**
 * Lo propio del portal (camelCase, contrato §5 de Docs/api-sunat-portal-clientes-diseno.md). Los comprobantes NO van aquí:
 * son el recurso de `/api/v1` en snake_case y se leen con `documents/tenant-views.models.ts`.
 */

/** `status` del certificado de `tenants/{id}/resumen`. */
export type CertificateStatus = 'OK' | 'POR_VENCER' | 'VENCIDO' | 'ROTO' | 'SIN_CERTIFICADO';

export interface CertificateInfo {
  status: CertificateStatus | string;
  /** yyyy-MM-dd; null sin certificado. */
  expiresOn: string | null;
  /** Días que faltan (negativo si ya venció); null sin certificado. */
  daysLeft: number | null;
}

/** `data` de `GET portal/tenants/{id}/resumen`. */
export interface TenantSummary {
  ruc: string;
  businessName: string;
  tradeName: string | null;
  environment: string | null;
  plan: string | null;
  planName: string | null;
  active: boolean;
  /** Emisión suspendida por falta de pago. */
  billingSuspended: boolean;
  documentsThisMonth: number | null;
  /** Cupo mensual; -1 = ilimitado (como en el panel); null = sin dato. */
  maxDocumentsMonth: number | null;
  certificate: CertificateInfo | null;
}

export interface UsageMonth {
  /** yyyy-MM */
  month: string;
  documents: number;
}

/** `data` de `GET portal/tenants/{id}/uso`: mes actual y los 5 anteriores en `history`. */
export interface TenantUsage {
  month: string;
  documents: number;
  maxDocuments: number | null;
  history: UsageMonth[];
}

/** `data` de `POST portal/tenants/{id}/credenciales/regenerar`: llegan una sola vez. */
export interface RegeneratedCredentials {
  apiKey: string;
  apiSecret: string;
}

/** Cupo ilimitado (el panel usa -1; null y 0 se tratan aparte en `quotaText`). */
export function isUnlimited(max: number | null | undefined): boolean {
  return max != null && max < 0;
}

/** "12 de 100", "12 (sin límite)" o "12". */
export function quotaText(used: number | null | undefined, max: number | null | undefined): string {
  const u = used ?? 0;
  if (isUnlimited(max)) {
    return `${u.toLocaleString('es-PE')} (sin límite)`;
  }
  return max != null && max > 0 ? `${u.toLocaleString('es-PE')} de ${max.toLocaleString('es-PE')}` : u.toLocaleString('es-PE');
}

/** Porcentaje usado del cupo (0–100); null si no hay cupo que medir. */
export function quotaPercent(used: number | null | undefined, max: number | null | undefined): number | null {
  if (max == null || max <= 0) {
    return null;
  }
  return Math.min(100, Math.round(((used ?? 0) / max) * 100));
}

/** Clase de color de la barra según lo usado: 80 % avisa, 100 % es crítico. */
export function quotaTone(percent: number | null): 'success' | 'warning' | 'danger' {
  return percent != null && percent >= 100 ? 'danger' : percent != null && percent >= 80 ? 'warning' : 'success';
}

const CERTIFICATE_TEXT: Record<string, { text: string; badge: string; icon: string }> = {
  OK: { text: 'Vigente', badge: 'badge-light-success', icon: 'icon-check-circle' },
  POR_VENCER: { text: 'Por vencer', badge: 'badge-light-warning', icon: 'icon-alert-triangle' },
  VENCIDO: { text: 'Vencido', badge: 'badge-light-danger', icon: 'icon-x-circle' },
  ROTO: { text: 'No se puede leer', badge: 'badge-light-danger', icon: 'icon-x-circle' },
  SIN_CERTIFICADO: { text: 'Sin certificado', badge: 'badge-light-secondary', icon: 'icon-minus-circle' }
};

export function certificateView(c: CertificateInfo | null | undefined): { text: string; badge: string; icon: string } {
  return CERTIFICATE_TEXT[c?.status ?? ''] ?? { text: c?.status || 'Sin dato', badge: 'badge-light-secondary', icon: 'icon-help-circle' };
}
