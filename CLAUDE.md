# Portal API SUNAT (frontend) — reglas para el agente

Frontend Angular 22 (zoneless) del portal **público** de clientes de la API SUNAT: con él las personas de una empresa emisora
consultan sus comprobantes, su uso y su plan, y regeneran sus credenciales de la API. Habla **directo** con la API SUNAT
(`/api/portal/**`, `Source-code/Api-sunat-Backend`), sin pasar por la consola de plataforma ni por el ERP. Contrato y diseño:
`Docs/api-sunat-portal-clientes-diseno.md` (§5 endpoints, §3 seguridad, §8 pantallas). Fase C6 de la consola de plataforma
(`Docs/plataforma-consola-arquitectura.md`). Nació el 2026-11-24 como copia recortada de `Api-sunat-Frontend` (el panel
**interno**, `ng serve` en 4220): mismo login con MFA, mismas piezas de listado, misma plantilla visual; sin nada de
administración interna.

## Reglas generales

- Hablar con el usuario en español. No usar git. Leer un archivo completo antes de borrarlo o sobrescribirlo.
- Varios archivos usan `\r\n`: editar con la herramienta Edit o con un script de node que respete el fin de línea (no hay
  python).
- `eslint` marca `prefer-inject` en los constructores: es el estilo heredado del ERP, no un error nuevo.
- Programar contra el contrato: rutas, nombres de campo (camelCase), el sobre `{ succeeded, messages, data, totalRecords, errors }`.
  Un error de negocio llega como HTTP 200 con `succeeded: false`; 401 sesión; 404 empresa o comprobante ajeno; 429 límite;
  503 portal apagado. Un dato que el contrato no trae no se inventa: se deja fuera. **Excepción:** los comprobantes
  (`tenants/{id}/{tipo}` y su detalle) llevan en `data` el recurso de `/api/v1` tal cual, en **snake_case**: no se mapea; se lee
  con `obj` / `arr` / `str` / `num` de `private/pages/documents/tenant-views.models.ts`.
- Nunca se muestran secretos: la API no devuelve clave SOL, certificado, `api_secret` (salvo al regenerar), tokens ni hashes.
- **Solo consulta y credenciales.** El portal no emite, anula, corrige ni cobra; no agregar esas acciones (están fuera de
  alcance, §9 del diseño).
- **No es el panel interno:** no hay permisos, roles, `RoleGuard`, menú del servidor, empresas / planes / configuración /
  usuarios / auditoría / tablero interno / catálogos / consultas en vivo / emitir. No copiar de vuelta nada de eso.

## Seguridad (lo que no se negocia)

- **Un token del portal solo sirve en `/api/portal/**`** (JWT con `iss = api-sunat-portal`, `aud = portal`). Todas las rutas van
  bajo `portal/` en `shared/apis/endpoint.ts`; nunca `admin/`.
- **Sin datos personales en el navegador:** en localStorage solo `token`, `refreshToken` y `tokenExpiryTime`; en sessionStorage
  solo el id de la empresa elegida (`portal.tenantId`) y el motivo del último cierre de sesión. Nombre, correo y empresas salen de
  `GET portal/auth/me` y viven en memoria (`CurrentUserProfileService`). `removeLegacyStorageKeys` borra claves de permisos /
  menú por si otra app del mismo origen las dejó. El logout limpia localStorage y sessionStorage.
- **Aislamiento por empresa:** la empresa viaja siempre en la ruta (`portal/tenants/{id}/…`) y el id sale de `TenantContextService`,
  que solo acepta ids de las `tenants` de `auth/me` (si el guardado ya no está, toma la primera). Nunca un id escrito por el
  usuario ni leído de la URL. Un 404 de la empresa es un estado vacío amable (`app-portal-empty`), no un error.
- **Credenciales de la API de una sola vez:** `POST tenants/{id}/credenciales/regenerar { password, code }` (contraseña **y** código
  TOTP en el mismo pedido). `apiKey` / `apiSecret` pasan directo de la respuesta a `ApiCredentialsModalComponent`
  (`openApiCredentials`): copiar, descargar .txt, aviso fuerte y casilla "Ya los guardé" obligatoria para cerrar (sin Esc ni clic
  afuera); al cerrar se borran del componente. **Nunca** en signals de pantalla, servicios, localStorage ni sessionStorage. La
  contraseña y el código se borran del formulario al enviar y al cambiar de empresa.
- **Activación (`/activar?token=`)**: el token se lee una vez y se **quita de la barra de direcciones** (`replaceUrl`); vive solo en
  memoria. Cualquier problema con el enlace (falta, inválido, usado, vencido) muestra el mismo mensaje genérico
  (`ACTIVATE_LINK_MESSAGE`); solo un error de la contraseña se muestra junto al campo. No devuelve tokens: al terminar se va al
  login, donde la primera vez se configura el MFA.
- **MFA obligatorio:** `sign-in` + `mfa-setup` (QR, clave a mano, códigos de recuperación). Sin "recordar dispositivo". El ticket MFA
  vive solo en memoria (`AuthService`). Sin "olvidé mi contraseña": la consola vuelve a invitar a la persona.
