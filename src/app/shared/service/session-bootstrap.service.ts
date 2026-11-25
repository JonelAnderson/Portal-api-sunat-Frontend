import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CurrentUserProfileService } from '@shared/service/current-user-profile.service';

/**
 * Carga el perfil y las empresas del usuario (`GET portal/auth/me`), en memoria, después del login o al recargar una pantalla
 * privada. El portal no tiene permisos ni menú del servidor.
 */
@Injectable({ providedIn: 'root' })
export class SessionBootstrapService {
  constructor(private profile: CurrentUserProfileService) {}

  bootstrap(): Observable<boolean> {
    return this.profile.load().pipe(map(() => true));
  }

  hasStoredSession(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return !!localStorage.getItem('token');
  }
}
