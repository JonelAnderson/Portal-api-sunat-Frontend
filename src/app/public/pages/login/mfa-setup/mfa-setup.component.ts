import { Component, inject, input, output, signal } from '@angular/core';
import { toDataURL } from 'qrcode';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '@shared/service/notification.service';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { MfaSetupResponse, TokenResponse } from '../models/login.interface';
import { RecoveryCodesComponent } from '@shared/components/reusables/recovery-codes/recovery-codes.component';
import { copyToClipboard } from '@shared/functions/recovery-codes';

/**
 * Asistente de enrolamiento del MFA (Fase 12a): 1) instalar la app, 2) QR / clave,
 * 3) código, 4) códigos de recuperación. Usa el ticket que AuthService guarda en memoria.
 */
@Component({
  selector: 'app-mfa-setup',
  imports: [RecoveryCodesComponent],
  templateUrl: './mfa-setup.component.html',
  styleUrl: './mfa-setup.component.scss'
})
export class MfaSetupComponent {
  protected authService = inject(AuthService);
  private notification = inject(NotificationService);

  /** Usuario que se enrola (solo para el .txt de códigos). */
  readonly userName = input<string | undefined>(undefined);

  /** El usuario terminó y pulsó "Entrar" (la sesión ya quedó guardada). */
  readonly completed = output<TokenResponse>();
  /** El ticket venció o el usuario pulsó "Volver": regresar al login. */
  readonly cancelled = output<string | null>();

  /** Presentación: nombre corto de cada paso del asistente. */
  readonly stepLabels = ['Instalar', 'Escanear', 'Verificar', 'Guardar'];
  readonly step = signal<1 | 2 | 3 | 4>(1);
  readonly loading = signal(false);
  readonly setup = signal<MfaSetupResponse | null>(null);
  readonly qrDataUrl = signal<string | null>(null);
  readonly keyCopied = signal(false);
  readonly code = signal('');
  readonly recoveryCodes = signal<string[]>([]);
  readonly saved = signal(false);

  private tokenData: TokenResponse | null = null;

  goToQr(): void {
    this.step.set(2);
    if (!this.setup()) {
      this.generate();
    }
  }

  /** Pide (o vuelve a pedir) la clave y el URI otpauth y dibuja el QR. */
  generate(): void {
    this.loading.set(true);
    this.qrDataUrl.set(null);
    this.authService.mfaSetup().subscribe({
      next: (resp) => {
        this.loading.set(false);
        if (!resp.succeeded || !resp.data) {
          this.fail(resp.messages);
          return;
        }
        const data = resp.data as MfaSetupResponse;
        this.setup.set(data);
        this.code.set('');
        toDataURL(data.authenticatorUri, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
          .then((url) => this.qrDataUrl.set(url))
          .catch(() => this.qrDataUrl.set(null));
      },
      error: (err) => {
        this.loading.set(false);
        this.fail(err?.message);
      }
    });
  }

  async copyKey(): Promise<void> {
    const key = this.setup()?.sharedKey ?? '';
    const ok = await copyToClipboard(key.replace(/\s+/g, ''));
    this.keyCopied.set(ok);
    if (ok) {
      setTimeout(() => this.keyCopied.set(false), 2500);
    }
  }

  onCodeInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const digits = (el.value ?? '').replace(/\D/g, '').slice(0, 6);
    el.value = digits;
    this.code.set(digits);
    if (digits.length === 6 && !this.loading()) {
      this.confirm();
    }
  }

  confirm(): void {
    const code = this.code();
    if (code.length !== 6 || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.authService.mfaSetupConfirm(code).subscribe({
      next: (resp: BaseResponse) => {
        this.loading.set(false);
        const data = resp.data as TokenResponse | null;
        if (resp.succeeded && data?.token) {
          this.tokenData = data;
          this.recoveryCodes.set(data.recoveryCodes ?? []);
          this.step.set(4);
        } else {
          this.code.set('');
          this.fail(resp.messages);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.code.set('');
        this.fail(err?.message);
      }
    });
  }

  enter(): void {
    if (!this.saved() || !this.tokenData) {
      return;
    }
    this.completed.emit(this.tokenData);
  }

  back(): void {
    this.authService.clearMfa();
    this.cancelled.emit(null);
  }

  private fail(messages: unknown): void {
    const text = Array.isArray(messages) ? messages.join(' ') : String(messages ?? 'No se pudo completar la operación.');
    this.notification.showError(text, 'Verificación en dos pasos');
    if (this.authService.isMfaTicketExpiredMessage(messages)) {
      this.authService.clearMfa();
      this.cancelled.emit(text);
    }
  }
}
