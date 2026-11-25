import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { TenantContextService } from '@shared/service/tenant-context.service';
import { tenantLabel } from '@shared/service/current-user-profile.service';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { PortalEmptyComponent } from '@shared/components/reusables/portal-empty/portal-empty.component';
import { serverMessages } from '@shared/functions/list-helpers';
import { PortalDataService } from '../portal-data.service';
import { RegeneratedCredentials } from '../portal.models';
import { openApiCredentials } from './api-credentials-modal.component';

/**
 * Credenciales de la API: regenerar la `X-Api-Key` y el `X-Api-Secret` de la empresa elegida (`POST
 * portal/tenants/{id}/credenciales/regenerar`). Pide la contraseña **y** el código TOTP en el mismo pedido (step-up), la
 * empresa tiene que estar activa y hay un límite de 3 regeneraciones por hora y por empresa. Las credenciales nuevas llegan una
 * sola vez: pasan directo de la respuesta al modal (`openApiCredentials`) y no se guardan en ningún servicio, signal, localStorage
 * ni sessionStorage. La contraseña y el código se borran del formulario al enviar.
 */
@Component({
  selector: 'app-credentials',
  imports: [FormsModule, PageHeaderComponent, PortalEmptyComponent],
  template: `
    <div class="row btn-page">
      <div class="col-lg-10 col-xl-8">
        <div class="card">
          <app-page-header icon="icon-key" title="CREDENCIALES DE LA API" subtitle="La clave y el secreto con los que su sistema usa la API"></app-page-header>
          <div class="card-body">
            @if (!context.tenant()) {
            <app-portal-empty icon="icon-briefcase" title="Su cuenta aún no tiene empresas vinculadas"
              text="Pida a su proveedor que vincule su acceso a una empresa emisora."></app-portal-empty>
            } @else if (context.tenant(); as t) {
            <p class="mb-3">Empresa: <strong>{{ label(t) }}</strong></p>

            <div class="alert alert-danger d-flex gap-2 align-items-start" role="alert">
              <em class="feather icon-alert-triangle mt-1" aria-hidden="true"></em>
              <div>
                <strong>Regenerar deja de servir las credenciales actuales en el mismo instante.</strong>
                <div class="small">Todo sistema que hoy use la clave y el secreto actuales (su facturador, su tienda en línea, sus integraciones) dejará de poder
                  emitir hasta que le pongan los nuevos. El secreto nuevo se muestra <strong>una sola vez</strong>: guárdelo antes de cerrar la ventana.
                  No se envía por correo ni queda en el portal.</div>
              </div>
            </div>

            @if (!t.active) {
            <div class="alert alert-warning" role="alert">La empresa está desactivada: no se pueden regenerar sus credenciales. Consulte con su proveedor.</div>
            }

            <form class="erp-form border rounded p-3" (ngSubmit)="regenerate()" novalidate autocomplete="off">
              <p class="small text-muted">Para confirmar que es usted, escriba su contraseña y el código de 6 dígitos de su app autenticadora. Puede regenerarlas
                hasta 3 veces por hora.</p>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label" for="cred-password">Contraseña <span class="erp-required">*</span></label>
                  <input id="cred-password" name="password" type="password" class="form-control" [(ngModel)]="password" autocomplete="current-password"
                    maxlength="64" [disabled]="sending() || !t.active" />
                </div>
                <div class="col-md-6">
                  <label class="form-label" for="cred-code">Código de la app (6 dígitos) <span class="erp-required">*</span></label>
                  <input id="cred-code" name="code" type="text" class="form-control" inputmode="numeric" autocomplete="one-time-code" maxlength="6"
                    placeholder="000000" [value]="code()" (input)="onCode($event)" [disabled]="sending() || !t.active" />
                </div>
              </div>
              <div class="form-check mt-3">
                <input id="cred-understand" name="understand" type="checkbox" class="form-check-input" [(ngModel)]="understand" [disabled]="sending() || !t.active" />
                <label class="form-check-label" for="cred-understand">Entiendo que las credenciales actuales dejarán de funcionar ahora mismo.</label>
              </div>
              @if (error()) {<div class="alert alert-warning mt-3 mb-0" role="alert">{{ error() }}</div>}
              <div class="mt-3">
                <button type="submit" class="btn btn-danger" [disabled]="!canSubmit()">
                  @if (sending()) {<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>}
                  <em class="feather icon-refresh-cw me-1" aria-hidden="true"></em>Regenerar credenciales
                </button>
              </div>
            </form>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class CredentialsComponent {
  private data = inject(PortalDataService);
  private modal = inject(NgbModal);
  readonly context = inject(TenantContextService);

  readonly label = tenantLabel;
  password = '';
  understand = false;
  readonly code = signal('');
  readonly sending = signal(false);
  readonly error = signal('');
  readonly canSubmit = computed(() => !this.sending() && this.code().length === 6 && !!this.context.tenant()?.active);

  constructor(title: CustomTitleService) {
    title.set('Credenciales de la API');
    // Cambiar de empresa descarta lo escrito: la contraseña y el código nunca se reutilizan con otra empresa.
    effect(() => {
      this.context.tenantId();
      untracked(() => this.reset());
    });
  }

  onCode(event: Event): void {
    const el = event.target as HTMLInputElement;
    const digits = (el.value ?? '').replace(/\D/g, '').slice(0, 6);
    el.value = digits;
    this.code.set(digits);
  }

  regenerate(): void {
    const tenant = this.context.tenant();
    if (!tenant || !tenant.active || this.sending() || !this.password || this.code().length !== 6) {
      this.error.set(this.password ? '' : 'Escriba su contraseña.');
      return;
    }
    if (!this.understand) {
      this.error.set('Marque la casilla para confirmar que entiende que las credenciales actuales dejarán de funcionar.');
      return;
    }
    this.error.set('');
    this.sending.set(true);
    const body = { password: this.password, code: this.code() };
    // Se borran del formulario antes de esperar la respuesta: no quedan en pantalla ni en el estado.
    this.reset(false);
    this.data.regenerateCredentials(tenant.id, body).subscribe({
      next: (resp) => {
        this.sending.set(false);
        const creds = resp.data as RegeneratedCredentials | null;
        if (resp.succeeded && creds?.apiKey && creds?.apiSecret) {
          // Directo de la respuesta al modal: nunca a una propiedad, un servicio ni un storage.
          openApiCredentials(this.modal, {
            title: 'Credenciales nuevas de la API', tenantLabel: tenantLabel(tenant), ruc: tenant.ruc,
            apiKey: creds.apiKey, apiSecret: creds.apiSecret,
            aviso: 'Las anteriores ya no sirven: actualice su sistema con estas.', closeText: 'Listo, ya las guardé'
          }, () => undefined);
        } else if (resp.succeeded) {
          this.error.set('Se regeneraron, pero la respuesta no trajo los valores. Vuelva a regenerarlas.');
        } else {
          this.error.set(serverMessages(resp, 'No se pudieron regenerar las credenciales.'));
        }
      },
      error: (err: HttpErrorResponse) => {
        this.sending.set(false);
        this.error.set(this.httpMessage(err));
      }
    });
  }

  private httpMessage(err: HttpErrorResponse): string {
    if (err.status === 429) {
      return serverMessages(err.error, 'Alcanzó el límite de 3 regeneraciones por hora para esta empresa. Intente de nuevo más tarde.');
    }
    if (err.status === 404) {
      return 'No encontramos esta empresa. Puede que ya no tenga acceso a ella.';
    }
    return serverMessages(err?.error, err.status === 0 ? 'No se pudo conectar con la API.' : 'No se pudieron regenerar las credenciales.');
  }

  /** Borra contraseña, código y confirmación (y, con `clearError`, el mensaje). */
  private reset(clearError = true): void {
    this.password = '';
    this.code.set('');
    this.understand = false;
    if (clearError) {
      this.error.set('');
    }
  }
}
