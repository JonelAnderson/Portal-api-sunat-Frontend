import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { PasswordRequirementsComponent } from '@shared/components/reusables/password-requirements/password-requirements.component';
import { PASSWORD_MAX_LENGTH, PASSWORD_POLICY_MESSAGE, passwordPolicyValidator } from '@shared/validators/password-policy';
import { serverMessages } from '@shared/functions/list-helpers';
import { AuthService } from 'src/app/public/pages/login/services/auth.service';
import { AccountService } from './account.service';

function confirmMatches(group: AbstractControl): ValidationErrors | null {
  const confirm = group.get('confirmNewPassword');
  if (confirm && confirm.value && confirm.value !== group.get('newPassword')?.value) {
    confirm.setErrors({ mismatch: true });
  } else if (confirm?.hasError('mismatch')) {
    confirm.setErrors(null);
  }
  return null;
}

/** Cambiar la contraseña propia. Al terminar se cierra la sesión en todos los dispositivos y se vuelve al login. */
@Component({
  selector: 'app-change-password',
  imports: [SharedModule, PasswordRequirementsComponent],
  template: `
    <div class="modal-header">
      <h5 class="modal-title color-modal-title"><em class="feather icon-lock"></em>Cambiar contraseña</h5>
      <button type="button" class="btn-close" aria-label="Cerrar" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <form [formGroup]="form" class="erp-form" novalidate>
        <div class="mb-3">
          <label class="form-label" for="cp-current">Contraseña actual <span class="erp-required">*</span></label>
          <input id="cp-current" [type]="show ? 'text' : 'password'" class="form-control" formControlName="password"
            autocomplete="current-password" [class.is-invalid]="invalid('password')" />
          @if (invalid('password')) {<div class="invalid-feedback">Indique su contraseña actual.</div>}
        </div>
        <div class="mb-3">
          <label class="form-label" for="cp-new">Nueva contraseña <span class="erp-required">*</span></label>
          <input id="cp-new" [type]="show ? 'text' : 'password'" class="form-control" formControlName="newPassword" [attr.maxlength]="maxLength"
            autocomplete="new-password" [class.is-invalid]="invalid('newPassword')" />
          @if (invalid('newPassword')) {<div class="invalid-feedback">{{ policyMessage }}</div>}
        </div>
        <div class="mb-2">
          <label class="form-label" for="cp-confirm">Confirmar nueva contraseña <span class="erp-required">*</span></label>
          <input id="cp-confirm" [type]="show ? 'text' : 'password'" class="form-control" formControlName="confirmNewPassword"
            [attr.maxlength]="maxLength" autocomplete="new-password" [class.is-invalid]="invalid('confirmNewPassword')" />
          @if (invalid('confirmNewPassword')) {<div class="invalid-feedback">Las contraseñas no coinciden.</div>}
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="cp-show" [checked]="show" (change)="show = !show" />
          <label class="form-check-label" for="cp-show">Mostrar contraseñas</label>
        </div>
        <app-password-requirements [value]="form.get('newPassword')?.value"></app-password-requirements>
      </form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cancelar</button>
      <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="save()">
        @if (saving()) {<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>}
        Guardar
      </button>
    </div>
  `
})
export class ChangePasswordComponent {
  private authService = inject(AuthService);

  readonly maxLength = PASSWORD_MAX_LENGTH;
  readonly policyMessage = PASSWORD_POLICY_MESSAGE;
  readonly saving = signal(false);
  show = false;
  form: FormGroup;
  private submitted = false;

  constructor(private fb: FormBuilder, private account: AccountService, private alerts: AlertModalService, public activeModal: NgbActiveModal) {
    this.form = this.fb.group({
      password: ['', Validators.required],
      newPassword: ['', [Validators.required, passwordPolicyValidator]],
      confirmNewPassword: ['', Validators.required]
    }, { validators: confirmMatches });
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  save(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.account.changePassword(this.form.getRawValue()).subscribe({
      next: async (resp) => {
        this.saving.set(false);
        if (resp.succeeded) {
          this.activeModal.close(true);
          await this.alerts.showNotification('Contraseña actualizada',
            'Por seguridad se cerró la sesión en todos sus dispositivos. Ingrese con la nueva contraseña.', 'success');
          // La API ya revocó las sesiones (session_version): solo queda limpiar este navegador.
          this.authService.logout('Contraseña actualizada. Ingrese con la nueva contraseña.', false);
        } else {
          await this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudo cambiar la contraseña.'), 'warning');
        }
      },
      error: async (err) => {
        this.saving.set(false);
        await this.alerts.showNotification('Error', serverMessages(err?.error, 'No se pudo cambiar la contraseña.'), 'danger');
      }
    });
  }
}
