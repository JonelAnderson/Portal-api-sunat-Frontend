import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CurrentUserProfileService, PortalTenant } from '@shared/service/current-user-profile.service';

/** Empresa elegida: solo su id, solo en sessionStorage (muere con la pestaña; el logout lo borra). */
const STORAGE_KEY = 'portal.tenantId';

/**
 * Empresa con la que trabaja el portal. Sale de las empresas de `GET portal/auth/me`: si la guardada ya no está en la lista
 * (le quitaron el acceso) o no hay ninguna elegida, se toma la primera. Nunca se acepta un id que no venga de la API.
 * Las pantallas leen `tenantId()` / `tenant()` y se vuelven a armar cuando cambia.
 */
@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private profile = inject(CurrentUserProfileService);
  private readonly chosen = signal<number | null>(readStored());

  readonly tenants = this.profile.tenants;
  readonly tenant = computed<PortalTenant | null>(() => {
    const list = this.tenants();
    return list.find((t) => t.id === this.chosen()) ?? list[0] ?? null;
  });
  readonly tenantId = computed(() => this.tenant()?.id ?? null);

  constructor() {
    effect(() => {
      const id = this.tenantId();
      try {
        if (id == null) {
          sessionStorage.removeItem(STORAGE_KEY);
        } else {
          sessionStorage.setItem(STORAGE_KEY, String(id));
        }
      } catch {
        // sin sessionStorage la elección vale solo mientras la pantalla siga abierta
      }
    });
  }

  select(id: number): void {
    if (this.tenants().some((t) => t.id === id)) {
      this.chosen.set(id);
    }
  }
}

function readStored(): number | null {
  try {
    const n = Number(sessionStorage.getItem(STORAGE_KEY));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
