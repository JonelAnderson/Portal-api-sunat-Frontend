import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, lastValueFrom, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment as env } from '@envs/environment';
import { endpoint } from '@shared/apis/endpoint';
import { BaseResponse } from '@shared/models/base-api-response.interface';

/** Una empresa emisora vinculada al usuario (`tenants[]` de `GET portal/auth/me`). */
export interface PortalTenant {
  id: number;
  ruc: string;
  businessName: string;
  tradeName: string | null;
  plan: string | null;
  active: boolean;
  billingSuspended: boolean;
}

/** `data` de `GET portal/auth/me`. */
export interface PortalProfile {
  id: number | string;
  name: string | null;
  email: string | null;
  tenants: PortalTenant[];
}

/** Nombre con el que se muestra una empresa en los selectores y títulos. */
export function tenantLabel(t: Pick<PortalTenant, 'businessName' | 'tradeName' | 'ruc'>): string {
  return `${t.tradeName || t.businessName || 'Empresa'} (${t.ruc})`;
}

/**
 * Nombre, correo y empresas del usuario conectado. Salen de `GET portal/auth/me` y viven solo en memoria: el JWT no lleva
 * datos personales y nada de esto se guarda en localStorage.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUserProfileService {
  readonly profile = signal<PortalProfile | null>(null);
  /** true una vez que `auth/me` respondió (bien o mal): las pantallas ya pueden decidir qué mostrar. */
  readonly loaded = signal(false);
  readonly tenants = computed(() => this.profile()?.tenants ?? []);
  private inFlight: Promise<PortalProfile | null> | null = null;

  constructor(private http: HttpClient) {}

  load(): Observable<PortalProfile | null> {
    return this.http.get<BaseResponse>(`${env.apiUrl}${endpoint.ACCOUNT_ME}`).pipe(
      map((resp) => (resp?.succeeded && resp.data ? normalize(resp.data as PortalProfile) : null)),
      catchError(() => of(null)),
      tap((profile) => {
        this.profile.set(profile);
        this.loaded.set(true);
      })
    );
  }

  /** Pide el perfil si aún no se pidió (una sola petición aunque la pidan varios a la vez). */
  ensureLoaded(): Promise<PortalProfile | null> {
    if (this.loaded()) {
      return Promise.resolve(this.profile());
    }
    this.inFlight ??= lastValueFrom(this.load()).finally(() => (this.inFlight = null));
    return this.inFlight;
  }

  clear(): void {
    this.profile.set(null);
    this.loaded.set(false);
  }
}

function normalize(p: PortalProfile): PortalProfile {
  return { ...p, tenants: Array.isArray(p.tenants) ? p.tenants : [] };
}
