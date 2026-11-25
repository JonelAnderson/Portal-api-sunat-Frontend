import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EmptyError, firstValueFrom } from 'rxjs';
import { serverMessages } from '@shared/functions/list-helpers';
import { AlertModalService } from '@shared/service/alert-modal.service';

/** Nombre del archivo de `Content-Disposition` (`filename*=UTF-8''…` o `filename="…"`); null si no viene. */
export function fileNameFromDisposition(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const star = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
    } catch {
      // Sigue con filename=
    }
  }
  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header);
  const name = (plain?.[2] ?? plain?.[1] ?? '').trim().replace(/^"|"$/g, '');
  // Sin rutas: solo el nombre.
  return name ? name.split(/[\\/]/).pop() || null : null;
}

/** Lee el sobre `{ succeeded, messages, errors }` de un cuerpo que llegó como blob (o texto u objeto). */
async function readEnvelope(body: unknown): Promise<{ messages?: string[] | string; errors?: { errorMessage?: string }[] } | null> {
  try {
    if (body instanceof Blob) {
      const text = await body.text();
      return text ? JSON.parse(text) : null;
    }
    if (typeof body === 'string') {
      return body ? JSON.parse(body) : null;
    }
    return body && typeof body === 'object' ? (body as { messages?: string[] }) : null;
  } catch {
    return null;
  }
}

/**
 * Descarga de archivos de la API (XML, CDR, PDF de §9.6): pide el archivo como `blob` con la respuesta completa, toma el
 * nombre de `Content-Disposition` (o el nombre de respaldo) y dispara la descarga del navegador. Si la respuesta es JSON
 * (formato inválido) o un error (404 "XML no disponible"…), lee el sobre y muestra sus `messages`. El bearer lo pone
 * `AuthInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class FileDownloadService {
  private http = inject(HttpClient);
  private alerts = inject(AlertModalService);

  /**
   * Pide el archivo sin mostrar nada: `{ blob, name, type }` si llegó, o `{ error, status, warning }` con el mensaje del sobre
   * (status -1 = sesión vencida: AuthInterceptor ya volvió al login y no hay nada que mostrar). Lo usan la descarga y la vista
   * previa del PDF (que lo muestra en un `<iframe>` desde un `blob:`).
   */
  async fetchBlob(url: string, params?: Record<string, string>): Promise<FetchedFile | FetchError> {
    let resp: HttpResponse<Blob>;
    try {
      resp = await firstValueFrom(this.http.get(url, {
        params: params ? new HttpParams({ fromObject: params }) : undefined,
        responseType: 'blob',
        observe: 'response'
      }));
    } catch (err) {
      if (err instanceof EmptyError) {
        return { error: '', status: -1, warning: true };
      }
      const body = err instanceof HttpErrorResponse ? err.error : null;
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      const envelope = await readEnvelope(body);
      const fallback = status === 404 ? 'El archivo no está disponible.' : status === 0 ? 'No se pudo conectar con la API.'
        : status === 429 ? 'Demasiadas peticiones seguidas. Espere un minuto y vuelva a intentarlo.' : 'No se pudo descargar el archivo.';
      return { error: serverMessages(envelope, fallback), status, warning: status === 404 || status === 429 };
    }

    const blob = resp.body;
    const type = (resp.headers.get('Content-Type') ?? blob?.type ?? '').toLowerCase();
    if (!blob || type.includes('application/json')) {
      // HTTP 200 con el sobre: formato inválido, topes del ZIP, validación…
      const envelope = await readEnvelope(blob);
      return { error: serverMessages(envelope, 'La API no devolvió el archivo.'), status: resp.status, warning: true };
    }
    return { blob, type, name: fileNameFromDisposition(resp.headers.get('Content-Disposition')) };
  }

  /** true si se descargó. Si la API respondió con un error o con el sobre, muestra sus `messages`. */
  async download(url: string, fallbackName: string, params?: Record<string, string>): Promise<boolean> {
    const result = await this.fetchBlob(url, params);
    if ('error' in result) {
      if (result.status !== -1) {
        await this.alerts.showNotification(result.warning ? 'Atención' : 'Error', result.error, result.warning ? 'warning' : 'danger');
      }
      return false;
    }
    this.saveBlob(result.blob, result.name ?? fallbackName);
    return true;
  }

  /** Dispara la descarga del navegador de un blob ya recibido (p. ej. el CDR en base64 de la consulta en vivo). */
  saveBlob(blob: Blob, name: string): void {
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = name;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
}

export interface FetchedFile {
  blob: Blob;
  /** Content-Type en minúsculas. */
  type: string;
  /** Nombre de `Content-Disposition` (null si no vino). */
  name: string | null;
}

export interface FetchError {
  error: string;
  /** HTTP; -1 = sesión vencida (ya se volvió al login). */
  status: number;
  /** true = aviso (404, 429, sobre con `succeeded: false`); false = error. */
  warning: boolean;
}

/** base64 (sin cabecera `data:`) → Blob. */
export function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}
