import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from "@angular/common/http";
import { inject } from "@angular/core";
import { endpoint } from "@shared/apis/endpoint";
import { AuthService, SESSION_EXPIRED_MESSAGE } from "src/app/public/pages/login/services/auth.service";
import { EMPTY, Observable, of, throwError } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";

/**
 * Agrega el bearer y el idioma. La empresa viaja en la ruta (`portal/tenants/{id}/…`), nunca en una cabecera.
 * - Si al token le quedan menos de 2 minutos, primero lo renueva (una sola renovación para todas las peticiones).
 * - Si el servidor responde 401 (sesión revocada por session_version: cierre de sesión en otro dispositivo, contraseña nueva), intenta
 *   renovar una vez y repite la petición; si no se puede, cierra la sesión y lo explica en el login.
 */
export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // activate, login, login/mfa, login/mfa/setup(/confirm) y refreshToken son anónimos: no llevan el bearer guardado
  // (y el refresh nunca dispara otro refresh).
  if (req.url.includes(endpoint.ACTIVATE) || req.url.includes(endpoint.LOGIN) || req.url.includes(endpoint.REFRSHTOKEN)) {
    return next(req);
  }

  const token = typeof window !== 'undefined' ? authService.accessToken() : null;
  if (!token) {
    return next(req);
  }

  const withAuth = (bearer: string): HttpRequest<unknown> =>
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${bearer}`,
        'Accept-Language': languageCode()
      }
    });

  const expire = (): Observable<never> => {
    authService.logout(SESSION_EXPIRED_MESSAGE, false);
    return EMPTY;
  };

  const ready$: Observable<string> = authService.shouldRefresh() ? authService.refreshSession() : of(token);

  return ready$.pipe(
    catchError(() => expire()),
    switchMap((bearer) =>
      next(withAuth(bearer)).pipe(
        catchError((error) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
            return throwError(() => error);
          }
          // 401 con token vigente: fue revocado en el servidor. Un intento de renovar y repetir.
          return authService.refreshSession().pipe(
            catchError(() => expire()),
            switchMap((renewed) =>
              next(withAuth(renewed)).pipe(
                catchError((retryError) =>
                  retryError instanceof HttpErrorResponse && retryError.status === 401 ? expire() : throwError(() => retryError)
                )
              )
            )
          );
        })
      )
    )
  );
};

function languageCode(): string {
  return 'es-PE';
}
