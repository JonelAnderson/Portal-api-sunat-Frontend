import { HttpHeaders } from "@angular/common/http";

/**
 * Rutas del portal de clientes de la API SUNAT (contrato: Docs/api-sunat-portal-clientes-diseno.md §5). Se concatenan a
 * `environment.apiUrl` (`/api/`). Todo cuelga de `portal/`: nunca de `admin/` (un token del portal no sirve allá).
 */
export const endpoint = {

  // AUTENTICACIÓN. AUTH_PUBLIC es el prefijo de las rutas anónimas (activar, login, login/mfa, login/mfa/setup(/confirm) y
  // refreshToken): el interceptor no les pone el bearer.
  ACTIVATE: 'portal/auth/activate',
  LOGIN: 'portal/auth/login',
  LOGIN_MFA: 'portal/auth/login/mfa',
  LOGIN_MFA_SETUP: 'portal/auth/login/mfa/setup',
  LOGIN_MFA_SETUP_CONFIRM: 'portal/auth/login/mfa/setup/confirm',
  REFRSHTOKEN: 'portal/auth/refreshToken',
  LOGOUT: 'portal/auth/logout',
  /** GET: `{ id, name, email, tenants: [{ id, ruc, businessName, tradeName, plan, active, billingSuspended }] }`. */
  ACCOUNT_ME: 'portal/auth/me',
  CHANGE_PASSWORD: 'portal/auth/password',
  MFA_STATUS: 'portal/auth/mfa/status',
  MFA_RECOVERY_CODES: 'portal/auth/mfa/recovery-codes',

  /**
   * Datos de la empresa `{id}` (la API SUNAT `tenant.id`, siempre una de las del usuario; si no, 404): tenants/{id}/resumen,
   * /uso, /{tipo}, /{tipo}/{docId}, /{tipo}/{docId}/(xml|cdr|pdf) y POST /credenciales/regenerar (las arma PortalDataService).
   */
  TENANTS: 'portal/tenants',

};

export const httpOptions = {
  headers: new HttpHeaders({
    "Content-Type": "application/json",
  }),
};
