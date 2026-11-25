import { Component, input, signal } from '@angular/core';
import { copyToClipboard, downloadRecoveryCodes, recoveryCodesText } from '@shared/functions/recovery-codes';

/** Muestra los códigos de recuperación del MFA con Copiar y Descargar .txt (Fase 12a). */
@Component({
  selector: 'app-recovery-codes',
  template: `
    <div class="alert alert-warning small mb-3 text-start">
      Guarde estos códigos: <strong>solo se muestran esta vez</strong>. Cada uno sirve una sola vez para entrar si pierde
      el teléfono.
    </div>
    <div class="row g-2 mb-3 recovery-codes">
      @for (code of codes(); track code) {
        <div class="col-6">
          <code class="d-block border rounded py-1 px-2 text-center bg-light">{{ code }}</code>
        </div>
      }
    </div>
    <div class="d-flex gap-2 justify-content-center flex-wrap">
      <button type="button" class="btn btn-outline-primary btn-sm" (click)="copy()">
        <em class="feather icon-copy me-1"></em>{{ copied() ? 'Copiados' : 'Copiar' }}
      </button>
      <button type="button" class="btn btn-outline-primary btn-sm" (click)="download()">
        <em class="feather icon-download me-1"></em>Descargar .txt
      </button>
    </div>
  `,
  styles: [
    `
      .recovery-codes code {
        font-size: 0.95rem;
        letter-spacing: 0.05em;
        color: inherit;
      }
    `
  ]
})
export class RecoveryCodesComponent {
  readonly codes = input<string[]>([]);
  readonly userName = input<string | undefined>(undefined);
  readonly copied = signal(false);

  async copy(): Promise<void> {
    const ok = await copyToClipboard(recoveryCodesText(this.codes(), this.userName()));
    this.copied.set(ok);
    if (ok) {
      setTimeout(() => this.copied.set(false), 2500);
    }
  }

  download(): void {
    downloadRecoveryCodes(this.codes(), this.userName());
  }
}
