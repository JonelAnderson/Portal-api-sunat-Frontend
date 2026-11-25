import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { environment as env } from '@envs/environment';
import { endpoint, httpOptions } from '@shared/apis/endpoint';
import { catchError, finalize, map, shareReplay, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import * as jwt_decode from 'jwt-decode';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { Login, MfaStage, TokenResponse } from '../models/login.interface';
import { SessionBootstrapService } from '@shared/service/session-bootstrap.service';

/** Motivo del cierre de sesión: se muestra una vez en el login (sobrevive al reload, no a cerrar la pestaña). */
const LOGOUT_REASON_KEY = 'portal.logoutReason';

/** Se renueva el token de acceso (30 min) cuando le quedan menos de 2 minutos. */
const REFRESH_MARGIN_MS = 2 * 60 * 1000;

export const SESSION_EXPIRED_MESSAGE = 'Su sesión venció o se cerró desde otro dispositivo. Inicie sesión nuevamente.';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /** Token de acceso actual (null sin sesión). */
  private user: BehaviorSubject<string | null>;

  /** Renovación en curso: todas las peticiones que la necesiten esperan la misma (un solo POST de refresh). */
  private refreshInFlight$: Observable<string> | null = null;
  private loggingOut = false;

  /**
   * Ticket del login en dos pasos (Fase 12a). Vive SOLO en memoria:
   * nunca se escribe en localStorage ni sessionStorage. Vence en el servidor a los 5 minutos.
   */
  private readonly _mfaTicket = signal<string | null>(null);
  private readonly _mfaStage = signal<MfaStage | null>(null);
  readonly mfaStage = this._mfaStage.asReadonly();

  constructor(
    private http: HttpClient,
    private _router: Router,
    private sessionBootstrap: SessionBootstrapService
  ) {
    if (typeof window !== 'undefined') {
      const storedToken = this.accessToken();
      this.user = new BehaviorSubject<string | null>(storedToken || null);
    }
  }

  /**
   * Paso 1: correo + contraseña (`POST portal/auth/login`). El portal no recuerda dispositivos: siempre pide el código. Solo guarda la sesión cuando la respuesta trae `token`;
   * si trae `mfaRequired` / `mfaSetupRequired`, guarda el ticket en memoria para el paso 2.
   */
  login(req: Login): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.LOGIN}`;
    this.clearMfa();

    return this.http.post<BaseResponse>(requestUrl, req, httpOptions).pipe(
      map((resp: BaseResponse) => this.handleTokenResponse(resp)),
      catchError(this.handleError)
    );
  }

  /**
   * Activa la cuenta con el token de la invitación (`POST portal/auth/activate`). No devuelve tokens: la persona entra después por
   * el login. Ante cualquier token inválido la API responde el mismo mensaje genérico; aquí no se distingue.
   */
  activate(body: { token: string; password: string; confirmPassword: string }): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.ACTIVATE}`, body, httpOptions).pipe(catchError(this.handleError));
  }

  /** Paso 2 (usuario con MFA): código de 6 dígitos o código de recuperación. */
  verifyMfa(payload: { code?: string; recoveryCode?: string }): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.LOGIN_MFA}`;
    const body = { mfaTicket: this._mfaTicket() ?? '', ...payload };
    return this.http.post<BaseResponse>(requestUrl, body, httpOptions).pipe(
      map((resp: BaseResponse) => this.handleTokenResponse(resp)),
      catchError(this.handleError)
    );
  }

  /** Enrolamiento: genera (o regenera) la clave y el URI otpauth. */
  mfaSetup(): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.LOGIN_MFA_SETUP}`;
    return this.http
      .post<BaseResponse>(requestUrl, { mfaTicket: this._mfaTicket() ?? '' }, httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** Enrolamiento: confirma el primer código; devuelve token + códigos de recuperación. */
  mfaSetupConfirm(code: string): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.LOGIN_MFA_SETUP_CONFIRM}`;
    const body = { mfaTicket: this._mfaTicket() ?? '', code };
    return this.http.post<BaseResponse>(requestUrl, body, httpOptions).pipe(
      map((resp: BaseResponse) => this.handleTokenResponse(resp)),
      catchError(this.handleError)
    );
  }

  /** Olvida el ticket del login en dos pasos. */
  clearMfa(): void {
    this._mfaTicket.set(null);
    this._mfaStage.set(null);
  }

  /** true si el mensaje del servidor indica que el ticket venció o ya no sirve. */
  isMfaTicketExpiredMessage(message: unknown): boolean {
    const text = (Array.isArray(message) ? message.join(' ') : String(message ?? '')).toLowerCase();
    return text.includes('venció') || text.includes('vencio') || text.includes('vuelva a iniciar sesión') || text.includes('expired');
  }

  private handleTokenResponse(resp: BaseResponse): BaseResponse {
    const data = (resp?.data ?? null) as TokenResponse | null;
    if (resp?.succeeded && data) {
      if (data.token) {
        this.clearMfa();
        this.saveSession(data);
      } else if (data.mfaTicket && (data.mfaRequired || data.mfaSetupRequired)) {
        this._mfaTicket.set(data.mfaTicket);
        this._mfaStage.set(data.mfaRequired ? 'verify' : 'setup');
      }
    }
    return resp;
  }

  /** Login completo: guarda los tokens y carga el perfil con las empresas (en memoria). */
  private saveSession(data: TokenResponse): void {
    this.storeTokens(data.token, data.refreshToken);
    this.sessionBootstrap.bootstrap().subscribe();
  }

  /** Mismo formato de siempre (JSON.stringify): los demás lectores de 'token' lo parsean. */
  private storeTokens(token: string, refreshToken: string | null | undefined): void {
    const decodedToken = jwt_decode.jwtDecode(token);
    const expTimestamp = (decodedToken.exp ?? 0) * 1000;

    localStorage.setItem('token', JSON.stringify(token));
    if (refreshToken) {
      localStorage.setItem('refreshToken', JSON.stringify(refreshToken));
    }
    localStorage.setItem('tokenExpiryTime', expTimestamp.toString());

    this.user?.next(token);
  }

  public get userToken(): string | null {
    if (this.user != null) {
      return this.user?.value || null;
    } else {
      return null;
    }
  }

  /** Token de acceso guardado (sin las comillas del JSON.stringify). */
  accessToken(): string | null {
    return readStored('token');
  }

  private refreshTokenValue(): string | null {
    return readStored('refreshToken');
  }

  /** true si al token le quedan menos de 2 minutos (o ya venció): hay que renovarlo antes de usarlo. */
  shouldRefresh(): boolean {
    const raw = localStorage.getItem('tokenExpiryTime');
    const expiry = raw ? parseInt(raw, 10) : NaN;
    return !Number.isFinite(expiry) || Date.now() >= expiry - REFRESH_MARGIN_MS;
  }

  isTokenExpired(tokenExpiryTime: number): boolean {
    return Date.now() > tokenExpiryTime;
  }

  /**
   * Renueva el token de acceso con el refresh token (que también rota). Una sola petición a la vez: las demás esperan
   * su resultado. Si falla pero otra pestaña ya guardó un token nuevo, se usa ese.
   */
  refreshSession(): Observable<string> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const token = this.accessToken();
    const refreshToken = this.refreshTokenValue();
    if (!token || !refreshToken) {
      return throwError(() => new Error(SESSION_EXPIRED_MESSAGE));
    }

    const requestUrl = `${env.apiUrl}${endpoint.REFRSHTOKEN}`;
    this.refreshInFlight$ = this.http.post<BaseResponse>(requestUrl, { token, refreshToken }, httpOptions).pipe(
      switchMap((resp: BaseResponse) => {
        const data = resp?.data as TokenResponse | null;
        if (!resp?.succeeded || !data?.token) {
          return throwError(() => new Error(SESSION_EXPIRED_MESSAGE));
        }
        this.storeTokens(data.token, data.refreshToken);
        return of(data.token);
      }),
      catchError((error) => {
        const current = this.accessToken();
        // Otra pestaña renovó primero (el refresh token rota): su token nuevo sirve aquí también.
        if (current && current !== token && !this.shouldRefresh()) {
          return of(current);
        }
        return throwError(() => error);
      }),
      finalize(() => (this.refreshInFlight$ = null)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.refreshInFlight$;
  }

  /**
   * Cerrar sesión: avisa al servidor (`POST portal/auth/logout`: revoca los refresh tokens e incrementa session_version, así
   * se cierra en TODOS los dispositivos)
   * y limpia este navegador. Con `notifyServer = false` solo limpia (la sesión ya no vale en el servidor).
   */
  logout(reason?: string, notifyServer = true) {
    if (this.loggingOut) {
      return;
    }
    this.loggingOut = true;

    const token = this.accessToken();
    if (notifyServer && token && typeof fetch !== 'undefined') {
      // keepalive: la petición sigue aunque la página se recargue enseguida.
      fetch(`${env.apiUrl}${endpoint.LOGOUT}`, {
        method: 'POST',
        keepalive: true,
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => undefined);
    }

    this.clearMfa();
    localStorage.clear();
    // El estado de la pestaña es del usuario que sale: el siguiente no lo hereda.
    try {
      sessionStorage.clear();
    } catch {
      // sin sessionStorage no hay nada que limpiar
    }
    if (reason) {
      try {
        sessionStorage.setItem(LOGOUT_REASON_KEY, reason);
      } catch {
        // sin sessionStorage el login solo no muestra el motivo
      }
    }
    this.user?.next(null);
    this._router.navigate(['login']);
    window.location.reload();
  }

  /** Motivo del último cierre de sesión (se lee una sola vez). */
  consumeLogoutReason(): string | null {
    try {
      const reason = sessionStorage.getItem(LOGOUT_REASON_KEY);
      sessionStorage.removeItem(LOGOUT_REASON_KEY);
      return reason;
    } catch {
      return null;
    }
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Sobre del contrato también en 401 / 403 / 429 / 503 (límite de intentos, portal apagado…).
      const messages = error?.error?.messages;
      errorMessage = Array.isArray(messages) && messages.length ? messages.join(' ')
        : error?.status === 429 ? 'Demasiados intentos. Espere un minuto y vuelva a intentarlo.'
        : error?.status === 503 ? 'El portal no está disponible por ahora. Intente más tarde.'
        : 'No se pudo conectar con la API.';
    }
    return throwError(() => new Error(errorMessage));
  }
}

/** Lee un token de localStorage: se guarda con JSON.stringify, pero se acepta también el valor plano. */
function readStored(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const stored = localStorage.getItem(key);
  if (!stored) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored);
    return typeof parsed === 'string' ? parsed : stored;
  } catch {
    return stored;
  }
}
