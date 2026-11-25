import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SharedModule } from '@shared/shared.module';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { NotificationService } from '@shared/service/notification.service';
import { PasswordRequirementsComponent } from '@shared/components/reusables/password-requirements/password-requirements.component';
import { PASSWORD_MAX_LENGTH, PASSWORD_POLICY_MESSAGE, passwordPolicyValidator } from '@shared/validators/password-policy';
import { AuthService } from '../login/services/auth.service';

/**
 * Mensaje único ante cualquier problema con el enlace (falta el token, es inválido, ya se usó o venció): la API responde igual
 * en todos los casos y aquí tampoco se distingue (no se revela si el enlace existió).
 */
export const ACTIVATE_LINK_MESSAGE = 'El enlace no es válido o ya venció. Pida a su proveedor una invitación nueva.';

function confirmMatches(group: AbstractControl): ValidationErrors | null {
  const confirm = group.get('confirmPassword');
  if (confirm && confirm.value && confirm.value !== group.get('password')?.value) {
    confirm.setErrors({ mismatch: true });
  } else if (confirm?.hasError('mismatch')) {
    confirm.setErrors(null);
  }
  return null;
}

/**
 * `/activar?token=…` (pública): la persona invitada fija su contraseña con el token del enlace del correo. `POST
 * portal/auth/activate` no devuelve tokens: al terminar se va al login, donde se configura la verificación en dos pasos.
 * El token se guarda solo en memoria y se quita de la barra de direcciones al abrir la pantalla (no queda en el historial
 * ni en el Referer).
 */
@Component({
  selector: 'app-activate',
  templateUrl: './activate.component.html',
  styleUrl: './activate.component.scss',
  imports: [SharedModule, PasswordRequirementsComponent, RouterLink]
})
export class ActivateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);

  readonly maxLength = PASSWORD_MAX_LENGTH;
  readonly policyMessage = PASSWORD_POLICY_MESSAGE;
  readonly isLoading = signal(false);
  /** Sin token en el enlace, o la API lo rechazó: se muestra el mensaje genérico y no el formulario. */
  readonly linkError = signal<string | null>(null);
  /** Errores de la contraseña que sí manda la API (la política se valida también aquí, pero el servidor manda). */
  readonly passwordError = signal<string | null>(null);
  showPassword = false;
  submitted = false;
  form: FormGroup;
  private token = '';

  constructor(customTitle: CustomTitleService) {
    customTitle.set('Activar cuenta');
    this.form = this.fb.group({
      password: ['', [Validators.required, passwordPolicyValidator]],
      confirmPassword: ['', Validators.required]
    }, { validators: confirmMatches });
  }

  ngOnInit(): void {
    this.token = (this.route.snapshot.queryParamMap.get('token') ?? '').trim();
    // Fuera de la barra de direcciones: el token queda solo en memoria.
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    if (!this.token) {
      this.linkError.set(ACTIVATE_LINK_MESSAGE);
    }
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.dirty || c.touched || this.submitted);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    this.submitted = true;
    this.passwordError.set(null);
    if (this.form.invalid || this.isLoading() || !this.token) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    const { password, confirmPassword } = this.form.getRawValue();
    this.auth.activate({ token: this.token, password, confirmPassword }).subscribe({
      next: (resp) => {
        this.isLoading.set(false);
        if (resp.succeeded) {
          this.token = '';
          this.notifications.showSuccess('Su contraseña quedó guardada. Ingrese con su correo; la primera vez configurará la verificación en dos pasos.', 'Cuenta activada');
          void this.router.navigate(['/sign-in']);
          return;
        }
        this.onFailure(resp.errors);
      },
      error: () => {
        this.isLoading.set(false);
        this.onFailure(null);
      }
    });
  }

  /** Un error de la contraseña se muestra junto al campo; cualquier otro (el token) es el mensaje genérico del enlace. */
  private onFailure(errors: unknown): void {
    const list = Array.isArray(errors) ? (errors as { propertyName?: string; errorMessage?: string }[]) : [];
    const mine = list.find((e) => /^(password|confirmPassword)$/i.test(e?.propertyName ?? '') && e?.errorMessage);
    if (mine) {
      this.passwordError.set(mine.errorMessage as string);
      return;
    }
    this.linkError.set(ACTIVATE_LINK_MESSAGE);
  }
}
