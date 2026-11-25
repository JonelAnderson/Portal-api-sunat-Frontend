import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment as env } from '@envs/environment';
import { endpoint } from '@shared/apis/endpoint';
import { BaseResponse } from '@shared/models/base-api-response.interface';

export interface ChangePasswordRequest {
  password: string;
  newPassword: string;
  confirmNewPassword: string;
}

/** Mi cuenta: verificación en dos pasos y contraseña de la persona conectada (§5 del contrato del portal). El correo y el nombre no se editan aquí. */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private http = inject(HttpClient);

  /** `data`: `{ enabled, recoveryCodesLeft }`. */
  mfaStatus(): Observable<BaseResponse> {
    return this.http.get<BaseResponse>(`${env.apiUrl}${endpoint.MFA_STATUS}`);
  }

  /** Pide el código actual de la app; `data`: `{ recoveryCodes: [10] }` (los anteriores dejan de servir). */
  regenerateRecoveryCodes(code: string): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.MFA_RECOVERY_CODES}`, { code });
  }

  /** `PUT portal/auth/password`: incrementa session_version, así que todas las sesiones (también esta) quedan cerradas. */
  changePassword(body: ChangePasswordRequest): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.CHANGE_PASSWORD}`, body);
  }
}
