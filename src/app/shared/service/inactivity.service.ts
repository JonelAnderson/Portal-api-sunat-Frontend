import { Injectable } from '@angular/core';
import { AuthService } from 'src/app/public/pages/login/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {

  private inactivityTimeout: any;
  private readonly inactivityDuration = 1800000; // 30 minutos en milisegundos
constructor(private _authService:AuthService){

}
  resetTimer(): void {
    clearTimeout(this.inactivityTimeout);
    this.startTimer();
  }

  private startTimer(): void {
    this.inactivityTimeout = setTimeout(() => {
      // Solo este navegador: la inactividad no cierra las sesiones de los otros dispositivos.
      this._authService.logout('Se cerró la sesión por 30 minutos de inactividad.', false);
    }, this.inactivityDuration);
  }
}
