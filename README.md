# Portal API SUNAT (frontend)

Portal público de clientes de la API SUNAT (Angular 22, zoneless): activar la cuenta con el enlace de la invitación, iniciar
sesión con verificación en dos pasos, ver el resumen de la empresa, sus comprobantes (con PDF / XML / CDR), el uso del mes y
regenerar las credenciales de la API. Solo consulta y credenciales: no emite ni anula.

Contrato y diseño: `Docs/api-sunat-portal-clientes-diseno.md`. Reglas para quien edite el código: `CLAUDE.md`.

## Desarrollo

```
npm ci --legacy-peer-deps
npx ng serve            # http://localhost:4230 ; /api -> http://127.0.0.1:8081 (API SUNAT)
npx ng build --configuration production
```

La API SUNAT necesita `PORTAL_JWT_SECRET` (≥ 32 bytes, distinta de `ADMIN_JWT_SECRET`); sin ella `/api/portal/**` responde 503.
Para probar el alta de una persona, la consola de plataforma invita a su correo (`POST /api/admin/portal/invitations`); el enlace
es `{Portal:PublicUrl}/activar?token=…`.

## Despliegue (resumen; el runbook va aparte)

- Sirve la carpeta `dist` con nginx (SPA: `try_files $uri /index.html`) y reenvía `/api` a la API SUNAT en el mismo origen: el
  frontend usa `apiUrl: '/api/'`, sin CORS.
- CSP recomendada (el portal no usa scripts en línea, `eval`, `javascript:` ni recursos de otros dominios):

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';
connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

  (`style-src 'unsafe-inline'`: Angular inyecta los estilos de los componentes en línea; `img-src data:` por el código QR del MFA.)
  Además `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y HSTS con HTTPS.
