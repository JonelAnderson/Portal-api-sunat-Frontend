// angular import
import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

// bootstrap import
import { NgbDropdownConfig } from '@ng-bootstrap/ng-bootstrap';

// third party
import screenfull from 'screenfull';

// project import
import { SharedModule } from '@shared/shared.module';
import { AuthService } from 'src/app/public/pages/login/services/auth.service';
import { CurrentUserProfileService } from '@shared/service/current-user-profile.service';

/** Lado derecho de la barra superior: pantalla completa y menú del usuario (Mi cuenta, Cerrar sesión). */
@Component({
  selector: 'app-nav-right',
  imports: [SharedModule],
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss'],
  providers: [NgbDropdownConfig]
})
export class NavRightComponent implements OnInit, OnDestroy {
  authenticationService = inject(AuthService);
  private router = inject(Router);
  private profile = inject(CurrentUserProfileService);

  screenFull = true;

  // Nombre y correo de GET portal/auth/me (en memoria; el JWT no lleva datos personales).
  readonly userName = computed(() => this.profile.profile()?.name || this.profile.profile()?.email || 'Mi cuenta');
  readonly userEmail = computed(() => this.profile.profile()?.email ?? '');
  readonly userImage = 'assets/images/user/user-icon.png';

  private readonly onFullscreenChange = () => (this.screenFull = screenfull.isFullscreen);

  ngOnInit() {
    if (screenfull.isEnabled) {
      this.screenFull = screenfull.isFullscreen;
      screenfull.on('change', this.onFullscreenChange);
    }
  }

  ngOnDestroy() {
    if (screenfull.isEnabled) {
      screenfull.off('change', this.onFullscreenChange);
    }
  }

  logout() {
    this.authenticationService.logout();
  }

  /** Mi cuenta: contraseña, verificación en dos pasos y códigos de recuperación. */
  openAccount() {
    void this.router.navigate(['/private/account']);
  }

  toggleFullscreen() {
    if (screenfull.isEnabled) {
      screenfull.toggle().then(() => (this.screenFull = screenfull.isFullscreen));
    }
  }
}
