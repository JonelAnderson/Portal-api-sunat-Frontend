import { Component, Input, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { openModal } from '@shared/functions/list-helpers';
import { FileDownloadService } from '@shared/service/file-download.service';

/**
 * Abre el modal de una sola vez con lo que acaba de devolver la API. `values` no se guarda: el llamador lo pasa directo de la
 * respuesta y no lo conserva. `onClose` corre al cerrar con "Ya los guardé".
 */
export function openApiCredentials(modal: NgbModal, values: { title?: string; tenantLabel: string; ruc: string; apiKey: string; apiSecret: string;
  aviso?: string; closeText?: string }, onClose: () => void): void {
  openModal<boolean>(modal, ApiCredentialsModalComponent, (ref) => Object.assign(ref.componentInstance,
    Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined && v !== null))), () => onClose());
}

/**
 * Muestra **una sola vez** la `api_key` y el `api_secret` que devuelve "Regenerar credenciales"
 * (`POST portal/tenants/{id}/credenciales/regenerar`). Copiar y descargar .txt los usa en ese momento; no se guardan en ningún lado (ni estado, ni localStorage, ni
 * sessionStorage) y al cerrar se borran de este componente. Solo cierra con la casilla "Ya los guardé" marcada (sin Esc ni
 * clic afuera: `MODAL_OPTIONS`). Cierra con `true`.
 */
@Component({
  selector: 'app-api-credentials-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title color-modal-title"><em class="feather icon-key"></em>{{ title }}</h5>
    </div>
    <div class="modal-body">
      <p class="text-muted mb-2">{{ tenantLabel }}</p>
      <div class="alert alert-danger d-flex gap-2 align-items-start" role="alert">
        <em class="feather icon-alert-triangle mt-1" aria-hidden="true"></em>
        <div>
          <strong>Guárdelas ahora: el api_secret no se volverá a mostrar.</strong>
          <div class="small">{{ aviso || 'Si se pierde, regenérelas (las anteriores dejan de servir).' }}
            El portal no las guarda ni las envía por correo.</div>
        </div>
      </div>

      <label class="form-label" for="cred-key">X-Api-Key</label>
      <div class="input-group mb-3">
        <input id="cred-key" class="form-control font-monospace" [value]="apiKey" readonly autocomplete="off" spellcheck="false" />
        <button type="button" class="btn btn-outline-primary" (click)="copy('key')">
          <em class="feather {{ copied() === 'key' ? 'icon-check' : 'icon-copy' }} me-1"></em>{{ copied() === 'key' ? 'Copiado' : 'Copiar' }}
        </button>
      </div>

      <label class="form-label" for="cred-secret">X-Api-Secret</label>
      <div class="input-group mb-2">
        <input id="cred-secret" class="form-control font-monospace" [type]="showSecret() ? 'text' : 'password'" [value]="apiSecret" readonly
          autocomplete="off" spellcheck="false" />
        <button type="button" class="btn btn-outline-secondary" (click)="showSecret.set(!showSecret())"
          [attr.aria-label]="showSecret() ? 'Ocultar el secreto' : 'Mostrar el secreto'">
          <em class="feather {{ showSecret() ? 'icon-eye-off' : 'icon-eye' }}"></em>
        </button>
        <button type="button" class="btn btn-outline-primary" (click)="copy('secret')">
          <em class="feather {{ copied() === 'secret' ? 'icon-check' : 'icon-copy' }} me-1"></em>{{ copied() === 'secret' ? 'Copiado' : 'Copiar' }}
        </button>
      </div>
      @if (copyError()) {<div class="small text-danger mb-2">{{ copyError() }}</div>}

      <button type="button" class="btn btn-light btn-sm" (click)="downloadTxt()"><em class="feather icon-download me-1"></em>Descargar .txt</button>

      <div class="form-check mt-4">
        <input id="cred-saved" type="checkbox" class="form-check-input" [ngModel]="saved()" (ngModelChange)="saved.set($event)" />
        <label class="form-check-label fw-semibold" for="cred-saved">Ya los guardé en un lugar seguro</label>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-primary" [disabled]="!saved()" (click)="close()">{{ closeText }}</button>
    </div>
  `
})
export class ApiCredentialsModalComponent implements OnDestroy {
  private files = inject(FileDownloadService);
  readonly activeModal = inject(NgbActiveModal);

  @Input() title = 'Credenciales de la API';
  @Input() tenantLabel = '';
  @Input() ruc = '';
  @Input() apiKey = '';
  @Input() apiSecret = '';
  @Input() aviso = '';
  @Input() closeText = 'Cerrar';

  readonly saved = signal(false);
  readonly showSecret = signal(false);
  readonly copied = signal<'key' | 'secret' | ''>('');
  readonly copyError = signal('');

  async copy(which: 'key' | 'secret'): Promise<void> {
    this.copyError.set('');
    try {
      await navigator.clipboard.writeText(which === 'key' ? this.apiKey : this.apiSecret);
      this.copied.set(which);
    } catch {
      this.copyError.set('El navegador no permitió copiar: seleccione el texto y cópielo a mano (o descargue el .txt).');
    }
  }

  downloadTxt(): void {
    const text = [
      'CREDENCIALES DE LA API SUNAT',
      this.tenantLabel,
      '',
      `X-Api-Key: ${this.apiKey}`,
      `X-Api-Secret: ${this.apiSecret}`,
      '',
      'El api_secret no se puede volver a mostrar. Si lo pierde, regenere las credenciales desde el portal',
      '(las anteriores dejan de servir). Guarde este archivo en un lugar seguro y bórrelo después.'
    ].join('\r\n');
    this.files.saveBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `credenciales-api-${this.ruc || 'empresa'}.txt`);
  }

  close(): void {
    if (!this.saved()) {
      return;
    }
    this.wipe();
    this.activeModal.close(true);
  }

  ngOnDestroy(): void {
    this.wipe();
  }

  /** Borra los valores de este componente: no quedan en memoria del portal después de cerrar. */
  private wipe(): void {
    this.apiKey = '';
    this.apiSecret = '';
  }
}
