import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '@shared/service/notification.service';
import { Router } from '@angular/router';
import { SharedModule } from '@shared/shared.module';
import { environment } from '@envs/environment';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { TokenResponse } from '../models/login.interface';
import { MfaSetupComponent } from '../mfa-setup/mfa-setup.component';

/** Etapas de la pantalla de login (Fase 12a). */
type SignInStage = 'credentials' | 'verify' | 'setup';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
  imports:[SharedModule, MfaSetupComponent]
})
export class SignInComponent implements OnInit {
QAEnvironment: boolean;

  isLoading = signal(false);

  /** Por qué se cerró la sesión anterior (vencida, revocada, inactividad, cambio de contraseña). */
  sessionNotice = signal<string | null>(null);

  /** Usuario sin sugerencias del historial del navegador: nombre aleatorio por carga y solo lectura hasta enfocarlo. */
  readonly userFieldName = 'erp-u-' + Math.random().toString(36).slice(2, 10);
  userReadonly = signal(true);

  /** Paso actual: credenciales, código MFA o enrolamiento. */
  stage = signal<SignInStage>('credentials');
  /** En el paso de código: true = código de recuperación en lugar del de la app. */
  useRecoveryCode = signal(false);
  mfaCode = signal('');
  recoveryCode = signal('');

  prefix = environment.production ? false : true;

  showPassword: boolean = false;

  public invalidLogin: boolean = false;
  authForm: FormGroup;
  mostrarLoading: boolean = false;

  disableRegisterButton:boolean=false;
  userRoles: string='';
  submitted:boolean;

  constructor(private _fb: FormBuilder,
    customTitle: CustomTitleService,
    protected authService: AuthService,
    private router: Router,
    private _notificationService:NotificationService,
    private cd: ChangeDetectorRef
    ) {
    customTitle.set('Iniciar sesión');
    this.QAEnvironment = environment.isTestEnvironment;

  }

  ngOnInit(): void {
    this.sessionNotice.set(this.authService.consumeLogoutReason());
    this.initForm();
  }

  initForm(): void {
    this.authForm = this._fb.group({
      userName: ["", [Validators.required]],
      password: ["", [Validators.required]],
    });
  }

  get userNameValue(): string {
    return this.authForm?.get('userName')?.value ?? '';
  }

  login(): void {
    if (this.authForm.invalid) {
      this.submitted = true;
      return Object.values(this.authForm.controls).forEach((controls) => {
        controls.markAllAsTouched();
      });
    }
    this.disableRegisterButton=true;
    this.mostrarLoading = true;
    this.isLoading.set(true);

    this.authService.login(this.authForm.value).subscribe({
      next: (resp) => {
        this.disableRegisterButton = false;
        this.mostrarLoading = false;
        this.isLoading.set(false);

        const data = resp.data as TokenResponse | null;
        if (resp.succeeded && data?.token) {
          this.onLoggedIn(resp);
        } else if (resp.succeeded && data?.mfaRequired && data?.mfaTicket) {
          this.resetMfaInputs();
          this.stage.set('verify');
        } else if (resp.succeeded && data?.mfaSetupRequired && data?.mfaTicket) {
          this.stage.set('setup');
        } else {
          this._notificationService.showError(resp.messages, 'No se pudo ingresar');
        }
        this.cd.detectChanges();
      },
      error: (error) => {
        this.disableRegisterButton = false;
        this.mostrarLoading = false;
        this.isLoading.set(false);
        this.cd.detectChanges();
        this._notificationService.showError(error.message, 'No se pudo ingresar');
      }
    });
  }

  // ---- Paso 2: código de la app o de recuperación ----

  onMfaCodeInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const digits = (el.value ?? '').replace(/\D/g, '').slice(0, 6);
    el.value = digits;
    this.mfaCode.set(digits);
    if (digits.length === 6 && !this.isLoading()) {
      this.verifyMfa();
    }
  }

  onRecoveryCodeInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.recoveryCode.set((el.value ?? '').trim());
  }

  get recoveryCodeValid(): boolean {
    return /^[A-Za-z0-9]{5}-?[A-Za-z0-9]{5}$/.test(this.recoveryCode());
  }

  toggleRecoveryCode(): void {
    this.useRecoveryCode.update((v) => !v);
    this.mfaCode.set('');
    this.recoveryCode.set('');
  }

  verifyMfa(): void {
    if (this.isLoading()) {
      return;
    }
    const usingRecovery = this.useRecoveryCode();
    if (usingRecovery ? !this.recoveryCodeValid : this.mfaCode().length !== 6) {
      return;
    }
    const payload = usingRecovery ? { recoveryCode: this.recoveryCode() } : { code: this.mfaCode() };

    this.isLoading.set(true);
    this.authService.verifyMfa(payload).subscribe({
      next: (resp) => {
        this.isLoading.set(false);
        const data = resp.data as TokenResponse | null;
        if (resp.succeeded && data?.token) {
          if (usingRecovery && data.recoveryCodesLeft != null) {
            this._notificationService.showWarning(
              `Le quedan ${data.recoveryCodesLeft} códigos de recuperación. Puede generar nuevos en Mi cuenta.`,
              'Código de recuperación usado'
            );
          }
          this.onLoggedIn(resp);
        } else {
          this.onMfaError(resp.messages);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.onMfaError(error.message);
      }
    });
  }

  /** "Volver": descarta el ticket y regresa a usuario / contraseña. */
  backToCredentials(message?: string | null): void {
    this.authService.clearMfa();
    this.resetMfaInputs();
    this.authForm.get('password')?.reset('');
    this.stage.set('credentials');
    if (message) {
      this._notificationService.showWarning(message, 'Inicie sesión nuevamente');
    }
  }

  /** El asistente terminó: la sesión ya está guardada, solo falta navegar. */
  onSetupCompleted(): void {
    this.navigateAfterLogin();
    this._notificationService.showSuccess('Verificación en dos pasos activada.', 'Bienvenido');
  }

  private onMfaError(messages: unknown): void {
    const text = Array.isArray(messages) ? messages.join(' ') : String(messages ?? 'Código incorrecto.');
    this.mfaCode.set('');
    if (this.authService.isMfaTicketExpiredMessage(messages)) {
      this.backToCredentials(text);
      return;
    }
    this._notificationService.showError(text, 'No se pudo ingresar');
  }

  private resetMfaInputs(): void {
    this.useRecoveryCode.set(false);
    this.mfaCode.set('');
    this.recoveryCode.set('');
  }

  /** Tras recibir el token (AuthService ya guardó la sesión). */
  private onLoggedIn(resp: BaseResponse): void {
    this.navigateAfterLogin();
    this._notificationService.showSuccess(resp.messages, 'Bienvenido');
  }

  /** Todos los roles (superadmin / operador / soporte / lectura) entran al tablero; el menú ya viene filtrado por permisos. */
  private navigateAfterLogin(): void {
    this.router.navigate(['/private/home']);
  }

   getFormControl(controlName: string) {
      return this.authForm.get(controlName);
    }

    /** El error se muestra al intentar ingresar o si el usuario escribió y borró el campo (no por solo pasar por él). */
    isFieldInvalid(controlName: string): boolean {
      const control = this.getFormControl(controlName);
      return control ? control.invalid && (control.dirty || !!this.submitted) : false;
    }

    /** El tipo del campo lo cambia la plantilla ([type]). */
    togglePasswordVisibility() {
      this.showPassword = !this.showPassword;
    }

  /** Bloq Mayús activado mientras se escribe la contraseña (aviso, no bloquea). */
  capsLock = signal(false);

  onPasswordKey(event: KeyboardEvent): void {
    this.capsLock.set(!!event.getModifierState?.('CapsLock'));
  }

  onBlur() {
    this.capsLock.set(false);
  }

   getErrorMessage(controlName: string): string {
    const control = this.authForm.get(controlName);
    if (control.hasError('required')) {
      return 'Este campo es requerido';
    }

    if (control.hasError('minlength')) {
      return `Debe tener al menos ${control.getError('minlength').requiredLength} caracteres`;
    }

    if (control.hasError('maxlength')) {
      return `No puede tener más de ${control.getError('maxlength').requiredLength} caracteres`;
    }

    return '';
  }



}
