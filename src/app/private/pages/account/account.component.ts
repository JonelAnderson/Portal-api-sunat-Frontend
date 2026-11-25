import { Component, computed, inject, signal } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { RecoveryCodesComponent } from '@shared/components/reusables/recovery-codes/recovery-codes.component';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { CurrentUserProfileService } from '@shared/service/current-user-profile.service';
import { MODAL_OPTIONS, serverMessages } from '@shared/functions/list-helpers';
import { MfaStatusResponse, RecoveryCodesResponse } from 'src/app/public/pages/login/models/login.interface';
import { AccountService } from './account.service';
import { ChangePasswordComponent } from './change-password.component';

/**
 * Mi cuenta (/private/account, desde el menú lateral y el del usuario): datos de `GET portal/auth/me` (solo lectura: el correo y
 * el nombre los cambia la consola de su proveedor), estado del MFA (`GET mfa/status`), regenerar los códigos de recuperación
 * (`POST mfa/recovery-codes` con el código actual) y cambiar la contraseña (`PUT password`). El MFA es obligatorio: no hay
 * opción de desactivarlo.
 */
@Component({
  selector: 'app-account',
  imports: [SharedModule, PageHeaderComponent, RecoveryCodesComponent],
  template: `
    <div class="row btn-page">
      <div class="col-lg-10 col-xl-8">
        <div class="card">
          <app-page-header icon="icon-user" title="MI CUENTA" subtitle="Sus datos de acceso, la verificación en dos pasos y su contraseña"></app-page-header>
          <div class="card-body">
            <section class="erp-form-section">
              <h6 class="erp-form-section__title"><em class="feather icon-user"></em>Datos</h6>
              @if (profile(); as p) {
              <dl class="row small mb-0">
                <dt class="col-sm-4">Nombre</dt><dd class="col-sm-8">{{ p.name || '—' }}</dd>
                <dt class="col-sm-4">Correo</dt><dd class="col-sm-8">{{ p.email || '—' }}</dd>
                <dt class="col-sm-4">Empresas</dt><dd class="col-sm-8">{{ p.tenants.length }}</dd>
              </dl>
              <p class="small text-muted mt-2 mb-0">Para cambiar su nombre o su correo, pídaselo a su proveedor.</p>
              } @else {
              <p class="small text-muted mb-0">No se pudieron cargar sus datos.</p>
              }
            </section>

            <section class="erp-form-section">
              <h6 class="erp-form-section__title"><em class="feather icon-smartphone"></em>Verificación en dos pasos</h6>
              @if (loading()) {
              <div class="erp-loading py-3" role="status"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span>Cargando…</div>
              } @else if (status(); as s) {
              <div class="d-flex align-items-center flex-wrap gap-2 mb-2">
                <span class="badge" [ngClass]="s.enabled ? 'badge-light-success' : 'badge-light-warning'">{{ s.enabled ? 'ACTIVA' : 'PENDIENTE' }}</span>
                <span class="small text-muted">App autenticadora (Google / Microsoft Authenticator)</span>
              </div>
              <p class="small mb-3">
                Códigos de recuperación disponibles: <strong>{{ s.recoveryCodesLeft }}</strong>
                @if (s.enabled && s.recoveryCodesLeft <= 3) {<span class="text-danger ms-1">(le quedan pocos, genere nuevos)</span>}
              </p>
              <div class="erp-callout mb-3" role="note">
                <em class="feather icon-info" aria-hidden="true"></em>
                <div>Es obligatoria y no se puede desactivar. Si pierde su teléfono y sus códigos, pida a su proveedor que la restablezca con una invitación nueva.</div>
              </div>
              @if (s.enabled) {
              @if (!showRegenerate()) {
              <button type="button" class="btn btn-outline-primary btn-sm" (click)="startRegenerate()">
                <em class="feather icon-refresh-cw me-1"></em>Regenerar códigos de recuperación
              </button>
              } @else {
              <div class="border rounded p-3 mb-2" style="max-width: 360px;">
                <label class="form-label small fw-semibold" for="mfaRegenCode">Código actual de la app (6 dígitos)</label>
                <input id="mfaRegenCode" type="text" class="form-control text-center mb-2" style="letter-spacing: 0.4em;" inputmode="numeric"
                  autocomplete="one-time-code" maxlength="6" placeholder="000000" [value]="code()" [disabled]="regenerating()"
                  (input)="onCodeInput($event)" (keydown.enter)="regenerate()" />
                <div class="d-flex gap-2 justify-content-end">
                  <button type="button" class="btn btn-light btn-sm" [disabled]="regenerating()" (click)="cancelRegenerate()">Cancelar</button>
                  <button type="button" class="btn btn-primary btn-sm" [disabled]="code().length !== 6 || regenerating()" (click)="regenerate()">
                    @if (regenerating()) {<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>}
                    Generar códigos
                  </button>
                </div>
              </div>
              }
              }
              @if (newCodes().length) {
              <div class="mt-3"><app-recovery-codes [codes]="newCodes()" [userName]="email()"></app-recovery-codes></div>
              }
              }
            </section>

            <section class="erp-form-section mb-0">
              <h6 class="erp-form-section__title"><em class="feather icon-lock"></em>Contraseña</h6>
              <p class="small text-muted mb-2">8 a 64 caracteres, con mayúscula, minúscula, número y carácter especial. Al cambiarla se cierra la
                sesión en todos sus dispositivos.</p>
              <button type="button" class="btn btn-outline-primary btn-sm" (click)="openChangePassword()">
                <em class="feather icon-lock me-1"></em>Cambiar contraseña
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AccountComponent {
  private account = inject(AccountService);
  private alerts = inject(AlertModalService);
  private modal = inject(NgbModal);
  private profileService = inject(CurrentUserProfileService);

  readonly profile = this.profileService.profile;
  readonly email = computed(() => this.profile()?.email ?? undefined);

  readonly loading = signal(true);
  readonly status = signal<MfaStatusResponse | null>(null);
  readonly showRegenerate = signal(false);
  readonly regenerating = signal(false);
  readonly code = signal('');
  readonly newCodes = signal<string[]>([]);

  constructor(title: CustomTitleService) {
    title.set('Mi cuenta');
    if (!this.profile()) {
      this.profileService.load().subscribe();
    }
    this.loadStatus();
  }

  loadStatus(): void {
    this.loading.set(true);
    this.account.mfaStatus().subscribe({
      next: (resp) => {
        this.loading.set(false);
        if (resp.succeeded) {
          this.status.set(resp.data as MfaStatusResponse);
        } else {
          void this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudo leer la verificación en dos pasos.'), 'warning');
        }
      },
      error: (err) => {
        this.loading.set(false);
        void this.alerts.showNotification('Atención', serverMessages(err?.error, 'No se pudo leer la verificación en dos pasos.'), 'warning');
      }
    });
  }

  startRegenerate(): void {
    this.newCodes.set([]);
    this.code.set('');
    this.showRegenerate.set(true);
  }

  cancelRegenerate(): void {
    this.code.set('');
    this.showRegenerate.set(false);
  }

  onCodeInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const digits = (el.value ?? '').replace(/\D/g, '').slice(0, 6);
    el.value = digits;
    this.code.set(digits);
  }

  async regenerate(): Promise<void> {
    if (this.code().length !== 6 || this.regenerating()) {
      return;
    }
    const confirmed = await this.alerts.show({
      title: '¿Generar nuevos códigos de recuperación?', message: 'Los códigos anteriores dejarán de servir.', type: 'warning',
      showCancel: true, confirmText: 'Sí, generar', cancelText: 'Cancelar'
    });
    if (!confirmed) {
      return;
    }
    this.regenerating.set(true);
    this.account.regenerateRecoveryCodes(this.code()).subscribe({
      next: (resp) => {
        this.regenerating.set(false);
        this.code.set('');
        const codes = (resp.data as RecoveryCodesResponse | null)?.recoveryCodes;
        if (resp.succeeded && Array.isArray(codes)) {
          this.newCodes.set(codes);
          this.showRegenerate.set(false);
          this.status.update((s) => (s ? { ...s, recoveryCodesLeft: codes.length } : s));
        } else {
          void this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudieron generar los códigos.'), 'warning');
        }
      },
      error: (err) => {
        this.regenerating.set(false);
        this.code.set('');
        void this.alerts.showNotification('Atención', serverMessages(err?.error, 'No se pudieron generar los códigos.'), 'warning');
      }
    });
  }

  openChangePassword(): void {
    this.modal.open(ChangePasswordComponent, MODAL_OPTIONS);
  }
}
