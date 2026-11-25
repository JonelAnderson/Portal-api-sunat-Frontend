import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { environment as env } from '@envs/environment';
import { TableColumns } from '@shared/models/list-table.interface';
import { MenuItems } from '@shared/models/menu-items.interface';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { AlertModalService } from '@shared/service/alert-modal.service';

/**
 * Ayudantes de las pantallas del panel (listas con app-list-table y modales). Vienen del módulo Comercial de la consola
 * (Admin-saas-Frontend) y se comparten por todas las pantallas de este panel.
 */

/** Columna de app-list-table con los estilos de siempre. */
export function col<T>(label: string, property: keyof T | string, type: TableColumns<T>['type'] = 'text'): TableColumns<T> {
  return { label, cssLabel: ['font-bold', 'text-sm'], property, cssProperty: ['text-sm'], type, sticky: false, visible: true };
}

export function actionsCol<T>(): TableColumns<T> {
  return {
    label: 'ACCIONES', cssLabel: ['font-bold', 'text-sm', 'text-center'], property: 'actions', cssProperty: ['text-sm', 'text-center'],
    type: 'actions', sticky: false, visible: true, download: false
  };
}

/** Filtro de estado (`stateFilter` 1 / 0 del contrato). */
export const STATE_MENU: MenuItems[] = [
  { type: 'link', id: 'all', icon: 'layers', label: 'Todos' },
  { type: 'link', id: 'Activo', value: 1, icon: 'check-circle', label: 'Activo', class: { icon: 'text-success' } },
  { type: 'link', id: 'Inactivo', value: 0, icon: 'x-circle', label: 'Inactivo', class: { icon: 'text-danger' } }
];

/** Arma la parte de filtros de la URL (&clave=valor) con los valores no vacíos. */
export function query(values: Record<string, string | number | null | undefined>): string {
  return Object.entries(values)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `&${k}=${encodeURIComponent(String(v))}`)
    .join('');
}

/**
 * URL de un listado como la pide app-list-table: `records` / `numPage` (desde 1) / filtros. El panel no usa cursor
 * (`lastId` no está en el contrato), así que app-list-table siempre pagina por número.
 */
export function listUrl(path: string, size: number, page: number, getInputs: string): string {
  return `${env.apiUrl}${path}?records=${size}&numPage=${page + 1}${getInputs ?? ''}`;
}

/** Filas del sobre (`data`), siempre como arreglo. */
export function rows<T>(resp: BaseResponse): T[] {
  if (!Array.isArray(resp.data)) {
    resp.data = [];
  }
  return resp.data as T[];
}

export const MODAL_OPTIONS = { backdrop: 'static' as const, keyboard: false, centered: true, scrollable: true };

/** Abre un modal y ejecuta `onClose` si se cerró con un resultado (no con Cancelar). */
export function openModal<T>(modal: NgbModal, component: unknown, setup: (ref: NgbModalRef) => void, onClose: (result: T) => void,
  size?: 'lg' | 'xl'): void {
  const ref = modal.open(component, { ...MODAL_OPTIONS, size });
  setup(ref);
  ref.result.then((result: T) => {
    if (result) {
      onClose(result);
    }
  }).catch(() => undefined);
}

/** Mensajes del sobre (`messages` o `errors[].errorMessage`) en un solo texto. */
export function serverMessages(resp: { messages?: string[] | string; errors?: { errorMessage?: string }[] } | null | undefined,
  fallback: string): string {
  const errors = Array.isArray(resp?.errors) ? resp!.errors!.map((e) => e?.errorMessage).filter(Boolean) : [];
  if (errors.length) {
    return errors.join(' ');
  }
  const messages = resp?.messages;
  if (Array.isArray(messages) && messages.length) {
    return messages.join(' ');
  }
  return typeof messages === 'string' && messages ? messages : fallback;
}

/** Ejecuta una acción del servidor y avisa el resultado; `done` se llama solo si salió bien. */
export function runAction(alerts: AlertModalService, call: Observable<BaseResponse>, failText: string, done: (resp: BaseResponse) => void,
  okText = 'Operación realizada.'): void {
  call.subscribe({
    next: async (resp) => {
      if (resp.succeeded) {
        done(resp);
        await alerts.showNotification('Listo', serverMessages(resp, okText), 'success');
      } else {
        await alerts.showNotification('Atención', serverMessages(resp, failText), 'warning');
      }
    },
    error: async (err) => {
      await alerts.showNotification('Error', serverMessages(err?.error, failText), 'danger');
    }
  });
}

/** Número con separador de miles (es-PE). */
export function formatNumber(value?: number | null): string {
  return value == null ? '' : value.toLocaleString('es-PE');
}