- **CSP estricta** (`script-src 'self'`, `connect-src 'self'`): nada de scripts en línea, `onload=`, `eval`, recursos de otro dominio
  ni enlaces `javascript:` (los enlaces de acción son `<a href="#">` y `AppComponent` les hace `preventDefault`). `angular.json`
  lleva `inlineCritical: false`. La API va por `/api` (mismo origen). **No hay vista previa del PDF** (un `<iframe>` desde un `blob:`
  exigiría `frame-src blob:`): el PDF, el XML y el CDR se descargan. Las fuentes e íconos se empaquetan desde `node_modules`. Un
  recurso externo nuevo exige ampliar la CSP a propósito.
- Sin mayúsculas forzadas en los campos de texto (el panel interno sí): aquí se escriben correos, contraseñas y códigos.

## Estructura

- `src/app/public/`: `sign-in` (login + MFA), `mfa-setup`, `activate` (`/activar`), `AuthService` (ticket MFA en memoria,
  renovación 2 min antes de vencer con una sola petición, logout con `fetch` keepalive que cierra todos los dispositivos) y el
  layout público. `AuthInterceptor` (en `shared/interceptors`): activate / login / refresh van sin bearer; ante 401 renueva una vez
  y repite.
- `src/app/private/`: layout (barra superior con la empresa — selector si `auth/me` trae varias —, menú lateral fijo `PORTAL_MENU`
  en `shared/service/menu-nav.service.ts`, footer) y `pages/`:
  - `home`: resumen (`tenants/{id}/resumen`): empresa, plan, barra del cupo del mes (80 % avisa, 100 % crítico; `-1` = sin límite),
    certificado (`OK` / `POR_VENCER` / `VENCIDO` / `ROTO` / `SIN_CERTIFICADO`, con aviso y días), aviso si la emisión está
    suspendida por falta de pago o la empresa está desactivada, accesos directos.
  - `documents`: lista por tipo (facturas, boletas, notas de crédito y de débito, guías, retenciones, percepciones y liquidaciones de
    compra) con filtros fecha desde / hasta, estado SUNAT, serie y texto (solo facturas y boletas); detalle en modal; descargas
    PDF (A4 / A5 / ticket) / XML / CDR. Resúmenes diarios y bajas **no** se ofrecen. Armado en funciones puras
    (`tenant-doc.views.ts`, `tenant-views.models.ts`) y `app-view-block`.
  - `usage`: `tenants/{id}/uso`: mes contra el cupo y 6 barras CSS (sin librerías) con su tabla.
  - `credentials`: regenerar (ver Seguridad). Con la empresa desactivada el formulario queda deshabilitado.
  - `account`: contraseña (`PUT portal/auth/password`; cierra todas las sesiones y vuelve al login), estado del MFA y regenerar
    los códigos de recuperación. Nombre y correo son solo lectura (los cambia la consola).
- `src/app/shared/`: `endpoint.ts`, `list-helpers`, `lima-dates`, `app-list-table`, `app-page-header`, `app-portal-empty`,
  `FileDownloadService`, `TenantContextService`, `CurrentUserProfileService`, política de contraseña (8–64 con mayúscula,
  minúscula, número y especial).
- `PortalDataService` (`private/pages/portal-data.service.ts`): todas las lecturas de `portal/tenants/{id}/…` y la regeneración.
  La fuente de `app-list-table` lee la empresa y el tipo en cada pedido.
- Una pantalla nueva: ruta en `private-routing.module.ts`, línea en `PORTAL_MENU`, y si lee datos de una empresa, `effect()` sobre
  `TenantContextService.tenantId()` para volver a pedirlos al cambiar de empresa.

## Convenciones heredadas

- Fechas: días `yyyy-MM-dd` (Lima) sin pasar por `new Date()` (`ymdToDisplay`, `ymToDisplay`); instantes ISO UTC con `isoToLima`.
- `app-list-table`: el servicio expone `GetAll(size, page, getInputs)`; tamaños 10 / 20 / 50 (tope del contrato); `records` / `numPage`.
- Los enlaces de acción de la plantilla son `<a href="#" (click)>`; nunca `href="javascript:…"`.

## Desarrollo

- `npm ci --legacy-peer-deps` (los peer deps del proyecto lo exigen).
- `ng serve`: http://localhost:4230 (ERP 4200, consola 4210, panel API SUNAT 4220). `proxy.conf.json` reenvía `/api` a la API SUNAT en
  `http://127.0.0.1:8081`.
- Comprobar: `npx ng build --configuration development` y `--configuration production` sin errores ni avisos nuevos.
- Producción: `apiUrl: '/api/'`; el nginx que sirva el portal reenvía `/api` a la API SUNAT (mismo origen, sin CORS) y pone la CSP
  estricta (ver `README.md`). La API debe tener `PORTAL_JWT_SECRET` o responde 503.
