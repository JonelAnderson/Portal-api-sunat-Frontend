import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NavigationItem } from '@shared/models/navigation-item.interface';

/**
 * Menú lateral del portal: fijo en el código (no hay menú del servidor ni permisos). Las Urls cuelgan de `/private`.
 * Una pantalla nueva es una línea aquí y una ruta en `private-routing.module.ts`.
 */
export const PORTAL_MENU: NavigationItem[] = [
  {
    id: 'portal', title: 'Portal', type: 'group', icon: 'icon-group', children: [
      { id: 'home', title: 'Inicio', type: 'item', url: '/private/home', icon: 'icon-home', breadcrumbs: true },
      { id: 'documents', title: 'Comprobantes', type: 'item', url: '/private/documents', icon: 'icon-file-text', breadcrumbs: true },
      { id: 'usage', title: 'Uso del mes', type: 'item', url: '/private/usage', icon: 'icon-bar-chart-2', breadcrumbs: true },
      { id: 'credentials', title: 'Credenciales de la API', type: 'item', url: '/private/credentials', icon: 'icon-key', breadcrumbs: true },
      { id: 'account', title: 'Mi cuenta', type: 'item', url: '/private/account', icon: 'icon-user', breadcrumbs: true }
    ]
  }
];

@Injectable({ providedIn: 'root' })
export class MenuNavService {
  private navigationSubject = new BehaviorSubject<NavigationItem[]>(PORTAL_MENU);
  readonly navigation$ = this.navigationSubject.asObservable();
}
