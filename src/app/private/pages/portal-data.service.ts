import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment as env } from '@envs/environment';
import { endpoint } from '@shared/apis/endpoint';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { listUrl, rows } from '@shared/functions/list-helpers';
import { FetchError, FetchedFile, FileDownloadService } from '@shared/service/file-download.service';
import { DocFile, DocKind, Json, fallbackFileName } from './documents/tenant-views.models';

export type QueryValues = Record<string, string | number | null | undefined>;

/** Lo que pide app-list-table: `GetAll(size, page, getInputs)`. */
export interface ListSource {
  GetAll(size: number, page: number, getInputs: string): Observable<BaseResponse>;
}

function params(values?: QueryValues): HttpParams | undefined {
  if (!values) {
    return undefined;
  }
  let p = new HttpParams();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') {
      p = p.set(k, String(v));
    }
  });
  return p;
}

/** Respuesta vacía de un listado cuando aún no hay empresa elegida. */
const EMPTY_LIST: BaseResponse = { succeeded: true, data: [], messages: [], totalRecords: 0, errors: null };

/**
 * Datos de la empresa elegida (`GET portal/tenants/{id}/…`, contrato §5): resumen, uso, comprobantes y sus archivos, y la
 * regeneración de credenciales. La empresa viaja siempre en la ruta y sale de `TenantContextService` (las del usuario); si no
 * es suya, la API responde 404. Solo lectura, salvo `regenerateCredentials`.
 */
@Injectable({ providedIn: 'root' })
export class PortalDataService {
  private http = inject(HttpClient);
  private files = inject(FileDownloadService);

  private path(tenantId: number, view: string): string {
    return `${endpoint.TENANTS}/${tenantId}/${view}`;
  }

  /** `data` de `tenants/{id}/resumen`. */
  summary(tenantId: number): Observable<BaseResponse> {
    return this.get(tenantId, 'resumen');
  }

  /** `data` de `tenants/{id}/uso`. */
  usage(tenantId: number): Observable<BaseResponse> {
    return this.get(tenantId, 'uso');
  }

  /** Una vista sin paginar (detalle de un comprobante, resumen, uso). */
  get(tenantId: number, view: string, values?: QueryValues): Observable<BaseResponse> {
    return this.http.get<BaseResponse>(`${env.apiUrl}${this.path(tenantId, view)}`, { params: params(values) });
  }

  /**
   * Fuente de app-list-table para un listado paginado de comprobantes. `tenantId` y `view` se leen en cada pedido (cambiar de
   * empresa o de tipo no recrea la fuente). Sin empresa devuelve una página vacía.
   */
  listSource(tenantId: () => number | null, view: () => string, decorate?: (row: Json) => void): ListSource {
    return {
      GetAll: (size: number, page: number, getInputs: string) => {
        const id = tenantId();
        if (id == null) {
          return of({ ...EMPTY_LIST, data: [] });
        }
        return this.http.get<BaseResponse>(listUrl(this.path(id, view()), size, page, getInputs)).pipe(
          map((resp) => {
            if (decorate) {
              rows<Json>(resp).forEach(decorate);
            }
            return resp;
          })
        );
      }
    };
  }

  /** XML, CDR o PDF de un comprobante por la ruta del portal (nunca por las URLs de `archivos`, que son de `/api/v1`). */
  download(tenantId: number, kind: DocKind, docId: number, file: DocFile, row: Json, pdfFormat = 'a4'): Promise<boolean> {
    const url = `${env.apiUrl}${this.path(tenantId, `${kind}/${docId}/${file}`)}`;
    // inline=0: descarga como archivo adjunto; el nombre sale de Content-Disposition (o el de respaldo).
    return this.files.download(url, fallbackFileName(row, file), file === 'pdf' ? { formato: pdfFormat, inline: '0' } : undefined);
  }

  /** Igual que `download` pero sin avisos: el blob o el error (la pantalla decide qué mostrar). */
  fetchFile(tenantId: number, kind: DocKind, docId: number, file: DocFile, pdfFormat = 'a4'): Promise<FetchedFile | FetchError> {
    const url = `${env.apiUrl}${this.path(tenantId, `${kind}/${docId}/${file}`)}`;
    return this.files.fetchBlob(url, file === 'pdf' ? { formato: pdfFormat, inline: '0' } : undefined);
  }

  /**
   * `POST tenants/{id}/credenciales/regenerar { password, code }`: pide la contraseña y el código TOTP en el mismo pedido
   * (step-up). `data` = `{ apiKey, apiSecret }`, una sola vez: el llamador lo pasa directo al modal y no lo conserva.
   */
  regenerateCredentials(tenantId: number, body: { password: string; code: string }): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${this.path(tenantId, 'credenciales/regenerar')}`, body);
  }
}
